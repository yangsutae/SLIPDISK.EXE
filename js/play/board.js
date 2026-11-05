// 게임 화면 그리기(canvas#board): 바닥·외곽 벽·벽·오브젝트·컴퓨터·잔상·문양. Board.draw(now, Play)가 매 프레임 그린다.
// 진행 상태는 play/session.js의 Play를 읽기만 한다. 그림은 gfx/sprites.js, 그리는 도구는 gfx/pixel.js에 있다.
//
// 픽셀 렌더 규칙
// - 칸 하나를 16×16 아트 픽셀로 보고, 아트 픽셀 한 칸을 정수배(s) 화면 픽셀로 그린다. 한 화면 안에서는 s가 하나다.
// - 크기 변형·회전·흐림을 쓰지 않는다. 움직임은 그림을 바꿔 끼우거나 아트 픽셀 단위로 옮기고, 상태는 색 묶음만 바꾼다.
// - 화면에 글자를 쓰지 않는다. 사건은 문양(EMBLEMS)으로, 얼굴은 점으로 찍은 비트맵(FACES)으로 그린다.

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

  // 컴퓨터 얼굴: 앰버 점으로 찍은 아스키 얼굴. 상황별 표정은 옆으로 누운 글자 그대로다.
  // craftsman: 모니터 캐릭터 정본(A안, 표정 UwU·X(만)은 아직 옮기지 않았다. 운영/ToDo의 "모니터 캐릭터 에셋 반영"에서 바꾼다.
  const FACES = {
    'UwU': ['#.#.....#.#', '#.#.....#.#', '.#.......#.', '...#.#.#...', '....#.#....'],
    ':O': ['..###', '#.#.#', '..#.#', '#.#.#', '..###'],
    ':D': ['..##.', '#.#.#', '..#.#', '#.#.#', '..##.'],
    'B)': ['##..#.', '#.#..#', '##...#', '#.#..#', '##..#.'],
    'X(': ['#.#..#', '#.#.#.', '.#..#.', '#.#.#.', '#.#..#'],
    'XD': ['#.#.##.', '#.#.#.#', '.#..#.#', '#.#.#.#', '#.#.##.'],
  };
  const FACE_COLORS = { '#': '#ffa53d' };

  const MON = {
    body: '#d8cfb8', light: '#efe8d6', shade: '#b5ac96', stand: '#9a917c',
    screen: '#101113', track: '#2c2d32', amber: '#ffa53d', green: '#2fbf71', pipOff: '#1d4a32',
  };

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

  // 백신 효과 중 격리 테두리: 칸 둘레를 도는 점선(2칸 켜고 2칸 끔)
  function drawAnts(gx, gy, s, t) {
    const off = Math.floor(t / 110);
    ctx.fillStyle = '#2fbf71';
    for (let i = 0; i < 60; i++) {
      if ((i + off) % 4 >= 2) continue;
      const [x, y] = i < 15 ? [i, 0] : i < 30 ? [15, i - 15] : i < 45 ? [45 - i, 15] : [0, 60 - i];
      ctx.fillRect(gx + x * s, gy + y * s, s, s);
    }
  }

  function drawVirus(gx, gy, s, t, superCount) {
    const powered = superCount > 0;
    // 효과가 1회 남으면 격리 테두리가 깜빡임
    if (powered && (superCount > 1 || Math.floor(t / 140) % 2 === 0)) drawAnts(gx, gy, s, t);
    drawBitmap(ctx, VIRUS[Math.floor(t / 240) % 2], powered ? VIRUS_POWERED : VIRUS_COLORS, gx - s, gy - s, s);
  }

  function drawComputer(gx, gy, s, t, p) {
    const { state, slide } = p;
    const rect = (x, y, w, h, c) => fill(ctx, gx + x * s, gy + y * s, w * s, h * s, c);

    // 벽에 부딪히면 눌린 그림으로 바꿔 끼운다 (크기 변형 대신 아트 픽셀 단위 프레임)
    let W = 16, H = 13;
    if (slide && slide.bumped) {
      const k = (t - slide.start) / slide.duration;
      if (k > 0.15 && k < 0.85) {
        if (slide.dir === 'L' || slide.dir === 'R') { W = 14; H = 14; }
        else { W = 18; H = 11; }
      }
    }
    const L = (16 - W) / 2;
    const T = 13 - H;

    // 받침
    rect(5, 13, 6, 1, OUTLINE);
    rect(6, 13, 4, 1, MON.stand);
    rect(3, 14, 10, 1, OUTLINE);
    rect(4, 14, 8, 1, MON.shade);
    rect(4, 15, 8, 1, OUTLINE);

    // 베이지 브라운관 모니터 본체 (모서리 1픽셀 깎음)
    rect(L + 1, T, W - 2, H, OUTLINE);
    rect(L, T + 1, W, H - 2, OUTLINE);
    rect(L + 1, T + 1, W - 2, H - 2, MON.body);
    rect(L + 1, T + 1, W - 2, 1, MON.light);
    rect(L + 1, T + 1, 1, H - 2, MON.light);
    rect(L + W - 2, T + 2, 1, H - 3, MON.shade);
    rect(L + 2, T + H - 2, W - 3, 1, MON.shade);

    // 먹색 화면
    const sx = L + 2, sy = T + 2, sw = W - 4, sh = H - 6;
    rect(sx, sy, sw, sh, MON.screen);

    // 실패: 화면 노이즈
    if (state.status === 'dead') {
      const f = Math.floor(t / 70);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const h = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + f * 37.719) * 43758.5453;
          const r = h - Math.floor(h);
          if (r < 0.28) rect(sx + x, sy + y, 1, 1, r < 0.1 ? '#d6336c' : '#3a3d44');
        }
      }
    }

    // 아스키 얼굴 결정 (기본은 UwU)
    let face = 'UwU';
    if (state.status === 'dead') face = 'X(';
    else if (state.status === 'clear') face = 'XD';
    else if (t < p.eatFlashUntil) face = p.flashFace;
    else if (slide) face = ':O'; // 미끄러지는 중과 벽 충돌
    else if (state.super > 0) face = 'B)';

    const powered = state.super > 0;
    const bmp = FACES[face];
    const fw = bmp[0].length, fh = bmp.length;
    const [dx, dy] = DIRS[p.faceDir] || [0, 0];
    // 마지막 이동 방향으로 1픽셀 치우치되 화면 밖으로 나가지 않는다. 효과 중에는 위 두 줄을 남은 횟수 칸에 내준다.
    const fx = sx + clamp(Math.floor((sw - fw) / 2) + dx, 0, sw - fw);
    const fy = sy + clamp(Math.floor((sh - fh) / 2) + dy, powered && sh - fh >= 2 ? 2 : 0, sh - fh);
    drawBitmap(ctx, bmp, FACE_COLORS, gx + fx * s, gy + fy * s, s);

    // 백신 효과 중: 화면 테두리 초록, 화면 위 오른쪽에 남은 횟수 초록 칸 4개 (1회 남으면 깜빡임)
    // 칸은 테두리와 붙어 보이지 않게 위·오른쪽으로 한 칸씩 띄운다
    if (powered) {
      const on = state.super > 1 || Math.floor(t / 140) % 2 === 0;
      for (let i = 0; i < SUPER_MOVES; i++) {
        rect(sx + sw - 2 - (SUPER_MOVES - 1 - i) * 2, sy + 1, 1, 1, i < state.super && on ? MON.green : MON.pipOff);
      }
      if (on) {
        rect(sx - 1, sy - 1, sw + 2, 1, MON.green);
        rect(sx - 1, sy + sh, sw + 2, 1, MON.green);
        rect(sx - 1, sy, 1, sh, MON.green);
        rect(sx + sw, sy, 1, sh, MON.green);
      }
    }

    // 파일 저장 막대 (화면 아래 턱)
    if (state.totalFiles > 0) {
      const bw = W - 6;
      const done = Math.round(bw * (state.totalFiles - remaining(state.items).files) / state.totalFiles);
      rect(L + 3, T + H - 3, bw, 1, MON.track);
      if (done > 0) rect(L + 3, T + H - 3, done, 1, MON.amber);
    }
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
