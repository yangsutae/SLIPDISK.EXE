// 레벨 후보 만들기: node tools/gen-levels.js <단계 번호> [C=1] [M=2] [o=2-3] [walls=3-6] [tries=5000] [seed=1]
//   C·M·o·walls  놓을 백신·바이러스·파일·벽 수. a-b는 범위이고 이 범위가 군더더기를 지운 뒤 남아야 할 수다
//   tries·seed   시도 수와 난수 씨앗. 씨앗이 같으면 같은 후보가 나온다
// 단계의 격자와 최단 해법 범위는 data/stages.js 목차의 grid·moves를 쓴다.
// 무작위로 놓은 맵 가운데 범위 안에서 최단 해법이 하나뿐인 맵을 고르고, 지워도 최단 해법이 그대로인 벽·백신·파일을
// 하나씩 지운 뒤 tools/check-levels.js의 검사를 모두 통과한 맵만 한 줄에 하나씩 JSON으로 낸다.
// 좌우·상하 뒤집기와 180도 돌리기로 겹치는 맵은 하나만 낸다. 고른 후보는 data/levels/에 레벨 파일로 옮긴다.
const { STAGES, analyze, looseParts, checkLevel } = require('./check-levels.js');

const [stageNo, ...opts] = process.argv.slice(2);
const stage = STAGES.find(st => st.no === Number(stageNo));
if (!stage) {
  console.error('단계 번호를 적는다. 예: node tools/gen-levels.js 2 C=1 M=2');
  process.exit(1);
}
const arg = Object.fromEntries(opts.map(o => o.split('=')));
const range = v => {
  const [a, b = a] = v.split('-').map(Number);
  return [a, b];
};
const want = {
  C: range(arg.C ?? '1'),
  M: range(arg.M ?? '2'),
  o: range(arg.o ?? '2-3'),
  '#': range(arg.walls ?? '3-6'),
};
const tries = Number(arg.tries ?? 5000);
let seed = Number(arg.seed ?? 1) >>> 0;
const [w, h] = stage.grid;
const [lo, hi] = stage.moves;

// mulberry32
function rand() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = ([a, b]) => a + Math.floor(rand() * (b - a + 1));

// 처음 놓는 수: 백신·바이러스·파일은 범위의 최대, 벽은 지워질 몫으로 2개 더
function randomMap() {
  const cells = Array.from({ length: w * h }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const grid = Array(w * h).fill('.');
  const put = (ch, n) => { for (let k = 0; k < n; k++) grid[cells.pop()] = ch; };
  put('P', 1);
  put('C', want.C[1]);
  put('M', want.M[1]);
  put('o', want.o[1]);
  put('#', pick([want['#'][0], want['#'][1] + 2]));
  return Array.from({ length: h }, (_, y) => grid.slice(y * w, y * w + w).join(''));
}

const clearCell = (map, x, y) => map.map((r, yy) => (yy === y ? r.slice(0, x) + '.' + r.slice(x + 1) : r));
const countOf = (map, ch) => map.join('').split(ch).length - 1;
const canonical = map => {
  const flipX = map.map(r => [...r].reverse().join(''));
  return [map, flipX, [...map].reverse(), [...flipX].reverse()].map(m => m.join('/')).sort()[0];
};

const seen = new Set();
let found = 0;
for (let t = 0; t < tries; t++) {
  let lv = { id: 'X', name: 'CANDIDATE', map: randomMap() };
  const a = analyze(lv, hi);
  if (!a.solution || a.count > 1 || a.moves < lo) continue;
  // 군더더기를 하나씩 지운다. 지운 것은 최단 해법을 바꾸지 않으므로 a를 그대로 쓴다
  for (;;) {
    const p = looseParts(lv, a).find(q => q.loose);
    if (!p) break;
    lv = { ...lv, map: clearCell(lv.map, p.x, p.y) };
  }
  if (Object.entries(want).some(([ch, [min, max]]) => countOf(lv.map, ch) < min || countOf(lv.map, ch) > max)) continue;
  const key = canonical(lv.map);
  if (seen.has(key)) continue;
  const r = checkLevel(lv, stage);
  if (r.errors.length) continue;
  seen.add(key);
  found++;
  const counts = Object.fromEntries(Object.keys(want).map(ch => [ch, countOf(lv.map, ch)]));
  console.log(JSON.stringify({ moves: r.moves, states: r.states, solution: r.solution, counts, doses: r.doses.map(d => d.eats), map: lv.map }));
}
console.error(`${stage.no}단계 ${tries}번 시도, 후보 ${found}개`);
