// S1 타이틀: 로고, 파일 › 백신 › 바이러스 한 줄 소개, START GAME·SETTINGS·QUIT(데스크톱 빌드 전까지 비활성).
// 라벨은 이름만, HUD와 입력 홈은 비운다.

SCREENS.S1 = ({ sel = 0 } = {}) => {
  Shell.label();
  Shell.hud([]);
  Shell.queue();
  Menu.set({
    sel,
    items: column([
      ['start', 'START GAME'],
      ['settings', 'SETTINGS'],
      ['quit', 'QUIT · DESKTOP ONLY', { off: true }],
    ], { w: 130, y: 100 }),
    draw(now) {
      const y = FLOOR.y + 20;
      const lx = Math.round(CX - measure('SLIPDISK.EXE', LOGO) / 2);
      drawText(g, 'SLIPDISK.EXE', lx + 2, y + 2, '#17191f', LOGO);
      drawText(g, 'SLIPDISK.EXE', lx + 1, y + 1, '#363940', LOGO);
      drawTextCenter(g, 'SLIPDISK.EXE', CX, y, '#e9ecf2', LOGO);

      // 한 줄 소개: 파일 › 백신 › 바이러스 (먹는 순서)
      const virus = VIRUS[Math.floor(now / 240) % 2];
      const parts = [[FILE, FILE_COLORS, 'FILES'], [PILL, PILL_COLORS, 'VACCINE'], [virus, VIRUS_COLORS, 'VIRUS']];
      const width = parts.reduce((n, [rows, , label]) => n + rows[0].length + 4 + measure(label), 0) + 2 * 21;
      let x = Math.round(CX - width / 2);
      const cy = 74;
      parts.forEach(([rows, colors, label], i) => {
        if (i) {
          drawText(g, '›', x + 8, cy - 3, '#4d525f');
          x += 21;
        }
        drawBitmap(g, rows, colors, x, cy - Math.floor(rows.length / 2));
        x += rows[0].length + 4;
        drawText(g, label, x, cy - 3, COL.item);
        x += measure(label);
      });
      hint('ARROWS/WASD MOVE · ENTER SELECT');
    },
    onPick: act => {
      if (act === 'start') go('S2');
      else go('S6', { from: 'S1' });
    },
  });
};
