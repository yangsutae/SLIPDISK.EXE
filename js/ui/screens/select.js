// S2 스테이지 선택: 위쪽에 단계 탭, 그 아래 고른 단계의 레벨 칸. 탭과 칸은 CATALOG에서 만든다.
// 레벨·단계를 늘려도 이 파일은 고치지 않는다.
//   탭  단계마다 하나(STAGE n). 한 줄에 다 들어가지 않으면 고른 탭을 따라 넘기고 양 끝에 ◀·▶를 띄운다.
//       커서 모니터는 숨기고 고른 탭은 은색 테두리, 보고 있는 단계의 탭은 눌린 모양이다.
//   칸  크기가 같은 칸을 한 줄에 최대 5개 놓고 칸 묶음은 가운데에 놓인다. 한 쪽은 4줄(20칸)이고
//       넘으면 쪽을 나누고 오른쪽 끝에 ↑·↓를 띄운다.
//       칸에는 번호와 상태만 쓴다. 클리어는 앰버 체크, 최단 달성은 크림색 별, 잠긴 칸은 자물쇠.
//       고른 칸의 번호, 이름, 기록(BEST·PAR)은 칸 묶음 아래 한 줄에 쓴다.
// 조작: 탭에서 좌우는 단계 전환(바로 보임), 아래는 칸으로, 맨 오른쪽 탭에서 오른쪽은 BACK.
//       칸에서 좌우는 레벨 순서대로(단계 끝에서는 옆 단계로 넘어감), 상하는 같은 칸 자리, 맨 윗줄에서 위는 탭.
//       탭을 클릭하면 그 단계를 보이고, 보고 있는 탭을 고르면 칸으로 내려간다.

const SELECT_LAYOUT = {
  left: FLOOR.x + 8, right: FLOOR.x + FLOOR.w - 8, // 칸과 탭이 놓이는 폭 (15 ~ 401)
  tabY: 12, tabH: 15, tabGap: 4, arrowW: 8,
  headY: 34,
  gridTop: 50, gridBottom: 188, detailY: 195,
  cellH: 30, gap: 6, maxCols: 5, maxCellW: 72,
};

// 스테이지 칸 내용: 왼쪽 위에 번호, 그 아래 상태 그림. 커서 모니터는 칸 안 오른쪽 가운데에 선다
function stageCell(i) {
  return (it, st, dy) => {
    const open = Progress.isOpen(i);
    const on = st === 'sel' || st === 'press';
    drawText(g, CATALOG.levels[i].id, it.x + 6, it.y + 6 + dy, !open ? COL.faint : on ? COL.bright : COL.text);
    const y = it.y + 17 + dy;
    if (!open) drawBitmap(g, LOCK, LOCK_COLORS, it.x + 6, y);
    else if (Progress.isClear(i)) {
      drawBitmap(g, CHECK, EMBLEM_COLORS, it.x + 5, y - 1);
      if (Progress.isPar(i)) drawBitmap(g, STAR, STAR_COLORS, it.x + 5 + CHECK[0].length + 1, y - 2);
    }
  };
}

// 고른 칸의 레벨 한 줄: 번호, 이름, 기록
function stageDetail(i) {
  const lv = CATALOG.levels[i];
  const best = Progress.best(i);
  const par = lv.par ?? '?';
  const rec = !Progress.isOpen(i) ? 'LOCKED' : best === null ? `PAR ${par}` : `BEST ${best} · PAR ${par}`;
  return `${lv.id} ${lv.name} · ${rec}`;
}

SCREENS.S2 = () => {
  const Lay = SELECT_LAYOUT;
  const groups = CATALOG.groups;
  const G = groups.length;
  Shell.label('STAGE SELECT');
  Shell.menuHud();
  Shell.queue();

  const BACK = { act: 'back', kind: 'back', label: 'BACK', x: FLOOR.x + FLOOR.w - 48, y: Lay.tabY, w: 40, h: Lay.tabH };

  // 탭 폭은 가장 긴 탭 글자에 맞춘다. 탭 줄은 BACK 왼쪽 커서 자리 앞까지
  const tabW = Math.max(...groups.map(gr => measure(`STAGE ${gr.no}`))) + 10;
  const tabSpace = BACK.x - PC_W - PC_GAP - 4 - Lay.left;
  const fitTabs = n => Math.max(1, Math.floor((n + Lay.tabGap) / (tabW + Lay.tabGap)));
  const overflow = G * (tabW + Lay.tabGap) - Lay.tabGap > tabSpace;
  const tabsShown = overflow ? fitTabs(tabSpace - Lay.arrowW * 2) : G;
  const tabX0 = Lay.left + (overflow ? Lay.arrowW : 0);

  // 칸 배치: 한 줄 칸 수, 칸 폭, 한 쪽 줄 수
  const gridW = Lay.right - Lay.left;
  const rowsPerPage = Math.floor((Lay.gridBottom - Lay.gridTop + Lay.gap) / (Lay.cellH + Lay.gap));
  const shape = gr => {
    const n = gr.levels.length;
    const cols = Math.min(n, Lay.maxCols);
    const rows = Math.ceil(n / cols);
    return {
      n,
      cols,
      rows,
      pages: Math.ceil(rows / rowsPerPage),
      cellW: Math.min(Lay.maxCellW, Math.floor((gridW - Lay.gap * (cols - 1)) / cols)),
    };
  };

  // 보는 상태: 단계 st, 쪽 page, 탭 줄의 첫 탭 tabTop
  // 고를 것 f는 { kind: 'back' } | { kind: 'tab', g } | { kind: 'cell', k }  (k는 단계 안 레벨 순번). 항목도 같은 값을 갖는다
  let st = 0, page = 0, tabTop = 0;

  function build() {
    const items = [BACK];
    tabTop = clamp(tabTop, st - tabsShown + 1, st);
    for (let gi = tabTop; gi < Math.min(G, tabTop + tabsShown); gi++) {
      const allLocked = groups[gi].levels.every(i => !Progress.isOpen(i));
      items.push({
        act: `tab:${gi}`, kind: 'tab', g: gi, label: `STAGE ${groups[gi].no}`,
        x: tabX0 + (gi - tabTop) * (tabW + Lay.tabGap), y: Lay.tabY, w: tabW, h: Lay.tabH, place: 'none',
        look: s => (s !== 'normal' ? s : gi === st ? 'press' : allLocked ? 'off' : s),
      });
    }
    const sh = shape(groups[st]);
    const first = page * rowsPerPage * sh.cols;
    const count = Math.min(sh.n - first, rowsPerPage * sh.cols);
    const rows = Math.ceil(count / sh.cols);
    const blockH = rows * Lay.cellH + (rows - 1) * Lay.gap;
    const y0 = Lay.gridTop + Math.floor((Lay.gridBottom - Lay.gridTop - blockH) / 2);
    for (let j = 0; j < count; j++) {
      const k = first + j;
      const i = groups[st].levels[k];
      const rowN = Math.min(sh.cols, count - Math.floor(j / sh.cols) * sh.cols); // 이 줄의 칸 수
      const rowW = rowN * sh.cellW + (rowN - 1) * Lay.gap;
      items.push({
        act: String(i), kind: 'cell', k,
        x: Math.round(CX - rowW / 2) + (j % sh.cols) * (sh.cellW + Lay.gap),
        y: y0 + Math.floor(j / sh.cols) * (Lay.cellH + Lay.gap),
        w: sh.cellW, h: Lay.cellH, place: 'cell',
        content: stageCell(i),
        look: s => (Progress.isOpen(i) || s !== 'normal' ? s : 'off'),
      });
    }
    return items;
  }

  const indexOf = (items, f) => items.findIndex(it =>
    it.kind === f.kind && (f.kind !== 'tab' || it.g === f.g) && (f.kind !== 'cell' || it.k === f.k));

  // 고를 것을 정하고 단계·쪽을 맞춘 뒤 항목을 다시 만든다. Menu.set 전이면 항목과 번호만 돌려준다
  function show(f) {
    if (f.kind === 'tab') {
      if (f.g !== st) page = 0;
      st = f.g;
    }
    if (f.kind === 'cell') page = Math.floor(f.k / shape(groups[st]).cols / rowsPerPage);
    const items = build();
    return { items, sel: indexOf(items, f) };
  }
  const moveTo = f => {
    const { items, sel } = show(f);
    Menu.reset(items, sel);
    return null;
  };

  // 칸으로 내려갈 때 쓰는 레벨: 그 쪽의 첫 칸
  const firstOnPage = () => page * rowsPerPage * shape(groups[st]).cols;

  // 처음: 마지막으로 연 레벨(잠겼으면 앞쪽의 열린 레벨)
  let start = Progress.last;
  while (start > 0 && !Progress.isOpen(start)) start--;
  st = Math.max(0, groups.findIndex(gr => gr.levels.includes(start)));
  const init = show({ kind: 'cell', k: groups[st].levels.indexOf(start) });

  Menu.set({
    sel: init.sel,
    items: init.items,
    back: () => go('S1'),
    nav: (dx, dy, sel) => {
      const focus = Menu.scene.items[sel]; // 마우스로 고른 항목일 수도 있다
      if (focus.kind === 'back') {
        if (dx < 0) return moveTo({ kind: 'tab', g: Math.min(G - 1, tabTop + tabsShown - 1) });
        if (dy > 0) return moveTo({ kind: 'cell', k: firstOnPage() });
        return sel;
      }
      if (focus.kind === 'tab') {
        const g2 = focus.g + dx;
        if (dx && g2 >= 0 && g2 < G) return moveTo({ kind: 'tab', g: g2 });
        if (dx > 0) return moveTo({ kind: 'back' });
        if (dy > 0) return moveTo({ kind: 'cell', k: firstOnPage() });
        return sel;
      }
      // 칸
      const sh = shape(groups[st]);
      const k = focus.k;
      if (dx) {
        const k2 = k + dx;
        if (k2 >= 0 && k2 < sh.n) return moveTo({ kind: 'cell', k: k2 });
        const g2 = st + dx;
        if (g2 < 0 || g2 >= G) return sel;
        st = g2;
        return moveTo({ kind: 'cell', k: dx > 0 ? 0 : groups[g2].levels.length - 1 });
      }
      const row = Math.floor(k / sh.cols);
      if (dy < 0) return row === 0 ? moveTo({ kind: 'tab', g: st }) : moveTo({ kind: 'cell', k: k - sh.cols });
      if (row === sh.rows - 1) return sel;
      return moveTo({ kind: 'cell', k: Math.min(k + sh.cols, sh.n - 1) });
    },
    draw() {
      const gr = groups[st];
      const sh = shape(gr);
      // 탭 줄 양 끝 넘김 표시
      if (tabTop > 0) drawText(g, '◀', Lay.left, Lay.tabY + 4, COL.dim);
      if (tabTop + tabsShown < G) drawText(g, '▶', tabX0 + tabsShown * (tabW + Lay.tabGap) - Lay.tabGap + 2, Lay.tabY + 4, COL.dim);
      // 단계 머리글과 범례
      drawText(g, `STAGE ${gr.no} · ${gr.name} · ${gr.size}`, Lay.left, Lay.headY, COL.text);
      let x = Lay.right;
      for (const [bmp, colors, label, oy] of [[LOCK, LOCK_COLORS, 'LOCKED', 0], [STAR, STAR_COLORS, 'PAR', -1], [CHECK, EMBLEM_COLORS, 'CLEAR', 0]]) {
        x -= measure(label);
        drawText(g, label, x, Lay.headY, COL.item);
        x -= bmp[0].length + 3;
        drawBitmap(g, bmp, colors, x, Lay.headY + oy);
        x -= 10;
      }
      fill(g, Lay.left, Lay.headY + 11, gridW, 1, COL.line);
      const focus = Menu.scene.items[Menu.scene.sel];
      if (focus?.kind === 'cell') drawTextCenter(g, stageDetail(gr.levels[focus.k]), CX, Lay.detailY, COL.sub);
      // 쪽 넘김 표시
      const ax = Lay.right + 2;
      if (page > 0) drawText(g, '↑', ax, Lay.gridTop, COL.dim);
      if (page < sh.pages - 1) drawText(g, '↓', ax, Lay.gridBottom - FONT.h, COL.dim);
      hint(HINT);
    },
    onPick: (act, it) => {
      if (act === 'back') return go('S1');
      if (it.kind === 'tab') {
        // 다른 단계 탭은 그 단계를 보이고, 보고 있는 탭은 칸으로 내려간다
        if (it.g !== st) return moveTo({ kind: 'tab', g: it.g });
        return moveTo({ kind: 'cell', k: firstOnPage() });
      }
      const i = Number(act);
      if (!Progress.isOpen(i)) return Menu.refuse(Progress.lockText(i));
      Progress.open(i);
      Play.load(i);
      go('S3');
    },
  });
};
