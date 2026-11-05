// 메뉴 화면 틀(canvas#screen): 장면(scene), 메뉴 항목, 커서 모니터, 알림 띠, 화면 배치 도구, 화면 목록 SCREENS.
// 아트 픽셀 416×233을 캔버스 1px로 그리고 CSS로 2배 키운다(README의 메뉴 화면 픽셀 규칙). 게임 안 글자는 모두 영문이다.
//
// 화면 하나는 ui/screens/의 파일 하나다. 파일은 SCREENS[화면 ID] = opts => { ... Menu.set(장면) }을 등록하고
// app.js의 go(ID, opts)가 그 함수를 부른다. 장면 객체에 쓸 수 있는 값:
//   layer   'full'  게임 화면을 가리고 바닥·외곽 벽부터 그린다(기본)
//           'over'  게임 화면 위에 어둡게 덮고 그린다(결과·일시정지)
//           'play'  게임 화면만 보이고 이 캔버스는 알림 띠만 그린다(플레이)
//   term    true면 바닥 대신 모니터 화면 같은 먹색 주사선(부팅)
//   items   메뉴 항목 [{ act, label, x, y, w, h, off, hidden, place, content, look }]. 좌표는 아트 픽셀
//   sel     처음 고를 항목 번호       axis  'y'(기본)|'x' 방향키로 넘기는 축
//   place   'left'(기본)|'cell'|'none' 커서 자리. 'cell'은 항목 안 오른쪽, 'none'은 커서를 숨기고 항목 테두리만 보인다
//   nav(dx, dy, sel) 다음 항목 번호를 직접 정할 때. Menu.reset으로 항목을 바꿔 끼웠으면 null
//   side(dx, item) 좌우 키를 항목이 먼저 쓸 때 true
//   draw(now) 항목 밑에 그릴 것     onPick(act, item) 골랐을 때     back() Esc
//   fail    true면 커서 모니터가 실패 표정(빨간 점멸)
//   onKey(e) 키를 먼저 받는다. true를 돌려주면 메뉴 조작을 하지 않는다
//   onClick() 화면 클릭     leave() 다른 화면으로 넘어가기 전
// 입력바의 ⌫·ENTER 키는 Backspace·Enter를 누른 것과 같아서 onKey와 메뉴 조작으로 들어온다.

const SCREENS = {};

const SCREEN_CANVAS = document.getElementById('screen');
const g = SCREEN_CANVAS.getContext('2d');
const W = SCREEN_CANVAS.width; // 416
const H = SCREEN_CANVAS.height; // 233
const CX = W / 2;
const FLOOR = { x: 7, y: 7, w: W - 14, h: H - 14 }; // 외곽 벽 7칸(화면 14px) 안쪽
const PC_W = 19; // 커서 모니터 크기(모니터 캐릭터 정본 A안)
const PC_H = 15;
const PC_GAP = 4;
const COL = {
  text: '#e6e9f2', bright: '#f2f4f8', sub: '#b4bac6', item: '#8b93a6', dim: '#6e737c', faint: '#4a4f5b',
  amber: '#ffa53d', red: '#ff3b3b', file: '#aeb4be', virus: '#d6336c', term: '#c9ced8', line: '#3a3e48',
};
const HINT = 'ARROWS/WASD MOVE · ENTER SELECT · ESC/BACKSPACE BACK';
// 키 이름: 방향 U·D·L·R, 고르기 ok, 뒤로 back. 플레이와 메뉴가 같은 키를 쓴다(IA 화면 이동 절)
// 메뉴에서 Backspace(⌫ 키)는 Esc와 같은 뒤로다. 휴대폰에는 Esc가 없다(입력바 정본 키 역할)
const KEYS = {
  ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D',
  ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R',
  Enter: 'ok', NumpadEnter: 'ok', Escape: 'back', Backspace: 'back',
};

// ---------- 화면 배치 도구 ----------

const hint = text => drawTextCenter(g, text, CX, FLOOR.y + FLOOR.h - 11, COL.dim);
const centeredPanel = (w, h) => ({ x: Math.round(CX - w / 2), y: Math.round((H - h) / 2), w, h });

// 문양 + 큰 글자 제목을 가운데에 함께 놓는다
function drawTitle(str, y, color, emblem) {
  const tw = measure(str, BIG);
  const ew = emblem ? emblem[0].length + 5 : 0;
  const x = Math.round(CX - (tw + ew) / 2);
  if (emblem) drawBitmap(g, emblem, EMBLEM_COLORS, x, y + Math.floor((BIG.h - emblem.length) / 2));
  drawText(g, str, x + ew, y, color, BIG);
}

// 항목 세로 줄·가로 줄. defs: [[act, label, 추가 값], ...]. 커서 자리만큼 오른쪽으로 민다
function column(defs, { w, y, cx = CX, h = 17, gap = 5 }) {
  const x = Math.round(cx - (w + PC_W + PC_GAP) / 2 + PC_W + PC_GAP);
  return defs.map(([act, label, extra = {}], i) => ({ act, label, x, y: y + i * (h + gap), w, h, ...extra }));
}
function row(defs, { w, y, cx = CX, h = 17, gap = 28 }) {
  const total = defs.length * w + (defs.length - 1) * gap;
  const x0 = Math.round(cx - (total + PC_W + PC_GAP) / 2 + PC_W + PC_GAP);
  return defs.map(([act, label, extra = {}], i) => ({ act, label, x: x0 + i * (w + gap), y, w, h, ...extra }));
}

// 왼쪽에 이름, 오른쪽에 값을 쓰는 항목 내용(설정)
const pair = (label, value) => (it, st, dy) => {
  const c = WELL[st].text;
  const y = it.y + Math.floor((it.h - FONT.h) / 2) + dy;
  drawText(g, label, it.x + 7, y, c);
  drawTextRight(g, value(), it.x + it.w - 7, y, c);
};

// ---------- 장면과 커서 ----------

const Menu = (() => {
  let scene = null;
  let cur = null; // 커서 모니터: 지금 위치(x, y), 목표(tx, ty), 미끄러지는 방향, 충돌 프레임
  let faceDir = null; // 누른 방향. 누르기 전에는 얼굴이 가운데
  let pressed = { idx: -1, until: 0 };
  let toastState = null;
  let busy = false;

  // 'left'는 항목 왼쪽, 'cell'은 칸 안 오른쪽 가운데
  function cursorTarget(it) {
    const y = it.y + Math.floor((it.h - PC_H) / 2);
    return (it.place || scene.place) === 'cell' ? [it.x + it.w - PC_W - 4, y] : [it.x - PC_W - PC_GAP, y];
  }

  function set(def) {
    busy = false;
    toastState = null;
    scene = { axis: 'y', place: 'left', layer: 'full', items: [], ...def, born: performance.now(), sel: -1 };
    let sel = def.sel ?? 0;
    if (!scene.items[sel] || scene.items[sel].off) sel = scene.items.findIndex(it => !it.off);
    if (sel < 0) return;
    scene.sel = sel;
    const [x, y] = cursorTarget(scene.items[sel]);
    cur = { x, y, tx: x, ty: y, dir: 'R', bumpUntil: 0, bumpAxis: 'x' };
  }

  function select(i) {
    const it = scene.items[i];
    if (!it || it.off || it.hidden || i === scene.sel) return;
    scene.sel = i;
    [cur.tx, cur.ty] = cursorTarget(it);
    const dx = cur.tx - cur.x;
    const dy = cur.ty - cur.y;
    if (dx || dy) cur.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
  }

  function bump(axis) {
    if (!cur) return;
    cur.bumpAxis = axis;
    cur.bumpUntil = performance.now() + 180;
  }

  function move(dir) {
    const [dx, dy] = DIRS[dir];
    faceDir = dir;
    if (scene.sel < 0) return;
    if (scene.side && dx && scene.side(dx, scene.items[scene.sel])) return;
    let next = scene.sel;
    if (scene.nav) {
      next = scene.nav(dx, dy, scene.sel);
      if (next === null) return;
    } else {
      const step = scene.axis === 'x' ? dx : dy;
      if (step) do next += step; while (scene.items[next]?.off);
    }
    if (next !== scene.sel && scene.items[next]) select(next);
    else bump(dx ? 'x' : 'y');
  }

  // 고르기: 항목과 ENTER 키가 눌리는 모습을 보인 뒤 onPick을 부른다
  function pick() {
    const sc = scene;
    if (!sc || busy || sc.sel < 0) return;
    const it = sc.items[sc.sel];
    busy = true;
    pressed = { idx: sc.sel, until: performance.now() + 110 };
    Shell.press('enter');
    setTimeout(() => {
      busy = false;
      if (scene === sc) sc.onPick(it.act, it);
    }, 110);
  }

  function toast(text) {
    toastState = { text, born: performance.now() };
  }

  // ---------- 그리기 ----------

  function drawFloor() {
    fill(g, FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h, 'rgba(28, 28, 31, 0.84)');
    // 점 격자: 16칸마다 한 점 (게임 칸 16×16과 같은 간격)
    const ox = FLOOR.x + Math.floor((FLOOR.w % 16) / 2) + 8;
    const oy = FLOOR.y + Math.floor((FLOOR.h % 16) / 2) + 8;
    for (let y = oy; y < FLOOR.y + FLOOR.h; y += 16) {
      for (let x = ox; x < FLOOR.x + FLOOR.w; x += 16) fill(g, x, y, 1, 1, '#2c2d32');
    }
  }

  // 부팅 화면: 모니터 화면과 같은 먹색 주사선
  function drawTerminal() {
    for (let y = 0; y < FLOOR.h; y++) fill(g, FLOOR.x, FLOOR.y + y, FLOOR.w, 1, y % 2 ? '#17191c' : '#101113');
  }

  function drawItem(it, i, now) {
    if (it.hidden) return;
    let st = it.off ? 'off' : i === scene.sel ? (pressed.idx === i && now < pressed.until ? 'press' : 'sel') : 'normal';
    if (it.look) st = it.look(st);
    well(g, it.x, it.y, it.w, it.h, st);
    const dy = st === 'press' ? 1 : 0;
    if (it.content) it.content(it, st, dy);
    else drawTextCenter(g, it.label, it.x + it.w / 2, it.y + Math.floor((it.h - FONT.h) / 2) + dy, WELL[st].text);
  }

  function drawCursor(now) {
    if (scene.sel < 0 || scene.items[scene.sel].place === 'none') return;
    // 목표까지 프레임마다 최대 9칸씩 미끄러진다
    cur.x += clamp(cur.tx - cur.x, -9, 9);
    cur.y += clamp(cur.ty - cur.y, -9, 9);
    const moving = cur.x !== cur.tx || cur.y !== cur.ty;

    // 미끄러질 때 진행 방향 뒤로 점점 옅어지는 픽셀 블록 3개 (게임 화면 잔상과 같은 방식)
    if (moving) {
      const [dx, dy] = DIRS[cur.dir];
      const reach = dx ? [12, 15, 17] : [10, 13, 15];
      [[3, 0.45], [2, 0.3], [1, 0.18]].forEach(([size, a], k) => {
        g.globalAlpha = a;
        const half = size >> 1;
        fill(g, cur.x + 9 - dx * reach[k] - half, cur.y + 7 - dy * reach[k] - half, size, size, COL.amber);
      });
      g.globalAlpha = 1;
    }

    const [fdx, fdy] = DIRS[faceDir] || [0, 0];
    const o = { dx: fdx, dy: fdy };
    if (now < cur.bumpUntil) o.squash = cur.bumpAxis === 'x' ? 'h' : 'v';
    if (scene.fail) {
      // 실패: 빨간 화면 테두리와 X(가 0.5초마다 켜지고 꺼진다 (모니터 표정 결정)
      const on = Math.floor((now - scene.born) / 500) % 2 === 0;
      Object.assign(o, { face: 'X(', color: on ? 'R' : 'r', ring: on ? 'R' : '' });
    }
    const m = monitor(o);
    drawBitmap(g, m.rows, MON_COLORS, cur.x + Math.floor((PC_W - m.W) / 2), cur.y + Math.floor((PC_H - m.H) / 2));
  }

  function drawToast(now) {
    if (!toastState) return;
    const age = now - toastState.born;
    if (age > 1800) {
      toastState = null;
      return;
    }
    if (age > 1400 && Math.floor(age / 80) % 2) return; // 깜빡이다 사라진다
    const w = measure(toastState.text) + 16;
    const x = Math.round(CX - w / 2);
    const y = FLOOR.y + FLOOR.h - 19;
    box(g, x, y, w, 15, '#0c0d10', ['#4d525f', '#4d525f', '#4d525f', '#4d525f']);
    drawText(g, toastState.text, x + 8, y + 4, COL.text);
  }

  function frame(now) {
    g.clearRect(0, 0, W, H);
    if (scene.layer === 'full') {
      if (scene.term) drawTerminal();
      else drawFloor();
      outerWall(g, W, H, FLOOR.x, FLOOR.y, 1);
    } else if (scene.layer === 'over') {
      fill(g, 0, 0, W, H, 'rgba(12, 13, 17, 0.82)');
    }
    scene.draw?.(now);
    scene.items.forEach((it, i) => drawItem(it, i, now));
    drawCursor(now);
    drawToast(now);
  }

  // 마우스: 화면 좌표를 아트 픽셀로 바꿔 항목을 찾는다
  function hit(e) {
    const r = SCREEN_CANVAS.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    return scene.items.findIndex(it => !it.hidden && x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h);
  }

  return {
    get scene() {
      return scene;
    },
    set,
    select,
    move,
    pick,
    bump,
    toast,
    // 항목을 통째로 바꿔 끼우고 sel을 고른다. 커서는 지금 자리에서 새 항목으로 미끄러진다(탭 전환, 쪽 넘김)
    reset(items, sel) {
      scene.items = items;
      scene.sel = -1;
      select(sel);
    },
    // 고를 수 없는 것을 골랐을 때: 커서가 눌리고 알림 띠를 띄운다
    refuse(text) {
      bump('x');
      toast(text);
    },
    frame,
    hit,
  };
})();
