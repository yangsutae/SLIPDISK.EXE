// 게임 화면 그리기(canvas#board): 바닥·외곽 벽·벽·오브젝트·컴퓨터·잔상·문양. Board.draw(now, Play)가 매 프레임 그린다.
// 진행 상태는 play/session.js의 Play를 읽기만 한다. 그림은 gfx/sprites.js, 그리는 도구는 gfx/pixel.js에 있다.
//
// 픽셀 렌더 규칙
// - 칸 하나를 16×16 아트 픽셀로 보고, 아트 픽셀 한 칸을 정수배(s) 화면 픽셀로 그린다. 한 화면 안에서는 s가 하나다.
// - 크기 변형·회전·흐림을 쓰지 않는다. 움직임은 그림을 바꿔 끼우거나 아트 픽셀 단위로 옮기고, 상태는 색 묶음만 바꾼다.
// - 화면에 글자를 쓰지 않는다. 사건은 문양(EMBLEMS)으로 알리고, 컴퓨터는 모니터 캐릭터 정본(monitor)의 점 글자 얼굴이다.

const Board = (() => {
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const GRID = 16;

  // 캡슐(칸 안 (1,1)에 놓임) 둘레 한 칸. 흐림 대신 체크무늬로 번갈아 칠해 빛나는 느낌을 낸다.
  const PILL_GLOW = (() => {
    const cov = (x, y) => !!PILL[y - 1] && x >= 1 && x - 1 < PILL[0].length && PILL[y - 1][x - 1] !== '.';
    const cells = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (cov(x, y)) continue;
        let near = false;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) near = near || cov(x + i, y + j);
        if (near) cells.push([x, y]);
      }
    }
    return cells;
  })();

  function drawWall(x, y, w, h, s) {
    fill(ctx, x, y, w, h, '#555960');
    // 좌상단 밝은 경사면, 우하단 어두운 경사면 (두께 = 아트 픽셀 1칸)
    fill(ctx, x, y, w, s, '#777c86');
    fill(ctx, x, y, s, h, '#777c86');
    fill(ctx, x + s, y + h - s, w - s, s, '#363940');
    fill(ctx, x + w - s, y + s, s, h - s, '#363940');
  }

  function drawVaccine(gx, gy, s, t) {
    const y = gy + Math.round(Math.sin(t / 280)) * s; // 1픽셀 단위로 끊어 떠 있음
    const phase = Math.floor(t / 420) % 2;
    ctx.fillStyle = '#1d5a3a';
    for (const [x, yy] of PILL_GLOW) {
      if ((x + yy + phase) % 2 === 0) ctx.fillRect(gx + x * s, y + yy * s, s, s);
    }
    drawBitmap(ctx, PILL, PILL_COLORS, gx + s, y + s, s);
  }

  // 17×17 바이러스 바깥의 모서리 네 개. 남은 횟수만큼 좌상·우상·우하·좌하 순으로 켠다.
  function drawQuarantine(gx, gy, s, t, count) {
    const corners = [[-2, -2, 1, 1], [16, -2, -1, 1], [16, 16, -1, -1], [-2, 16, 1, -1]];
    corners.forEach(([x, y, dx, dy], i) => {
      const on = i < count && (count > 1 || Math.floor(t / 400) % 2 === 0);
      ctx.fillStyle = on ? '#2fbf71' : '#263d30';
      for (let d = 0; d < 4; d++) {
        ctx.fillRect(gx + (x + dx * d) * s, gy + y * s, s, s);
        if (d) ctx.fillRect(gx + x * s, gy + (y + dy * d) * s, s, s);
      }
    });
  }

  function drawVirus(gx, gy, s, t, superCount) {
    const powered = superCount > 0;
    drawBitmap(ctx, VIRUS[Math.floor(t / 240) % 2], powered ? VIRUS_POWERED : VIRUS_COLORS, gx - s, gy - s, s);
    if (powered) drawQuarantine(gx, gy, s, t, superCount);
  }

  // 컴퓨터: 모니터 캐릭터 정본(gfx/sprites.js의 monitor). 그림 중심을 칸 중심에 맞추고, 칸(16)보다 넓은 본체(19)는 칸 밖으로 넘긴다.
  // 남는 1칸은 오른쪽·아래로 둔다. 상태는 정본 README의 그리는 규칙을 따른다.
  //   얼굴 UwU, 마지막 이동 방향으로 1칸 / 저장 막대는 먹은 파일 비율 / 백신 효과 중 초록 테두리와 램프(1회 남으면 테두리 깜빡임)
  //   벽 충돌은 눌린 프레임(좌우 h, 상하 v) / 실패는 X(와 빨간 테두리가 0.5초마다 켜지고 꺼짐
  function drawComputer(gx, gy, s, t, p) {
    const { state, slide } = p;
    const [dx, dy] = DIRS[p.faceDir] || [0, 0];
    const o = { dx, dy };
    if (slide && slide.bumped) {
      const k = (t - slide.start) / slide.duration;
      if (k > 0.15 && k < 0.85) o.squash = slide.dir === 'L' || slide.dir === 'R' ? 'h' : 'v';
    }
    if (state.totalFiles > 0) o.save = (state.totalFiles - remaining(state.items).files) / state.totalFiles;
    if (state.status === 'dead') {
      const on = Math.floor(t / 500) % 2 === 0;
      Object.assign(o, { face: 'X(', color: on ? 'R' : 'r', ring: on ? 'R' : '' });
    } else if (state.super > 0) {
      o.leds = state.super;
      if (state.super > 1 || Math.floor(t / 400) % 2 === 0) o.ring = 'G';
    }
    const m = monitor(o);
    drawBitmap(ctx, m.rows, MON_COLORS, gx + Math.floor((GRID - m.W) / 2) * s, gy + Math.floor((GRID - m.H) / 2) * s, s);
  }

  // 바이러스 삭제: 조각 8개가 사방으로 흩어져 사라진다 (컴퓨터로 흡수하지 않음)
  function drawShatter(bx, by, s, age) {
    const d = 3 + Math.floor(age * 8);
    const size = age < 0.5 ? 2 : 1;
    VIRUS_DIRS.forEach(([ux, uy], i) => {
      fill(ctx, bx + (ux * d - (size >> 1)) * s, by + (uy * d - (size >> 1)) * s, size * s, size * s, i % 2 ? '#8a909a' : '#6e737c');
    });
  }

  function draw(now, p) {
    const { state, slide } = p;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const borderY = 14;
    const innerH = canvas.height - borderY * 2;
    const targetInnerW = Math.round(innerH * (state.w / state.h));
    const borderX = Math.max(borderY, Math.round((canvas.width - targetInnerW) / 2));
    const ox = borderX;
    const oy = borderY;
    const innerW = canvas.width - borderX * 2;
    const tw = innerW / state.w;
    const th = innerH / state.h;
    const tile = Math.min(tw, th);
    // 아트 픽셀 한 칸의 화면 크기. 칸에 16칸이 정수배로 들어가는 가장 큰 값이다.
    const s = Math.max(1, Math.floor(tile / GRID));
    const snap = v => Math.round(v / s) * s;
    // 칸 중심(cx, cy)에 놓을 16×16 그림의 왼쪽 위. 보드 원점 기준 아트 픽셀 격자에 맞춘다.
    const originOf = (cx, cy) => [ox + snap(cx - ox - 8 * s), oy + snap(cy - oy - 8 * s)];
    const cellOrigin = (x, y) => originOf(ox + (x + 0.5) * tw, oy + (y + 0.5) * th);

    // 미로 바닥 (자기 원판이 은은하게 비치는 먹색 바탕 + 점 격자)
    fill(ctx, ox, oy, innerW, innerH, 'rgba(28, 28, 31, 0.84)');

    // 맵 바깥쪽 외곽 벽 테두리 (상단바 추가 후 정사각형 타일 비율 유지를 위해 필요한 만큼 좌·우 두께 확장)
    outerWall(ctx, canvas.width, canvas.height, borderX, borderY, s);

    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        const x0 = ox + Math.round(x * tw);
        const y0 = oy + Math.round(y * th);
        if (state.walls.has(key(x, y))) {
          drawWall(x0, y0, ox + Math.round((x + 1) * tw) - x0, oy + Math.round((y + 1) * th) - y0, s);
        } else {
          const [gx, gy] = cellOrigin(x, y);
          fill(ctx, gx + 8 * s, gy + 8 * s, s, s, '#2c2d32');
        }
      }
    }

    // 미끄러지는 위치 보간 (사건은 Play.update가 이미 일으켰다)
    let px = state.player.x;
    let py = state.player.y;
    if (slide && slide.path.length > 0) {
      const len = slide.path.length;
      const dist = p.slideDist(now);
      const idx = Math.min(len - 1, Math.floor(dist));
      const frac = dist - idx;
      const p0 = idx === 0 ? slide.from : slide.path[idx - 1];
      const p1 = slide.path[idx];
      px = p0.x + (p1.x - p0.x) * frac;
      py = p0.y + (p1.y - p0.y) * frac;

      // 미끄러질 때 진행 방향 뒤로 점점 옅어지는 픽셀 블록 3개
      const [dx, dy] = DIRS[slide.dir];
      const [gx, gy] = cellOrigin(px, py);
      for (const [d, size, a] of [[10, 3, 0.45], [13, 2, 0.3], [15, 1, 0.18]]) {
        ctx.globalAlpha = a;
        const half = size >> 1;
        fill(ctx, gx + (8 - dx * d - half) * s, gy + (7 - dy * d - half) * s, size * s, size * s, '#ffa53d');
      }
      ctx.globalAlpha = 1;
    }

    // 오브젝트 (이동 중 state는 이동 전 상태라 아직 닿지 않은 오브젝트가 남아 있다)
    for (const [k, v] of state.items) {
      const [ix, iy] = k.split(',').map(Number);
      const [gx, gy] = cellOrigin(ix, iy);
      if (v === 'file') drawBitmap(ctx, FILE, FILE_COLORS, gx + 4 * s, gy + 3 * s, s);
      else if (v === 'vaccine') drawVaccine(gx, gy, s, now);
      else if (v === 'virus') drawVirus(gx, gy, s, now, state.super);
    }

    const [cgx, cgy] = cellOrigin(px, py);
    drawComputer(cgx, cgy, s, now, p);

    // 사건 문양: 첫 프레임은 밝은 테두리를 두르고 찍힌 뒤, 머물렀다가 깜빡이며 사라진다
    for (const pop of p.popups) {
      const age = (now - pop.born) / POP_MS;
      const cx = ox + (pop.x + 0.5) * tw;
      const cy = oy + (pop.y + 0.5) * th;
      if (pop.kind === 'shatter') {
        const [gx, gy] = originOf(cx, cy);
        drawShatter(gx + 8 * s, gy + 8 * s, s, age);
        continue;
      }
      if (age > 0.65 && Math.floor((now - pop.born) / 60) % 2) continue;
      const { normal, flash } = EMBLEMS[pop.kind];
      const isBump = pop.kind === 'bump';
      // 충돌 문양은 선이 성겨 밝은 테두리가 지저분해지므로 찍히는 프레임을 쓰지 않는다
      const bmp = !isBump && now - pop.born < 70 ? flash : normal;
      // 충돌 문양은 부딪힌 벽 쪽 칸 경계 너머에, 나머지는 칸 위쪽에 놓고 아트 픽셀 단위로 2칸 떠오른다
      const [dx, dy] = isBump ? DIRS[pop.dir] : [0, 0];
      const ex = cx + dx * 11 * s;
      const ey = cy + (isBump ? dy * 11 : -5 - Math.min(2, Math.floor(age * 6))) * s;
      const gx = ox + snap(ex - ox - (bmp[0].length * s) / 2);
      const gy = oy + snap(ey - oy - (bmp.length * s) / 2);
      drawBitmap(ctx, bmp, EMBLEM_COLORS, gx, gy, s);
    }
  }

  return {
    draw,
    show(on) {
      canvas.style.display = on ? '' : 'none';
    },
  };
})();
