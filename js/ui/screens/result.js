// S4 결과: 게임 화면 위에 어둡게 덮은 패널. 클리어는 체크 문양과 흰 제목, 셔터 라벨에 체크 도장.
// 감염은 감염 문양과 빨간 제목, 남은 대상은 빨간 제목. 실패면 커서 모니터가 빨간 X(로 점멸한다.
// opts는 Play의 finish 결과 { status, moves, left }. 클리어면 여기서 기록을 남긴다.

SCREENS.S4 = ({ status, moves, left }) => {
  const i = Play.idx;
  const lv = CATALOG.levels[i];
  const last = i === CATALOG.levels.length - 1;
  const clear = status === 'clear';
  if (clear) Progress.record(i, moves);

  const buttons = [['retry', 'RETRY'], ['select', 'STAGE SELECT']];
  let title, sub, emblem;
  let parBadge = false;
  if (clear) {
    title = `${lv.id} ${lv.name} CLEAR!`;
    sub = `MOVES ${moves} · PAR ${lv.par ?? '?'} · BEST ${Progress.best(i)}`;
    emblem = CHECK;
    parBadge = lv.par !== null && moves <= lv.par;
    if (!last) buttons.unshift(['next', 'NEXT LEVEL']);
    else if (!Progress.allClearSeen) buttons.unshift(['all', 'CONTINUE']);
  } else if (status === 'dead') {
    title = 'INFECTED BY A VIRUS';
    sub = `EAT VIRUSES ONLY WITHIN ${SUPER_MOVES} MOVES OF A VACCINE`;
    emblem = EMBLEMS.infect.normal;
  } else {
    const { files: f, viruses: v } = left;
    title = 'TARGETS REMAIN';
    sub = `${f} FILE${f === 1 ? '' : 'S'} AND ${v} VIRUS${v === 1 ? '' : 'ES'} ${f + v === 1 ? 'IS' : 'ARE'} LEFT`;
  }

  Shell.label(`${lv.id} ${lv.name}`);
  Shell.playHud(i, Play.state);
  Shell.queue(Play.queue);
  Shell.stamp(clear);

  const p = centeredPanel(340, 74 + (parBadge ? 17 : 0));
  Menu.set({
    layer: 'over',
    axis: 'x',
    fail: !clear,
    items: row(buttons, { w: 80, y: p.y + p.h - 27 }),
    draw() {
      panel(g, p.x, p.y, p.w, p.h);
      drawTitle(title, p.y + 10, clear ? COL.bright : COL.red, emblem);
      drawTextCenter(g, sub, CX, p.y + 30, COL.sub);
      if (parBadge) badge(g, '★ PAR!', Math.round(CX - (measure('★ PAR!') + 8) / 2), p.y + 43);
    },
    onPick: act => {
      if (act === 'next') {
        Progress.open(i + 1);
        Play.load(i + 1);
        go('S3');
      } else if (act === 'all') go('S7');
      else if (act === 'retry') {
        Play.load(i, true);
        go('S3');
      } else go('S2');
    },
  });
};
