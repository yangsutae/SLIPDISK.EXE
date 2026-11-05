// 레벨 검사: node tools/check-levels.js
// data/stages.js 목차와 data/levels/의 레벨 파일을 맞춰 보고(목차에 있는데 파일 없음, 파일이 있는데 목차에 없음,
// 파일 이름과 id 다름, 목차 중복), 목차 순서대로 각 레벨을 js/core/rules.js 규칙으로 돌려 형식, 영문 이름, 해법,
// 레벨 디자인 문서의 자동 확인 기준을 본다.
// 유일 최단 해법, 기믹 우회, 잉여 요소는 자동으로 보지 않는다. 레벨 디자인 문서 기준으로 따로 확인한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const MAX_MOVES = 16; // 레벨 디자인 문서의 암산 부하 상한
const NAME = /^[A-Z0-9 .,:!?\-+/'()]{1,10}$/; // 픽셀 글꼴에 있는 글자, 스테이지 칸·탭 머리글에 들어가는 길이
const ROOT = path.join(__dirname, '..');
const LEVEL_DIR = path.join(ROOT, 'data', 'levels');

const context = vm.createContext({});
for (const file of ['data/stages.js', 'js/core/rules.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
}
const { STAGES, validateLevel, parseLevel, step, solve } =
  vm.runInContext('({ STAGES, validateLevel, parseLevel, step, solve })', context);

// 레벨 파일마다 defineLevel이 넘긴 정의를 파일 이름(id)으로 모은다
const defs = new Map();
const fileErrors = [];
for (const file of fs.readdirSync(LEVEL_DIR).filter(f => f.endsWith('.js'))) {
  const id = file.slice(0, -3);
  const got = [];
  context.defineLevel = lv => got.push(lv);
  try {
    vm.runInContext(fs.readFileSync(path.join(LEVEL_DIR, file), 'utf8'), context, { filename: file });
  } catch (e) {
    fileErrors.push(`${file}: 읽기 오류 ${e.message}`);
    continue;
  }
  if (got.length !== 1) fileErrors.push(`${file}: defineLevel ${got.length}번`);
  else if (got[0].id !== id) fileErrors.push(`${file}: id '${got[0].id}'가 파일 이름과 다름`);
  else defs.set(id, got[0]);
}

const listed = STAGES.flatMap(st => st.levels);
for (const id of defs.keys()) if (!listed.includes(id)) fileErrors.push(`${id}.js: 목차(data/stages.js)에 없음`);
const nos = new Set();
for (const st of STAGES) {
  if (nos.has(st.no)) fileErrors.push(`목차: 단계 번호 ${st.no} 중복`);
  nos.add(st.no);
  if (!NAME.test(st.name ?? '')) fileErrors.push(`목차: ${st.no}단계 name은 대문자·숫자·공백과 픽셀 글꼴 문장부호로 10자 이내`);
}

const ids = new Set();
let failed = fileErrors.length;
let count = 0;
for (const err of fileErrors) console.log(`FAIL ${err}`);

for (const st of STAGES) for (const id of st.levels) {
  count++;
  const lv = defs.get(id) ?? { id };
  const errors = defs.has(id) ? validateLevel(lv) : ['파일 없음 또는 읽기 오류'];
  if (ids.has(id)) errors.push('목차에 두 번 있음');
  ids.add(id);
  if (defs.has(id) && !NAME.test(lv.name ?? '')) errors.push('name은 대문자·숫자·공백과 픽셀 글꼴 문장부호로 10자 이내');

  const solution = errors.length ? null : solve(lv);
  if (!errors.length && !solution) errors.push('20회 안에 해법 없음');

  if (solution) {
    if (solution.length > MAX_MOVES) errors.push(`최단 ${solution.length}회 > ${MAX_MOVES}회`);
    let s = parseLevel(lv);
    const edges = new Set();
    for (const dir of solution) {
      const r = step(s, dir);
      if (r.path.length === 0) errors.push('최단 해법에 제자리 충돌');
      for (const p of r.path) {
        if (p.y === 0) edges.add('위');
        if (p.y === s.h - 1) edges.add('아래');
        if (p.x === 0) edges.add('왼쪽');
        if (p.x === s.w - 1) edges.add('오른쪽');
      }
      s = r.state;
    }
    if (edges.size < 4) errors.push(`외곽 경유 ${[...edges].join('·') || '없음'}`);
  }

  if (errors.length) failed++;
  const moves = solution ? `${solution.length}회 ${solution}` : '-';
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${lv.id} ${lv.name} (${lv.ko}) | ${moves}${errors.length ? ' | ' + errors.join(', ') : ''}`);
}

console.log(`\n목차 레벨 ${count}개, 실패 ${failed}건`);
process.exitCode = failed ? 1 : 0;
