// 픽셀 그림 도구: 비트맵, 5×7 글꼴과 큰 글꼴, 면·메뉴 홈·패널·딱지, 외곽 벽. 게임 화면(play/board.js)과 메뉴 화면(ui/)이 함께 쓴다.
// 크기 변형·회전·흐림을 쓰지 않는다(README의 픽셀 렌더 규칙). 한 화면 안의 픽셀 크기는 하나다.
// 그림 자체(오브젝트·문양·모니터)는 gfx/sprites.js에 있다.

const OUTLINE = '#0c0d10';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- 비트맵 도구 ----------
// 비트맵은 문자열 배열이다. '.'은 빈칸이고 나머지 글자는 색표에서 색을 찾는다.

function mask(w, h, fn) {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => fn(x, y) || '.').join(''));
}

// 그림에 상하좌우로 맞닿은 빈칸을 ch로 칠해 1픽셀 외곽선을 두른다. 둘레로 1씩 커진다.
function outlined(rows, ch = 'k') {
  const h = rows.length;
  const w = rows[0].length;
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.';
  return mask(w + 2, h + 2, (x, y) => {
    if (at(x - 1, y - 1)) return rows[y - 1][x - 1];
    return at(x - 2, y - 1) || at(x, y - 1) || at(x - 1, y - 2) || at(x - 1, y) ? ch : null;
  });
}

// 같은 그림·색표는 한 번만 아트 픽셀 1칸 = 1px인 오프스크린 캔버스로 굽고 drawImage로 찍는다.
// s는 아트 픽셀 한 칸의 화면 크기다. 찍는 캔버스는 imageSmoothingEnabled = false여야 키워도 흐려지지 않는다.
const baked = new Map();
function bake(rows, colors) {
  let byColors = baked.get(rows);
  if (!byColors) baked.set(rows, (byColors = new Map()));
  let c = byColors.get(colors);
  if (!c) {
    c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!colors[ch]) return;
      g.fillStyle = colors[ch];
      g.fillRect(x, y, 1, 1);
    }));
    byColors.set(colors, c);
  }
  return c;
}
function drawBitmap(g, rows, colors, x, y, s = 1) {
  const c = bake(rows, colors);
  g.drawImage(c, Math.round(x), Math.round(y), c.width * s, c.height * s);
}

// ---------- 글꼴: 대문자 5×7. 큰 제목은 Scale2x, 로고는 Scale3x로 키운 그림이다 ----------
// 키운 글꼴도 아트 픽셀 1칸 단위로 그리므로 대각선은 1칸 계단으로 다듬어진다.
// 원래 알고리즘은 볼록한 모서리를 깎아 D가 O처럼 읽히므로, 켜진 칸은 그대로 두고 빈칸만 채우는 쪽으로 바꿔 쓴다.

const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '\\': ['#....', '#....', '.#...', '..#..', '...#.', '....#', '....#'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
  '×': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
  '★': ['..#..', '..#..', '#####', '.###.', '..#..', '.#.#.', '#...#'],
  '›': ['.....', '.#...', '..#..', '...#.', '..#..', '.#...', '.....'],
  '◀': ['....#', '...##', '..###', '.####', '..###', '...##', '....#'],
  '▶': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
  '←': ['.....', '..#..', '.#...', '#####', '.#...', '..#..', '.....'],
  '→': ['.....', '..#..', '...#.', '#####', '...#.', '..#..', '.....'],
  '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '.....'],
  '↓': ['.....', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
};

function scale2x(rows) {
  const h = rows.length, w = rows[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x]);
  const out = Array.from({ length: h * 2 }, () => Array(w * 2));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      if (P === '#') {
        out[2 * y][2 * x] = out[2 * y][2 * x + 1] = out[2 * y + 1][2 * x] = out[2 * y + 1][2 * x + 1] = '#';
        continue;
      }
      out[2 * y][2 * x] = C === A && C !== D && A !== B ? A : P;
      out[2 * y][2 * x + 1] = A === B && A !== C && B !== D ? B : P;
      out[2 * y + 1][2 * x] = D === C && D !== B && C !== A ? C : P;
      out[2 * y + 1][2 * x + 1] = B === D && B !== A && D !== C ? D : P;
    }
  }
  return out.map(r => r.join(''));
}

function scale3x(rows) {
  const h = rows.length, w = rows[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x]);
  const out = Array.from({ length: h * 3 }, () => Array(w * 3));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const A = at(x - 1, y - 1), B = at(x, y - 1), C = at(x + 1, y - 1);
      const D = at(x - 1, y), E = at(x, y), F = at(x + 1, y);
      const G = at(x - 1, y + 1), H = at(x, y + 1), I = at(x + 1, y + 1);
      let e = [E, E, E, E, E, E, E, E, E];
      if (E !== '#' && B !== H && D !== F) {
        e = [
          D === B ? D : E,
          (D === B && E !== C) || (B === F && E !== A) ? B : E,
          B === F ? F : E,
          (D === B && E !== G) || (D === H && E !== A) ? D : E,
          E,
          (B === F && E !== I) || (H === F && E !== C) ? F : E,
          D === H ? D : E,
          (D === H && E !== I) || (H === F && E !== G) ? H : E,
          H === F ? F : E,
        ];
      }
      e.forEach((v, i) => { out[3 * y + Math.floor(i / 3)][3 * x + (i % 3)] = v; });
    }
  }
  return out.map(r => r.join(''));
}

const FONT = { h: 7, adv: 6, glyph: ch => GLYPHS[ch] || GLYPHS['?'] };
const BIG = { h: 14, adv: 12, cache: {}, glyph(ch) { return (this.cache[ch] ||= scale2x(FONT.glyph(ch))); } };
const LOGO = { h: 21, adv: 17, cache: {}, glyph(ch) { return (this.cache[ch] ||= scale3x(FONT.glyph(ch))); } };

const measure = (str, font = FONT) => (str.length ? str.length * font.adv - (font.adv - font.glyph('A')[0].length) : 0);

const texts = new Map();
function textCanvas(str, color, font) {
  const key = `${font.adv}|${color}|${str}`;
  let c = texts.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.max(1, measure(str, font));
    c.height = font.h;
    const g = c.getContext('2d');
    g.fillStyle = color;
    [...str].forEach((ch, i) => {
      font.glyph(ch).forEach((row, y) => [...row].forEach((v, x) => {
        if (v === '#') g.fillRect(i * font.adv + x, y, 1, 1);
      }));
    });
    texts.set(key, c);
  }
  return c;
}
const drawText = (g, str, x, y, color, font = FONT) => {
  if (str) g.drawImage(textCanvas(str, color, font), Math.round(x), Math.round(y));
};
const drawTextCenter = (g, str, cx, y, color, font = FONT) => drawText(g, str, cx - Math.floor(measure(str, font) / 2), y, color, font);
const drawTextRight = (g, str, rx, y, color, font = FONT) => drawText(g, str, rx - measure(str, font), y, color, font);

// ---------- 면 그리기 ----------

const fill = (g, x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};

// 모서리 1칸을 깎은 테두리 상자. edges: [위, 왼쪽, 아래, 오른쪽] 색
function box(g, x, y, w, h, base, edges) {
  fill(g, x + 1, y + 1, w - 2, h - 2, base);
  const [t, l, b, r] = edges;
  fill(g, x + 1, y, w - 2, 1, t);
  fill(g, x, y + 1, 1, h - 2, l);
  fill(g, x + 1, y + h - 1, w - 2, 1, b);
  fill(g, x + w - 1, y + 1, 1, h - 2, r);
}

// 메뉴 항목: 입력바 RUN 버튼과 같은 오목 플라스틱 홈. 고른 항목은 셔터 은색 테두리.
const WELL = {
  normal: { base: '#2b2e37', shade: '#22252d', edges: ['#1b1d24', '#1b1d24', '#4d525f', '#4d525f'], text: '#8b93a6' },
  sel: { base: '#373b46', shade: '#2e323c', edges: ['#b9bec5', '#b9bec5', '#b9bec5', '#b9bec5'], text: '#f2f4f8' },
  press: { base: '#24272f', shade: '#1c1e25', edges: ['#b9bec5', '#b9bec5', '#b9bec5', '#b9bec5'], text: '#c4c9d4' },
  off: { base: '#26282f', shade: '#202228', edges: ['#1b1d24', '#1b1d24', '#3a3e48', '#3a3e48'], text: '#535864' },
};
function well(g, x, y, w, h, st = 'normal') {
  const s = WELL[st];
  box(g, x, y, w, h, s.base, s.edges);
  // 안쪽 위·왼쪽 그늘 (오목하게 파인 느낌)
  fill(g, x + 1, y + 1, w - 2, 1, s.shade);
  fill(g, x + 1, y + 2, 1, h - 3, s.shade);
  if (st === 'press') fill(g, x + 2, y + 2, w - 3, 1, s.shade);
}

// 패널: 입력바·상단바와 같은 매트 플라스틱 몸체 (모서리 2칸 깎음)
function panel(g, x, y, w, h) {
  fill(g, x + 2, y, w - 4, h, '#0e1015');
  fill(g, x, y + 2, w, h - 4, '#0e1015');
  fill(g, x + 1, y + 1, w - 2, h - 2, '#0e1015');
  fill(g, x + 2, y + 1, w - 4, h - 2, '#30343c');
  fill(g, x + 1, y + 2, w - 2, h - 4, '#30343c');
  fill(g, x + 2, y + 1, w - 4, 1, '#4a4f5a');
  fill(g, x + 2, y + h - 2, w - 4, 1, '#23262d');
}

// 라벨 스티커와 같은 크림색 종이 딱지
function badge(g, str, x, y) {
  const w = measure(str) + 8;
  box(g, x, y, w, 11, '#f3f0e6', [OUTLINE, OUTLINE, OUTLINE, OUTLINE]);
  fill(g, x + 1, y + 1, w - 2, 1, '#ffffff');
  drawText(g, str, x + 4, y + 2, '#181a1f');
  return w;
}

// 창 안 화면 둘레의 외곽 벽. 상·하 두께 ty, 좌·우 두께 tx, 경사면 두께 b(= 아트 픽셀 1칸).
// 바깥쪽은 좌·상단이 밝고 우·하단이 어둡다. 플레이 영역과 맞닿는 안쪽은 상·좌측이 어두운 턱, 하·우측이 밝은 턱이다.
function outerWall(g, W, H, tx, ty, b) {
  const body = '#555960', light = '#777c86', dark = '#363940';
  fill(g, 0, 0, W, ty, body);
  fill(g, 0, H - ty, W, ty, body);
  fill(g, 0, ty, tx, H - ty * 2, body);
  fill(g, W - tx, ty, tx, H - ty * 2, body);
  fill(g, 0, 0, W, b, light);
  fill(g, 0, 0, b, H, light);
  fill(g, 0, H - b, W, b, dark);
  fill(g, W - b, 0, b, H, dark);
  fill(g, tx - b, ty - b, W - (tx - b) * 2, b, dark);
  fill(g, tx - b, ty - b, b, H - (ty - b) * 2, dark);
  fill(g, tx, H - ty, W - tx * 2, b, light);
  fill(g, W - tx, ty, b, H - ty * 2, light);
}
