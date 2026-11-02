// 레벨 검사: node tools/check-levels.js
// js/levels.js의 모든 레벨을 js/rules.js 규칙으로 돌려 형식, 해법, 레벨 디자인 문서의 자동 확인 기준을 본다.
// 유일 최단 해법, 기믹 우회, 잉여 요소는 자동으로 보지 않는다. 레벨 디자인 문서 기준으로 따로 확인한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const MAX_MOVES = 16; // 레벨 디자인 문서의 암산 부하 상한

const context = vm.createContext({});
for (const file of ['js/levels.js', 'js/rules.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
}
const { LEVELS, validateLevel, parseLevel, step, solve } =
  vm.runInContext('({ LEVELS, validateLevel, parseLevel, step, solve })', context);

const ids = new Set();
let failed = 0;

for (const lv of LEVELS) {
  const errors = validateLevel(lv);
  if (ids.has(lv.id)) errors.push('id 중복');
  ids.add(lv.id);

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
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${lv.id} ${lv.name} | ${moves}${errors.length ? ' | ' + errors.join(', ') : ''}`);
}

console.log(`\n${LEVELS.length}개 중 ${failed}개 실패`);
process.exitCode = failed ? 1 : 0;
