// 시작점: 무대 맞춤, 화면 이동 go, 키보드·마우스·입력바 연결, 레벨 파일 불러오기, 매 프레임 그리기. 첫 화면은 S0 부팅.
// 화면별 내용은 ui/screens/, 메뉴 조작은 ui/menu.js, 게임 진행은 play/session.js에 있다.

const stage = document.querySelector('.stage');
// 화면 크기는 clientWidth·clientHeight로 잰다. 휴대폰 브라우저는 1080px 무대 때문에 innerWidth를 화면보다 넓게 알려 준다
const fit = () => {
  const { clientWidth: w, clientHeight: h } = document.documentElement;
  stage.style.scale = Math.min(w / 1080, h / 1080);
};
addEventListener('resize', fit);
fit();

// 화면 이동. id는 SCREENS의 키(IA 화면 ID), opts는 그 화면에 넘길 값. 지금 화면 ID는 body의 data-screen에 남긴다
function go(id, opts = {}) {
  Menu.scene?.leave?.();
  document.body.dataset.screen = id;
  SCREENS[id](opts);
  Board.show(Menu.scene.layer !== 'full');
}

// 키: 장면의 onKey가 먼저 받고, 받지 않은 키는 메뉴 조작(방향 이동, Enter 고르기, Esc·Backspace 뒤로). 받았으면 true
// 입력바의 ⌫·ENTER 키, 스와이프도 이 함수로 들어온다. Backspace·Enter는 화면의 키가 눌린 모습을 보인다
const PRESS_KEY = { Backspace: 'back', Enter: 'enter', NumpadEnter: 'enter' };
function handleKey(e) {
  const sc = Menu.scene;
  if (!sc) return false; // 레벨 파일을 불러오는 중
  if (PRESS_KEY[e.code]) Shell.press(PRESS_KEY[e.code]);
  if (sc.onKey?.(e)) return true;
  const k = KEYS[e.code];
  if (!k) return false;
  if (k === 'ok') Menu.pick();
  else if (k === 'back') sc.back?.();
  else Menu.move(k);
  return true;
}
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key)) return;
  if (handleKey(e)) e.preventDefault();
});

// 터치(휴대폰): 무대에서 한 번 밀면 그 방향의 방향키를 한 번 누른 것과 같다.
// 플레이에서는 방향 입력, 메뉴에서는 커서 이동, 부팅에서는 넘기기. 무대 폭의 3%(최소 16px)보다 짧으면 탭이다.
// 브라우저는 스와이프 직후의 탭에서 click을 빠뜨리기도 해서, 터치의 기본 click은 막고 탭이면 그 자리에 click을 한 번 보낸다.
// 마우스는 이 경로를 타지 않고 원래 click·호버를 쓴다.
const SWIPE_CODE = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
let touchFrom = null;
stage.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') touchFrom = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
stage.addEventListener('pointerup', e => {
  if (!touchFrom || e.pointerId !== touchFrom.id) return;
  const dx = e.clientX - touchFrom.x;
  const dy = e.clientY - touchFrom.y;
  touchFrom = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < Math.max(16, stage.getBoundingClientRect().width * 0.03)) {
    document.elementFromPoint(e.clientX, e.clientY)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }));
    return;
  }
  const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
  handleKey({ code: SWIPE_CODE[dir], key: '', repeat: false });
});
stage.addEventListener('pointercancel', () => {
  touchFrom = null;
});
// 이미 끌기로 넘어간 터치는 막을 수 없고(cancelable false) 그때는 브라우저도 click을 보내지 않는다
stage.addEventListener('touchend', e => {
  if (e.cancelable) e.preventDefault();
}, { passive: false });

SCREEN_CANVAS.addEventListener('mousemove', e => {
  if (!Menu.scene) return;
  const i = Menu.hit(e);
  if (i >= 0) Menu.select(i);
  SCREEN_CANVAS.style.cursor = i >= 0 && !Menu.scene.items[i].off ? 'pointer' : '';
});
SCREEN_CANVAS.addEventListener('click', e => {
  const sc = Menu.scene;
  if (!sc) return;
  if (sc.onClick) return sc.onClick();
  const i = Menu.hit(e);
  if (i < 0 || sc.items[i].off) return;
  Menu.select(i);
  Menu.pick();
});
// 입력바 키: ⌫는 Backspace, ENTER는 Enter를 누른 것과 같다
Shell.keys.back.addEventListener('click', () => handleKey({ code: 'Backspace', key: 'Backspace', repeat: false }));
Shell.keys.enter.addEventListener('click', () => handleKey({ code: 'Enter', key: 'Enter', repeat: false }));

function frame(now) {
  Play.update(now);
  if (Menu.scene.layer !== 'full') Board.draw(now, Play);
  Menu.frame(now);
  requestAnimationFrame(frame);
}

// 레벨 파일을 모두 불러온 뒤 목록을 만들고 시작한다
loadLevelFiles().then(() => {
  CATALOG.build();
  Play.load(Progress.last);
  go('S0');
  requestAnimationFrame(frame);
});
