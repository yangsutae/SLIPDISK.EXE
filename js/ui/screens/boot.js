// S0 부팅: 모니터 화면 같은 먹색 주사선 바탕에 A:\> SLIPDISK.EXE를 치고 디스크를 읽는 연출.
// 마지막 글자(PRESS ANY KEY)가 뜨고 4초 뒤, 또는 아무 키·클릭·스와이프·입력바 키로 S1. 라벨은 이름만, HUD와 입력 홈은 비운다.

SCREENS.S0 = () => {
  Shell.label();
  Shell.hud([]);
  Shell.queue();
  // [뜨는 시각(ms), 글자]. null은 읽기 막대
  const LINES = [
    [900, 'READING DRIVE A: TRACK 00-79'],
    [1200, null],
    [2300, `FOUND ${CATALOG.totalFiles} FILES AND ${CATALOG.totalViruses} VIRUSES`],
    [2700, 'STARTING SCAN...'],
    [3200, 'PRESS ANY KEY'],
  ];
  const last = LINES.length - 1;
  const timer = setTimeout(() => go('S1'), LINES[last][0] + 4000);
  const skip = () => go('S1');

  Menu.set({
    term: true,
    leave: () => clearTimeout(timer),
    onKey: e => {
      if (!e.repeat) skip();
      return true;
    },
    onClick: skip,
    draw(now) {
      const e = now - this.born;
      const x = FLOOR.x + 16;
      const y = FLOOR.y + 16;
      drawText(g, 'A:\>', x, y, COL.amber);
      const cmd = 'SLIPDISK.EXE';
      drawText(g, cmd.slice(0, clamp(Math.floor((e - 300) / 55), 0, cmd.length)), x + measure('A:\> ') + 1, y, COL.term);
      LINES.forEach(([at, str], i) => {
        if (e < at) return;
        const ly = y + 16 * (i + 1) + (i === last ? 8 : 0);
        if (str === null) {
          // 읽기 막대: 24칸이 1초 동안 한 칸씩 찬다
          box(g, x, ly, 150, 9, '#101113', [COL.term, COL.term, COL.term, COL.term]);
          const n = clamp(Math.floor(((e - at) / 1000) * 24), 0, 24);
          for (let k = 0; k < n; k++) fill(g, x + 3 + k * 6, ly + 2, 5, 5, COL.term);
          return;
        }
        drawText(g, str, x, ly, COL.term);
        if (i === last && Math.floor(e / 500) % 2 === 0) drawText(g, '_', x + measure(`${str} `) + 1, ly, COL.term);
      });
    },
  });
};
