// S6 설정과 하위 화면(S6-keys 조작 안내, S6-wipe 기록 지우기 확인). 타이틀이나 일시정지에서 들어가고 들어온 곳으로 돌아간다.
// 일시정지에서 왔으면 게임 화면 위에 덮고 라벨·HUD는 플레이 것을, 타이틀에서 왔으면 이름만 둔다.
// RUN SPEED와 CLEAR RECORDS는 쓸 수 있고 SOUND는 게임에 소리가 생길 때까지 비활성이다(메뉴 화면 시안 01의 권장안).

let settingsFrom = 'S1';

// 들어온 화면에 맞춰 캔버스 밖 요소를 두고 장면 layer를 돌려준다
function settingsShell() {
  if (settingsFrom === 'S5') {
    const lv = Play.level;
    Shell.label(`${lv.id} ${lv.name}`);
    Shell.playHud(Play.idx, Play.state);
  } else {
    Shell.label();
    Shell.hud([]);
  }
  Shell.queue();
  return settingsFrom === 'S5' ? 'over' : 'full';
}

SCREENS.S6 = ({ sel = 0, from } = {}) => {
  if (from) settingsFrom = from;
  const layer = settingsShell();
  const speedText = () => `◀ ${SPEEDS[Progress.speed][0]} ▶`;
  const back = () => go(settingsFrom, { sel: settingsFrom === 'S5' ? 3 : 1 });
  const p = centeredPanel(270, 149);
  Menu.set({
    layer,
    sel,
    items: column([
      ['speed', '', { content: pair('RUN SPEED', speedText) }],
      ['sound', '', { off: true, content: pair('SOUND', () => 'COMING LATER') }],
      ['keys', '', { content: pair('CONTROLS', () => '›') }],
      ['wipe', '', { content: pair('CLEAR RECORDS', () => '›') }],
      ['back', 'BACK'],
    ], { w: 200, y: p.y + 34 }),
    back,
    side: (dx, it) => {
      if (it.act !== 'speed') return false;
      const v = Progress.speed + dx;
      if (v >= 0 && v < SPEEDS.length) Progress.speed = v;
      else Menu.bump('x');
      return true;
    },
    draw() {
      panel(g, p.x, p.y, p.w, p.h);
      drawTextCenter(g, 'SETTINGS', CX, p.y + 10, COL.bright, BIG);
    },
    onPick: act => {
      if (act === 'speed') Progress.speed = (Progress.speed + 1) % SPEEDS.length;
      else if (act === 'keys') go('S6-keys');
      else if (act === 'wipe') go('S6-wipe');
      else back();
    },
  });
};

SCREENS['S6-keys'] = () => {
  const layer = settingsShell();
  const GUIDE = [
    ['MOVE · NAVIGATE', '←↑↓→ / WASD / SWIPE'],
    ['RUN · SELECT', 'ENTER'],
    ['UNDO LAST INPUT', 'BACKSPACE'],
    ['CLEAR INPUT', 'R'],
    ['STOP RUN', 'R / ESC'],
    ['PAUSE · BACK', 'ESC / BACKSPACE'],
  ];
  const back = () => go('S6', { sel: 2 });
  const p = centeredPanel(300, 137);
  Menu.set({
    layer,
    items: column([['close', 'CLOSE']], { w: 100, y: p.y + 110 }),
    back,
    draw() {
      panel(g, p.x, p.y, p.w, p.h);
      drawTextCenter(g, 'CONTROLS', CX, p.y + 10, COL.bright, BIG);
      GUIDE.forEach(([name, keys], k) => {
        const y = p.y + 33 + k * 12;
        drawText(g, name, p.x + 16, y, COL.sub);
        drawTextRight(g, keys, p.x + p.w - 16, y, COL.bright);
        if (k < GUIDE.length - 1) fill(g, p.x + 12, y + 9, p.w - 24, 1, COL.line);
      });
    },
    onPick: back,
  });
};

SCREENS['S6-wipe'] = () => {
  const layer = settingsShell();
  const back = () => go('S6', { sel: 3 });
  const p = centeredPanel(300, 89);
  Menu.set({
    layer,
    axis: 'x',
    items: row([['no', 'CANCEL'], ['yes', 'DELETE']], { w: 80, y: p.y + p.h - 27 }),
    back,
    draw() {
      panel(g, p.x, p.y, p.w, p.h);
      drawTextCenter(g, 'CLEAR RECORDS', CX, p.y + 10, COL.bright, BIG);
      drawTextCenter(g, 'ALL CLEAR MARKS AND BEST RECORDS', CX, p.y + 32, COL.sub);
      drawTextCenter(g, 'WILL BE DELETED. THIS CANNOT BE UNDONE.', CX, p.y + 43, COL.sub);
    },
    onPick: act => {
      if (act === 'yes') {
        Progress.wipe();
        back();
        Menu.toast('RECORDS CLEARED');
      } else back();
    },
  });
};
