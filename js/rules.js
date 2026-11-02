// 게임 규칙: 맵 해석, 한 번 이동(step), 최단 해법 탐색(solve), 레벨 형식 검사.
// DOM을 쓰지 않아 브라우저와 tools/check-levels.js(Node)에서 함께 쓴다.

const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const SUPER_MOVES = 4;
const ITEM_CHARS = { o: 'file', C: 'vaccine', M: 'virus' };

const key = (x, y) => x + ',' + y;

const LEVEL_CHARS = new Set(['.', '#', 'P', ...Object.keys(ITEM_CHARS)]);

// 형식 오류 목록을 돌려준다. 빈 배열이면 플레이할 수 있는 레벨이다.
function validateLevel(lv) {
  const errors = [];
  if (!lv.id || !lv.name) errors.push('id 또는 name 없음');
  const rows = Array.isArray(lv.map) ? lv.map : [];
  if (rows.length === 0 || !rows[0]) return [...errors, 'map 없음'];
  if (rows.some(row => row.length !== rows[0].length)) errors.push('행 길이가 서로 다름');
  const cells = [...rows.join('')];
  const unknown = [...new Set(cells)].filter(ch => !LEVEL_CHARS.has(ch));
  if (unknown.length) errors.push(`알 수 없는 기호 ${unknown.join(' ')}`);
  const players = cells.filter(ch => ch === 'P').length;
  if (players !== 1) errors.push(`P가 ${players}개`);
  return errors;
}

function parseLevel(lv) {
  const walls = new Set();
  const items = new Map();
  let player = null;
  lv.map.forEach((line, y) => [...line].forEach((ch, x) => {
    if (ch === '#') walls.add(key(x, y));
    else if (ch === 'P') player = { x, y };
    else if (ch in ITEM_CHARS) items.set(key(x, y), ITEM_CHARS[ch]);
  }));
  const w = lv.map[0].length;
  const h = lv.map.length;
  let totalFiles = 0;
  for (const v of items.values()) if (v === 'file') totalFiles++;
  return { w, h, walls, items, player, super: 0, status: 'play', totalFiles };
}

function remaining(items) {
  let files = 0, viruses = 0;
  for (const v of items.values()) {
    if (v === 'file') files++;
    else if (v === 'virus') viruses++;
  }
  return { files, viruses };
}

function isWall(s, x, y) {
  return x < 0 || y < 0 || x >= s.w || y >= s.h || s.walls.has(key(x, y));
}

function step(s, dir) {
  const [dx, dy] = DIRS[dir];
  const items = new Map(s.items);
  let powered = s.super > 0;
  let superLeft = Math.max(0, s.super - 1);
  let { x, y } = s.player;
  let status = 'play';
  const path = [];
  const events = [];

  while (status === 'play' && !isWall(s, x + dx, y + dy)) {
    x += dx; y += dy;
    path.push({ x, y });
    const at = path.length;
    const k = key(x, y);
    const item = items.get(k);
    if (item === 'file') {
      items.delete(k);
      events.push({ type: 'file', x, y, at });
    } else if (item === 'vaccine') {
      items.delete(k);
      powered = true;
      superLeft = SUPER_MOVES;
      events.push({ type: 'vaccine', x, y, at });
    } else if (item === 'virus') {
      if (powered) {
        items.delete(k);
        events.push({ type: 'eat', x, y, at });
      } else {
        status = 'dead';
        events.push({ type: 'die', x, y, at });
      }
    }
  }
  if (path.length === 0) events.push({ type: 'bump', x, y, at: 0 });

  const left = remaining(items);
  if (status === 'play' && left.files === 0 && left.viruses === 0) {
    status = 'clear';
    events.push({ type: 'clear', x, y, at: path.length });
  }
  return { state: { ...s, items, player: { x, y }, super: superLeft, status }, events, path };
}

function solve(lv, maxDepth = 20) {
  const sig = s => `${key(s.player.x, s.player.y)}|${[...s.items.keys()].sort().join(';')}|${s.super}`;
  const start = parseLevel(lv);
  const seen = new Set([sig(start)]);
  let frontier = [{ s: start, path: '' }];
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const dir of Object.keys(DIRS)) {
        const r = step(s, dir).state;
        if (r.status === 'clear') return path + dir;
        if (r.status === 'dead') continue;
        const k = sig(r);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ s: r, path: path + dir });
      }
    }
    frontier = next;
  }
  return null;
}
