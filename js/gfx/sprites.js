// 픽셀 그림: 오브젝트(파일·백신 알약·바이러스), 사건 문양, 메뉴용 작은 그림(체크·별·자물쇠), 메뉴 커서 모니터.
// 그림은 문자열 배열이다. 글자 하나가 아트 픽셀 한 칸이고 '.'은 빈칸, 나머지 글자는 같은 이름의 _COLORS 색표에서 색을 찾는다.
// 게임 화면(play/board.js)과 메뉴 화면(ui/)이 같은 그림을 쓴다. 그리는 도구는 gfx/pixel.js에 있다.

// ---------- 오브젝트 ----------

// 파일: 오른쪽 위가 접힌 연회색 문서. 가장 많은 오브젝트라 외곽선 없이 조용하게 둔다.
const FILE = [
  'LLLLF..',
  'LLLLFF.',
  'LLLLFFF',
  'LLLLLLL',
  'LTTTTTL',
  'LLLLLLL',
  'LTTTTTL',
  'LLLLLLL',
  'LTTTLLL',
  'LLLLLLL',
];
const FILE_COLORS = { L: '#aeb4be', F: '#7c828d', T: '#6b717b' };

// 백신: 45도로 기울인 초록·흰색 캡슐. 얼굴은 달지 않는다.
const PILL = (() => {
  const ax = 2.5, ay = 9.5, bx = 9.5, by = 2.5, r = 2.4;
  const vx = bx - ax, vy = by - ay;
  const raw = mask(12, 12, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1);
    if (Math.hypot(px - (ax + vx * t), py - (ay + vy * t)) > r) return null;
    return t < 0.5 ? 'W' : 'G';
  });
  const at = (x, y) => !!raw[y] && !!raw[y][x] && raw[y][x] !== '.';
  return outlined(mask(12, 12, (x, y) => {
    const c = raw[y][x];
    if (c === '.') return null;
    if (!at(x - 1, y) || !at(x, y - 1)) return c === 'G' ? 'g' : 'w';
    if (!at(x + 1, y) || !at(x, y + 1)) return c === 'G' ? 'H' : 'V';
    return c;
  }));
})();
const PILL_COLORS = {
  G: '#2fbf71', g: '#8ce6b4', H: '#1e8a50',
  W: '#e9eef0', w: '#ffffff', V: '#a9b4b0',
  k: OUTLINE,
};

// 바이러스: 둥근 몸, 8방향 돌기, 날카로운 눈. phase가 같은 돌기만 1픽셀 길어져 번갈아 꿈틀거린다.
const VIRUS_DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

function makeVirus(phase) {
  const cells = new Map();
  const put = (x, y, c) => cells.set(x + ',' + y, c);
  const c0 = 7;
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 15; x++) {
      const d2 = (x - c0) ** 2 + (y - c0) ** 2;
      if (d2 > 18.5) continue;
      put(x, y, d2 >= 9 && x + y < 12 ? 'b' : d2 >= 9 && x + y > 16 ? 'B' : 'M');
    }
  }
  VIRUS_DIRS.forEach(([ux, uy], i) => {
    const ext = i % 2 === phase ? 1 : 0;
    const diag = ux !== 0 && uy !== 0;
    const start = diag ? 4 : 5;
    for (let d = start; d <= start + ext; d++) put(c0 + ux * d, c0 + uy * d, 'B');
    const k = start + ext + 1;
    const kx = c0 + ux * k, ky = c0 + uy * k;
    // 돌기 끝은 진행 방향에 수직인 3칸 막대
    const [px, py] = diag ? [ux, -uy] : [uy, ux];
    for (const m of [-1, 0, 1]) put(kx + px * m, ky + py * m, 'M');
  });
  for (const [x, y] of [[4, 6], [4, 7], [5, 7], [10, 6], [10, 7], [9, 7]]) put(x, y, 'E');
  return outlined(mask(15, 15, (x, y) => cells.get(x + ',' + y)));
}
const VIRUS = [makeVirus(0), makeVirus(1)];
const VIRUS_COLORS = { M: '#d6336c', b: '#f06a98', B: '#a3204f', E: '#101113', k: OUTLINE };
// 백신 효과 중: 같은 그림에 회색 색 묶음만 바꿔 입힌다.
const VIRUS_POWERED = { M: '#6e737c', b: '#8a909a', B: '#4f535b', E: '#101113', k: OUTLINE };

// ---------- 문양 (글자 대신 사건을 알린다) ----------
// 색은 사건을 일으킨 오브젝트의 색을 쓴다.

const VACCINE_EMBLEM = [ // 초록 원 안의 십자
  '...GGGGG...',
  '.GGdddddGG.',
  '.GddGGGddG.',
  'GdddGGGdddG',
  'GdGGGGGGGdG',
  'GdGGGGGGGdG',
  'GdGGGGGGGdG',
  'GdddGGGdddG',
  '.GddGGGddG.',
  '.GGdddddGG.',
  '...GGGGG...',
];
const DELETE_EMBLEM = [ // 회색 바이러스 위의 초록 금지 사선
  '...GGGGG...',
  '.GGdddddGG.',
  '.GGGdddddG.',
  'GddGGvdvddG',
  'GdddGGvdddG',
  'GddvvGGvddG',
  'GdddvvGGddG',
  'GddvdvdGGdG',
  '.GddddddGG.',
  '.GGdddddGG.',
  '...GGGGG...',
];
const INFECT_EMBLEM = mask(13, 12, (x, y) => { // 자홍 경고 삼각형 안의 바이러스
  if (Math.abs(x - 6) > Math.floor((y + 1) / 2)) return null;
  const v = [
    'x.x.x',
    '.xxx.',
    'xxxxx',
    '.xxx.',
    'x.x.x',
  ][y - 6];
  return v && x >= 4 && x <= 8 && v[x - 4] === 'x' ? 'x' : 'M';
});
const SAVE_EMBLEM = [ // 플로피 저장 아이콘
  'FFSSSSFF.',
  'FFSxSSFFF',
  'FFSxSSFFF',
  'FFSSSSFFF',
  'FFFFFFFFF',
  'FLLLLLLLF',
  'FLLLLLLLF',
  'FLLLLLLLF',
  'FFFFFFFFF',
];
const BUMP_EMBLEM = [ // 짧은 충격선
  '.....Y.....',
  '.Y...Y...Y.',
  '..Y.....Y..',
  '...........',
  '...........',
  'YY.......YY',
  '...........',
  '...........',
  '..Y.....Y..',
  '.Y...Y...Y.',
  '.....Y.....',
];
const CHECK_EMBLEM = [ // 클리어 도장
  '.......AA',
  '......AA.',
  '.....AA..',
  'AA..AA...',
  '.AAAA....',
  '..AA.....',
];

// 사건 문양. normal은 외곽선을 두른 그림, flash는 찍히는 첫 프레임용으로 둘레에 밝은 테두리를 한 겹 더 두른 그림이다.
const EMBLEMS = {};
for (const [kind, rows] of Object.entries({
  vaccine: VACCINE_EMBLEM, delete: DELETE_EMBLEM, infect: INFECT_EMBLEM, save: SAVE_EMBLEM, bump: BUMP_EMBLEM,
})) {
  const normal = outlined(rows);
  EMBLEMS[kind] = { normal, flash: outlined(normal, 'f') };
}
const EMBLEM_COLORS = {
  G: '#2fbf71', d: '#13261c', v: '#8a909a',
  M: '#d6336c', x: '#101113',
  F: '#7c828d', S: '#aeb4be', L: '#e6e9f2',
  Y: '#8b93a6', A: '#ffa53d',
  k: OUTLINE, f: '#f4f6fa',
};

// ---------- 메뉴용 작은 그림 ----------

const CHECK = outlined(CHECK_EMBLEM); // 클리어 표시. 색표는 EMBLEM_COLORS
const STAR = outlined([ // 최단 달성. 라벨 스티커와 같은 크림색
  '...#...',
  '..###..',
  '#######',
  '.#####.',
  '..###..',
  '.##.##.',
  '##...##',
]);
const STAR_COLORS = { '#': '#f3f0e6', k: OUTLINE };
const LOCK = [ // 잠긴 레벨
  '.LLL.',
  'L...L',
  'L...L',
  'LLLLL',
  'LLhLL',
  'LLhLL',
  'LLLLL',
];
const LOCK_COLORS = { L: '#5a606c', h: '#1c1e24' };

// ---------- 메뉴 커서 모니터 (모니터 캐릭터 정본 A안: 정면 박스, 거치대 없음, 19×15) ----------
// 정본: 디자인/에셋/모니터_캐릭터/build.mjs. 게임 화면의 컴퓨터는 아직 예전 그림이다(play/board.js).
// 표정은 기본 UwU와 실패 X( 둘뿐이다. 얼굴은 누른 방향으로 1칸 움직인다.

const MON_COLORS = {
  K: '#0c0d10', B: '#d8cfb8', L: '#efe8d6', S: '#b5ac96',
  Z: '#101113', z: '#17191c', g: '#3a3e46', A: '#ffa53d',
  G: '#2fbf71', o: '#1d4a32', t: '#2c2d32',
  R: '#ff3b3b', r: '#6e1a1f',
};
const FACE_GLYPH = {
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  w: ['.....', '.....', '#...#', '#.#.#', '.#.#.'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  '(': ['.#', '#.', '#.', '#.', '.#'],
};
const faceRows = text => [0, 1, 2, 3, 4].map(y => [...text].map(ch => FACE_GLYPH[ch][y]).join('.'));

const monitors = new Map();
// o: face 'UwU'|'X(', color 얼굴 색 글자, dx·dy 얼굴 치우침, ring 화면 테두리 색 글자, squash 'h'|'v' 충돌 프레임
function monitor({ face = 'UwU', color = 'A', dx = 0, dy = 0, ring = '', squash = '' } = {}) {
  const key = [face, color, dx, dy, ring, squash].join('|');
  if (monitors.has(key)) return monitors.get(key);
  let ws = 15, hs = 9;
  if (squash === 'h') { ws = 13; hs = 10; }
  if (squash === 'v') { ws = 17; hs = 7; }
  const W = ws + 4;
  const H = hs + 6;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const rect = (x, y, w, h, c) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < W) g[j][i] = c;
  };
  rect(1, 0, W - 2, H, 'K');
  rect(0, 1, W, H - 2, 'K');
  rect(1, 1, W - 2, H - 2, 'B');
  rect(1, 1, W - 2, 1, 'L');
  rect(1, 1, 1, H - 2, 'L');
  rect(W - 2, 2, 1, H - 3, 'S');
  rect(2, H - 2, W - 3, 1, 'S');
  const sx = 2, sy = 2;
  if (ring) rect(sx - 1, sy - 1, ws + 2, hs + 2, ring);
  for (let y = 0; y < hs; y++) rect(sx, sy + y, ws, 1, y % 2 ? 'z' : 'Z');
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const x = fx ? sx + ws - 1 : sx;
    const y = fy ? sy + hs - 1 : sy;
    g[y][x] = g[fy ? y + 1 : y - 1][x];
  }
  for (const [x, y] of [[1, 0], [2, 0], [0, 1]]) g[sy + y][sx + x] = 'g';
  const cy = H - 3;
  rect(sx, cy, ws - 8, 1, 't');
  for (let i = 0; i < 4; i++) rect(sx + ws - 7 + i * 2, cy, 1, 1, 'o');
  const rows = faceRows(face);
  const fx = sx + clamp(Math.floor((ws - rows[0].length) / 2) + dx, 0, ws - rows[0].length);
  const fy = sy + clamp(Math.floor((hs - 5) / 2) + dy, 0, hs - 5);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g[fy + y][fx + x] = color; }));
  const out = { rows: g.map(r => r.join('')), W, H };
  monitors.set(key, out);
  return out;
}

