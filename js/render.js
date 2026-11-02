// 캔버스 그리기: 벽·오브젝트·컴퓨터·외곽 벽과 매 프레임 render.
// game.js의 진행 상태(state, slide, popups, faceDir, eatFlashUntil)와 fireEvent를 읽는다.

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function drawWall(x, y, tw, th) {
  const b = Math.max(2, Math.round(Math.min(tw, th) * 0.09));
  ctx.fillStyle = '#555960';
  ctx.fillRect(x + 1, y + 1, tw - 2, th - 2);
  // 좌상단 밝은 입체 경사면
  ctx.fillStyle = '#777c86';
  ctx.fillRect(x + 1, y + 1, tw - 2, b);
  ctx.fillRect(x + 1, y + 1, b, th - 2);
  // 우하단 어두운 입체 경사면
  ctx.fillStyle = '#363940';
  ctx.fillRect(x + 1, y + th - 1 - b, tw - 2, b);
  ctx.fillRect(x + tw - 1 - b, y + 1, b, th - 2);
  ctx.strokeStyle = '#17191f';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
}

function drawFile(cx, cy, tile) {
  const w = tile * 0.34;
  const h = tile * 0.42;
  const fold = w * 0.32;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w, y + fold);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = '#aeb4be';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + w - fold, y);
  ctx.lineTo(x + w - fold, y + fold);
  ctx.lineTo(x + w, y + fold);
  ctx.closePath();
  ctx.fillStyle = '#7c828d';
  ctx.fill();

  ctx.fillStyle = '#6b717b';
  const lw = w * 0.58;
  const lh = Math.max(1.5, tile * 0.04);
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + w * 0.2, y + fold + 3 + i * (lh + 2.5), lw, lh);
  }
}

function drawVaccine(cx, cy, tile, t) {
  const bob = Math.sin(t / 280) * (tile * 0.05);
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.rotate(-Math.PI / 4);

  // 은은한 초록 발광
  ctx.shadowColor = 'rgba(47, 191, 113, 0.55)';
  ctx.shadowBlur = 8;

  const bw = tile * 0.22;
  const bh = tile * 0.48;
  // 주사기 통
  ctx.fillStyle = '#1f2924';
  ctx.strokeStyle = '#d9f2e4';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

  // 초록 약액
  ctx.fillStyle = '#2fbf71';
  ctx.fillRect(-bw / 2 + 1.5, -bh * 0.1, bw - 3, bh * 0.56);

  // 플런저(밀대)와 바늘
  ctx.strokeStyle = '#d9f2e4';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, bh / 2);
  ctx.lineTo(0, bh / 2 + tile * 0.14);
  ctx.moveTo(-bw * 0.45, bh / 2 + tile * 0.14);
  ctx.lineTo(bw * 0.45, bh / 2 + tile * 0.14);
  ctx.moveTo(0, -bh / 2);
  ctx.lineTo(0, -bh / 2 - tile * 0.18);
  ctx.stroke();
  ctx.restore();
}

function drawVirus(cx, cy, tile, t, superCount) {
  const powered = superCount > 0;
  const r = tile * 0.27;
  ctx.save();
  ctx.translate(cx, cy);

  // 짧은 돌기 8개 꿈틀거림
  const spikes = 8;
  ctx.fillStyle = powered ? '#6e737c' : '#d6336c';
  for (let i = 0; i < spikes; i++) {
    const ang = (i * Math.PI * 2) / spikes + Math.sin(t / 240 + i) * 0.08;
    const sr = r + tile * 0.09 + Math.sin(t / 180 + i * 2) * (tile * 0.02);
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * sr * 0.78, Math.sin(ang) * sr * 0.78, tile * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 날카로운 눈
  ctx.fillStyle = '#101113';
  const ew = r * 0.36;
  ctx.fillRect(-r * 0.48, -r * 0.18, ew, Math.max(2, r * 0.22));
  ctx.fillRect(r * 0.12, -r * 0.18, ew, Math.max(2, r * 0.22));

  // 백신 효과 중: 초록 점선 격리 테두리 (1회 남으면 깜빡임)
  if (powered && (superCount > 1 || Math.floor(t / 140) % 2 === 0)) {
    ctx.strokeStyle = '#2fbf71';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, r + tile * 0.13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawComputer(cx, cy, tile, t) {
  let sx = 1, sy = 1;
  if (slide && slide.bumped) {
    const p = Math.min(1, (t - slide.start) / slide.duration);
    const sq = Math.sin(p * Math.PI) * 0.18;
    if (slide.dir === 'L' || slide.dir === 'R') { sx = 1 - sq; sy = 1 + sq * 0.7; }
    else { sy = 1 - sq; sx = 1 + sq * 0.7; }
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);

  const w = tile * 0.76;
  const h = tile * 0.68;
  // 베이지 브라운관 모니터 본체
  ctx.fillStyle = '#d8cfb8';
  ctx.strokeStyle = '#2e2618';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2 - 2, w, h, 5);
  ctx.fill();
  ctx.stroke();

  // 모니터 받침턱
  ctx.fillStyle = '#b5ac96';
  ctx.fillRect(-w * 0.28, h / 2 - 2, w * 0.56, 4);

  // 먹색 브라운관 화면
  const sw = w * 0.78;
  const sh = h * 0.72;
  ctx.fillStyle = '#101113';
  ctx.fillRect(-sw / 2, -sh / 2 - 2, sw, sh);

  // 백신 효과 중 화면 테두리 초록 점등 (1회 남으면 깜빡임)
  if (state.super > 0 && (state.super > 1 || Math.floor(t / 140) % 2 === 0)) {
    ctx.strokeStyle = '#2fbf71';
    ctx.lineWidth = 2;
    ctx.strokeRect(-sw / 2, -sh / 2 - 2, sw, sh);
    ctx.fillStyle = '#2fbf71';
    ctx.font = `700 ${Math.max(8, Math.round(tile * 0.19))}px Consolas, monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(String(state.super), sw / 2 - 2, -sh / 2 - 1);
  }

  // 파일 수집 저장 막대 (화면 하단)
  if (state.totalFiles > 0) {
    const leftFiles = remaining(state.items).files;
    const ratio = (state.totalFiles - leftFiles) / state.totalFiles;
    ctx.fillStyle = '#2c2d32';
    ctx.fillRect(-sw / 2 + 2, sh / 2 - 5, sw - 4, 2.5);
    ctx.fillStyle = '#ffa53d';
    ctx.fillRect(-sw / 2 + 2, sh / 2 - 5, (sw - 4) * ratio, 2.5);
  }

  // 실패 시 노이즈 연출
  if (state.status === 'dead') {
    ctx.fillStyle = 'rgba(214, 51, 108, 0.35)';
    ctx.fillRect(-sw / 2, -sh / 2 - 2 + ((t / 25) % sh), sw, 2.5);
  }

  // 아스키 얼굴 결정 (기본은 UwU, 상황별 표정은 옆으로 누운 글자 그대로 사용)
  let face = 'UwU';
  if (state.status === 'dead') face = 'X(';
  else if (state.status === 'clear') face = 'XD';
  else if (t < eatFlashUntil) face = ':D';
  else if (slide && !slide.bumped) face = ':O';
  else if (state.super > 0) face = 'B)';

  const [dx, dy] = DIRS[faceDir] || [0, 0];
  const ox = dx * (tile * 0.04);
  const oy = dy * (tile * 0.04);
  ctx.fillStyle = '#ffa53d';
  ctx.font = `700 ${Math.max(10, Math.round(tile * 0.27))}px Consolas, "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(face, ox, oy - 2);

  ctx.restore();
}

function drawOuterWall(W, H, tx, ty) {
  const b = 3;
  // 외곽 벽 본체 (상·하: ty 두께, 좌·우: tx 두께)
  ctx.fillStyle = '#555960';
  ctx.fillRect(0, 0, W, ty);
  ctx.fillRect(0, H - ty, W, ty);
  ctx.fillRect(0, ty, tx, H - ty * 2);
  ctx.fillRect(W - tx, ty, tx, H - ty * 2);

  // 바깥쪽 좌·상단 밝은 경사면과 우·하단 어두운 경사면
  ctx.fillStyle = '#777c86';
  ctx.fillRect(1, 1, W - 2, b);
  ctx.fillRect(1, 1, b, H - 2);
  ctx.fillStyle = '#363940';
  ctx.fillRect(1, H - 1 - b, W - 2, b);
  ctx.fillRect(W - 1 - b, 1, b, H - 2);

  // 안쪽(플레이 영역과 맞닿는 면): 상·좌측은 어두운 턱, 하·우측은 밝은 턱
  ctx.fillStyle = '#363940';
  ctx.fillRect(tx - b, ty - b, W - (tx - b) * 2, b);
  ctx.fillRect(tx - b, ty - b, b, H - (ty - b) * 2);
  ctx.fillStyle = '#777c86';
  ctx.fillRect(tx, H - ty, W - tx * 2, b);
  ctx.fillRect(W - tx, ty, b, H - ty * 2);

  // 바깥·안쪽 윤곽선
  ctx.strokeStyle = '#17191f';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  ctx.strokeRect(tx - 0.5, ty - 0.5, W - tx * 2 + 1, H - ty * 2 + 1);
}

function render(now) {
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

  // 미로 바닥 (자기 원판이 은은하게 비치는 먹색 바탕 + 점 격자)
  ctx.fillStyle = 'rgba(28, 28, 31, 0.84)';
  ctx.fillRect(ox, oy, innerW, innerH);

  // 맵 바깥쪽 외곽 벽 테두리 (상단바 추가 후 정사각형 타일 비율 유지를 위해 필요한 만큼 좌·우 두께 확장)
  drawOuterWall(canvas.width, canvas.height, borderX, borderY);

  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      const tx = ox + x * tw;
      const ty = oy + y * th;
      if (state.walls.has(key(x, y))) {
        drawWall(tx, ty, tw, th);
      } else {
        ctx.fillStyle = '#2c2d32';
        ctx.fillRect(tx + tw / 2 - 1, ty + th / 2 - 1, 2, 2);
      }
    }
  }

  // 슬라이드 보간 및 이벤트 발생 위치 계산
  let px = state.player.x;
  let py = state.player.y;
  const hiddenItems = new Set();
  if (slide) {
    // rAF 시각이 slide.start(performance.now())보다 앞설 수 있어 0 아래를 자른다. 음수면 path[-1]을 읽어 그리기 루프가 멈춘다.
    const p = Math.max(0, Math.min(1, (now - slide.start) / slide.duration));
    const len = slide.path.length;
    const dist = p * len;
    for (const ev of slide.events) {
      if (dist >= ev.at && !slide.fired.has(ev)) {
        slide.fired.add(ev);
        fireEvent(ev);
      } else if (dist < ev.at && (ev.type === 'file' || ev.type === 'vaccine' || ev.type === 'eat')) {
        hiddenItems.add(key(ev.x, ev.y));
      }
    }
    if (len > 0) {
      const idx = Math.min(len - 1, Math.floor(dist));
      const frac = dist - idx;
      const p0 = idx === 0 ? slide.from : slide.path[idx - 1];
      const p1 = slide.path[idx];
      px = p0.x + (p1.x - p0.x) * frac;
      py = p0.y + (p1.y - p0.y) * frac;

      // 미끄러질 때 진행 방향 뒤로 짧은 잔상 선
      const [dx, dy] = DIRS[slide.dir];
      const cx = ox + (px + 0.5) * tw;
      const cy = oy + (py + 0.5) * th;
      ctx.strokeStyle = 'rgba(255, 165, 61, 0.36)';
      ctx.lineWidth = tile * 0.16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - dx * tw * 0.55, cy - dy * th * 0.55);
      ctx.stroke();
    }
  }

  // 오브젝트 렌더링 (실행 중 아직 도달 전인 아이템도 원래 위치에 표시)
  const drawMap = new Map(state.items);
  if (slide) {
    for (const ev of slide.events) {
      const k = key(ev.x, ev.y);
      if (hiddenItems.has(k)) {
        if (ev.type === 'file') drawMap.set(k, 'file');
        else if (ev.type === 'vaccine') drawMap.set(k, 'vaccine');
        else if (ev.type === 'virus') drawMap.set(k, 'virus');
        else if (ev.type === 'eat') drawMap.set(k, 'virus');
      }
    }
  }

  for (const [k, v] of drawMap) {
    const [ix, iy] = k.split(',').map(Number);
    const cx = ox + (ix + 0.5) * tw;
    const cy = oy + (iy + 0.5) * th;
    if (v === 'file') drawFile(cx, cy, tile);
    else if (v === 'vaccine') drawVaccine(cx, cy, tile, now);
    else if (v === 'virus') drawVirus(cx, cy, tile, now, state.super);
  }

  drawComputer(ox + (px + 0.5) * tw, oy + (py + 0.5) * th, tile, now);

  // 팝업 문구 ('+1', '백신!', '치료!', '감염!', '쿵')
  popups = popups.filter(pop => now - pop.born < POP_MS);
  for (const pop of popups) {
    const age = (now - pop.born) / POP_MS;
    ctx.save();
    ctx.globalAlpha = 1 - age;
    ctx.font = `800 ${Math.max(12, Math.round(tile * 0.34))}px "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0c0d10';
    const tx = ox + (pop.x + 0.5) * tw;
    const ty = oy + (pop.y + 0.2 - age * 0.45) * th;
    ctx.fillText(pop.text, tx + 1.5, ty + 1.5);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, tx, ty);
    ctx.restore();
  }

  requestAnimationFrame(render);
}
