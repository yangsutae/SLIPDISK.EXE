// S7 전체 클리어: 마지막 레벨을 클리어한 결과에서 CONTINUE를 고르면 한 번 나온다. 끝나면 S2.
// 라벨에 - ALL CLEAR와 체크 도장, HUD는 스테이지 선택과 같다.

SCREENS.S7 = () => {
  const N = CATALOG.levels.length;
  Progress.seeAllClear();
  Shell.label('ALL CLEAR');
  Shell.menuHud();
  Shell.queue();
  Shell.stamp(true);
  const top = FLOOR.y + Math.floor((FLOOR.h - 121) / 2);
  const STATS = [
    [`${Progress.countClear()}/${N}`, 'CLEARED', COL.text],
    [`${Progress.countPar()}/${N}`, 'PAR', COL.amber],
    [String(CATALOG.totalFiles), 'FILES SAVED', COL.file],
    [String(CATALOG.totalViruses), 'VIRUSES CURED', COL.virus],
  ];
  Menu.set({
    axis: 'x',
    items: row([['go', 'CONTINUE']], { w: 110, y: top + 104 }),
    back: () => go('S2'),
    draw() {
      const cmd = 'A:\\> SCAN COMPLETE';
      const kx = Math.round(CX - measure(cmd) / 2);
      drawText(g, 'A:\\>', kx, top, COL.amber);
      drawText(g, 'SCAN COMPLETE', kx + measure('A:\\> ') + 1, top, COL.dim);
      drawTextCenter(g, 'FULL DISK SCAN COMPLETE', CX, top + 15, COL.bright, BIG);
      drawTextCenter(g, `ALL ${N} LEVELS CLEARED`, CX, top + 35, COL.sub);
      STATS.forEach(([value, name, color], k) => {
        const x = Math.round(CX - (4 * 84 + 3 * 6) / 2) + k * 90;
        well(g, x, top + 54, 84, 34);
        drawTextCenter(g, value, x + 42, top + 61, color);
        drawTextCenter(g, name, x + 42, top + 74, COL.dim);
      });
    },
    onPick: () => go('S2'),
  });
};
