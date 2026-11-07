// 레벨 검사: node tools/check-levels.js
// data/stages.js 목차와 data/levels/의 레벨 파일을 맞춰 보고(목차에 있는데 파일 없음, 파일이 있는데 목차에 없음,
// 파일 이름과 id 다름, 목차 중복), 목차 순서대로 각 레벨을 js/core/rules.js 규칙으로 돌려 레벨 디자인 문서의 검증 기준을 본다.
//   형식과 영문 이름, 단계 격자 크기, 단계 해법 범위, 최단 해법이 하나뿐인지, 최단 해법의 제자리 충돌, 4면 외곽 경유,
//   백신 타이밍(백신 효과 하나 이상에서 마지막 처치가 백신 뒤 3~4번째 이동),
//   군더더기(벽·백신은 하나씩 지워도 최단 해법이 그대로면 실패, 파일은 지우면 최단 해법이 바뀌는 것이 하나 이상)
// 기믹 우회와 고립 구간은 자동으로 보지 않는다. 레벨 디자인 문서 기준으로 따로 확인한다.
// tools/gen-levels.js가 이 파일의 analyze·looseParts·checkLevel을 함께 쓴다.
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
const { STAGES, SUPER_MOVES, validateLevel, parseLevel, step } =
  vm.runInContext('({ STAGES, SUPER_MOVES, validateLevel, parseLevel, step })', context);

const sig = s => `${s.player.x},${s.player.y}|${[...s.items.keys()].sort().join(';')}|${s.super}`;

// 최단 해법 탐색. rules.js의 solve와 같은 너비 우선 탐색에 같은 깊이에서 같은 상태로 오는 길 수를 더해
// 최단 해법 수(count)와 살핀 상태 수(states)도 센다. solution은 solve가 돌려주는 것과 같은 최단 해법이다.
function analyze(lv, maxDepth = 20) {
  const start = parseLevel(lv);
  const seen = new Set([sig(start)]);
  let frontier = [{ s: start, n: 1, path: '' }];
  let states = 1;
  for (let d = 1; d <= maxDepth && frontier.length; d++) {
    const next = new Map();
    let count = 0;
    let solution = null;
    for (const { s, n, path: p } of frontier) {
      for (const dir of 'UDLR') {
        const r = step(s, dir).state;
        if (r.status === 'clear') {
          count += n;
          solution ??= p + dir;
          continue;
        }
        if (r.status === 'dead') continue;
        const k = sig(r);
        const hit = next.get(k);
        if (hit) hit.n += n;
        else if (!seen.has(k)) {
          seen.add(k);
          next.set(k, { s: r, n, path: p + dir });
          states++;
        }
      }
    }
    if (count) return { moves: d, count, solution, states };
    frontier = [...next.values()];
  }
  return { moves: null, count: 0, solution: null, states };
}

// 벽·백신·파일을 하나씩 지워 본다. loose는 지워도 최단 해법이 그대로(하나뿐이고 같은 입력)라는 뜻이다
function looseParts(lv, a) {
  const parts = [];
  lv.map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!'#Co'.includes(ch)) return;
    const map = lv.map.map((r, yy) => (yy === y ? r.slice(0, x) + '.' + r.slice(x + 1) : r));
    const b = analyze({ ...lv, map }, a.moves);
    parts.push({ ch, x, y, loose: b.count === 1 && b.solution === a.solution });
  }));
  return parts;
}

// 레벨 하나를 검사한다. stage는 목차의 단계 { grid: [w, h], moves: [최소, 최대] }
// 돌려주는 값 { errors, moves, solution, states, doses }. doses는 백신 효과마다 처치한 이동 번째(백신을 먹은 이동이 0)
function checkLevel(lv, stage) {
  const errors = validateLevel(lv);
  if (!NAME.test(lv.name ?? '')) errors.push('name은 대문자·숫자·공백과 픽셀 글꼴 문장부호로 10자 이내');
  if (errors.length) return { errors };

  const start = parseLevel(lv);
  const [gw, gh] = stage.grid;
  if (start.w !== gw || start.h !== gh) errors.push(`격자 ${start.w}×${start.h}가 단계 격자 ${gw}×${gh}와 다름`);
  const a = analyze(lv);
  if (!a.solution) return { errors: [...errors, '20회 안에 해법 없음'], states: a.states };
  const [lo, hi] = stage.moves;
  if (a.moves < lo || a.moves > Math.min(hi, MAX_MOVES)) errors.push(`최단 ${a.moves}회가 단계 범위 ${lo}~${hi}회 밖`);
  if (a.count > 1) errors.push(`최단 해법 ${a.count}개`);

  // 최단 해법을 따라가며 제자리 충돌, 외곽 경유, 백신 효과별 처치를 본다
  let s = start;
  let bump = false;
  const edges = new Set();
  const doses = [];
  [...a.solution].forEach((dir, i) => {
    const r = step(s, dir);
    if (r.path.length === 0) bump = true;
    for (const p of r.path) {
      if (p.y === 0) edges.add('위');
      if (p.y === s.h - 1) edges.add('아래');
      if (p.x === 0) edges.add('왼쪽');
      if (p.x === s.w - 1) edges.add('오른쪽');
    }
    for (const e of r.events) {
      if (e.type === 'vaccine') doses.push({ at: i, eats: [] });
      if (e.type === 'eat') doses.at(-1).eats.push(i - doses.at(-1).at);
    }
    s = r.state;
  });
  if (bump) errors.push('최단 해법에 제자리 충돌');
  if (edges.size < 4) errors.push(`외곽 경유 ${[...edges].join('·') || '없음'}`);
  if (doses.length && !doses.some(d => d.eats.length && Math.max(...d.eats) >= SUPER_MOVES - 1)) {
    errors.push('마지막 처치가 백신 뒤 3~4번째 이동인 효과 없음');
  }

  const parts = looseParts(lv, a);
  const loose = parts.filter(p => p.ch !== 'o' && p.loose).map(p => `${p.ch}(${p.x},${p.y})`);
  if (loose.length) errors.push(`군더더기 ${loose.join(' ')}`);
  const files = parts.filter(p => p.ch === 'o');
  if (files.length && files.every(p => p.loose)) errors.push('지우면 최단 해법이 바뀌는 파일 없음');

  return { errors, moves: a.moves, solution: a.solution, states: a.states, doses };
}

function main() {
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
    if (st.grid?.length !== 2 || st.moves?.length !== 2) fileErrors.push(`목차: ${st.no}단계 grid·moves 없음`);
  }

  const ids = new Set();
  let failed = fileErrors.length;
  let count = 0;
  for (const err of fileErrors) console.log(`FAIL ${err}`);

  for (const st of STAGES) for (const id of st.levels) {
    count++;
    const lv = defs.get(id) ?? { id };
    const r = defs.has(id) ? checkLevel(lv, st) : { errors: ['파일 없음 또는 읽기 오류'] };
    if (ids.has(id)) r.errors.push('목차에 두 번 있음');
    ids.add(id);
    if (r.errors.length) failed++;
    const moves = r.solution ? `${r.moves}회 ${r.solution} | 탐색 ${r.states}` : '-';
    console.log(`${r.errors.length ? 'FAIL' : 'ok  '} ${lv.id} ${lv.name} (${lv.ko}) | ${moves}${r.errors.length ? ' | ' + r.errors.join(', ') : ''}`);
  }

  console.log(`\n목차 레벨 ${count}개, 실패 ${failed}건`);
  process.exitCode = failed ? 1 : 0;
}

module.exports = { STAGES, parseLevel, analyze, looseParts, checkLevel };
if (require.main === module) main();
