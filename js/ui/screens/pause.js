// S5 일시정지: 입력 중 Esc로 열린다. 게임 화면 위에 어둡게 덮은 패널. 라벨·HUD는 플레이 것을 그대로, 입력 홈은 빈 슬롯.
// 계속(또는 Esc)은 입력을 그대로 두고 S3, 처음부터는 입력을 비우고 S3.

SCREENS.S5 = ({ sel = 0 } = {}) => {
  const i = Play.idx;
  const lv = Play.level;
  Shell.label(`${lv.id} ${lv.name}`);
  Shell.playHud(i, Play.state);
  Shell.queue();
  Shell.stamp(false);
  const p = centeredPanel(190, 161);
  Menu.set({
    layer: 'over',
    sel,
    items: column([
      ['resume', 'RESUME'],
      ['restart', 'RESTART'],
      ['select', 'STAGE SELECT'],
      ['settings', 'SETTINGS'],
      ['title', 'TITLE'],
    ], { w: 120, y: p.y + 46 }),
    back: () => go('S3'),
    draw() {
      panel(g, p.x, p.y, p.w, p.h);
      drawTextCenter(g, 'PAUSED', CX, p.y + 10, COL.bright, BIG);
      drawTextCenter(g, `${lv.id} ${lv.name}`, CX, p.y + 29, COL.dim);
    },
    onPick: act => {
      if (act === 'resume') go('S3');
      else if (act === 'restart') {
        Play.load(i);
        go('S3');
        Menu.toast('INPUT CLEARED');
      } else if (act === 'select') go('S2');
      else if (act === 'settings') go('S6', { from: 'S5' });
      else go('S1');
    },
  });
};
