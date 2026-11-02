// 게임 진행: 화면 맞춤, 레벨 불러오기, 입력 큐와 실행, HUD·결과 오버레이, 키보드·버튼 입력.

const stage = document.querySelector('.stage');
const fit = () => {
  stage.style.scale = Math.min(innerWidth / 1080, innerHeight / 1080);
};
addEventListener('resize', fit);
fit();

const DEG = { U: 0, R: 90, D: 180, L: -90 };
const TILE_MS = 68;
const POP_MS = 680;

// 형식이 틀린 레벨은 콘솔에 이유를 남기고 목록에서 뺀다.
const levels = LEVELS.filter(lv => {
  const errors = validateLevel(lv);
  if (errors.length) console.error(`레벨 ${lv.id ?? '?'} 제외: ${errors.join(', ')}`);
  return errors.length === 0;
});

const optimal = levels.map(lv => solve(lv));
const bestMoves = new Array(levels.length).fill(null);
const wellEl = document.getElementById('queue-well');
const uploadBtn = document.getElementById('btn-upload');
const labelTitle = document.getElementById('label-title');
const levelSelect = document.getElementById('level-select');
const btnPrev = document.getElementById('btn-prev');
const btnNextLv = document.getElementById('btn-next-lv');
const hudFile = document.getElementById('hud-file');
const hudVirus = document.getElementById('hud-virus');
const hudVaccine = document.getElementById('hud-vaccine');
const hudBest = document.getElementById('hud-best');
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ov-title');
const ovSub = document.getElementById('ov-sub');
const ovRetry = document.getElementById('ov-retry');
const ovNext = document.getElementById('ov-next');

let levelIdx = 0;
let state = null;
let queue = [];
let running = false;
let stepIdx = -1;
let runTimer = null;
let slide = null;
let popups = [];
let faceDir = 'R';
let eatFlashUntil = 0;

levels.forEach((lv, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = `${lv.id} ${lv.name}`;
  levelSelect.appendChild(opt);
});

function spawnPopup(x, y, text, color) {
  popups.push({ x, y, text, color, born: performance.now() });
}

function updateHud() {
  const lv = levels[levelIdx];
  labelTitle.innerHTML = `SLIPDISK.EXE<small>- ${lv.id} ${lv.name}</small>`;
  levelSelect.value = levelIdx;
  btnPrev.disabled = running || levelIdx === 0;
  btnNextLv.disabled = running || levelIdx === levels.length - 1;
  levelSelect.disabled = running;

  const left = remaining(state.items);
  hudFile.textContent = left.files;
  hudVirus.textContent = left.viruses;
  hudVaccine.textContent = state.super > 0 ? `${state.super}회` : '-';
  const par = optimal[levelIdx] ? optimal[levelIdx].length : '?';
  const best = bestMoves[levelIdx] ?? '-';
  hudBest.textContent = `${par}/${best}`;
}

function renderQueue() {
  const arrowsHtml = queue
    .map((d, i) => {
      const cls = running ? (i < stepIdx ? 'done' : i === stepIdx ? 'cur' : '') : '';
      return `
      <svg class="deboss-item ${cls}" viewBox="0 0 46 46" aria-hidden="true">
        <g filter="url(#true-deboss)">
          <use href="#stamped-arrow" fill="#20232b" transform="rotate(${DEG[d]} 23 23)"/>
        </g>
      </svg>`;
    })
    .join('');

  const cursorHtml = running ? '' : `
    <svg class="deboss-item deboss-cursor" viewBox="0 0 46 46" aria-hidden="true">
      <g filter="url(#true-deboss)">
        <rect x="10" y="35" width="26" height="3.5" rx="1.2" fill="#20232b"/>
      </g>
    </svg>`;

  wellEl.innerHTML = arrowsHtml + cursorHtml;
  wellEl.scrollLeft = wellEl.scrollWidth;
}

function loadLevel(idx, keepQueue = false) {
  clearTimeout(runTimer);
  running = false;
  stepIdx = -1;
  slide = null;
  popups = [];
  levelIdx = idx;
  state = parseLevel(levels[idx]);
  if (!keepQueue) queue = [];
  overlay.classList.remove('show');
  renderQueue();
  updateHud();
}

function finishRun() {
  running = false;
  slide = null;
  renderQueue();
  updateHud();
  overlay.classList.add('show');
  const isClear = state.status === 'clear';
  ovTitle.className = isClear ? 'ok' : 'fail';
  ovNext.style.display = (isClear && levelIdx < levels.length - 1) ? 'inline-block' : 'none';

  if (isClear) {
    const used = stepIdx + 1;
    const par = optimal[levelIdx] ? optimal[levelIdx].length : null;
    const prev = bestMoves[levelIdx];
    bestMoves[levelIdx] = prev === null ? used : Math.min(prev, used);
    updateHud();
    ovTitle.textContent = `${levels[levelIdx].id} ${levels[levelIdx].name} 클리어!`;
    const parts = [`이동 ${used}회`];
    if (par !== null) parts.push(`최단 ${par}회`);
    parts.push(`최고 기록 ${bestMoves[levelIdx]}회`);
    ovSub.textContent = parts.join(' · ');
  } else if (state.status === 'dead') {
    ovTitle.textContent = '바이러스에 감염됐습니다';
    ovSub.textContent = '바이러스는 백신을 먹은 뒤 4번 이동 안에만 먹을 수 있습니다';
  } else {
    const left = remaining(state.items);
    ovTitle.textContent = '남은 대상이 있습니다';
    ovSub.textContent = `파일 ${left.files}개 · 바이러스 ${left.viruses}개가 남았습니다`;
  }
}

function runStep() {
  stepIdx++;
  if (stepIdx >= queue.length || state.status !== 'play') {
    finishRun();
    return;
  }
  const dir = queue[stepIdx];
  faceDir = dir;
  const prevPlayer = { ...state.player };
  const { state: next, events, path } = step(state, dir);
  const now = performance.now();
  const duration = Math.max(110, path.length * TILE_MS);

  slide = {
    dir,
    from: prevPlayer,
    path,
    events,
    fired: new Set(),
    start: now,
    duration,
    bumped: path.length === 0,
  };
  state = next;
  renderQueue();
  updateHud();

  runTimer = setTimeout(() => {
    slide = null;
    if (state.status !== 'play') finishRun();
    else runStep();
  }, duration + 45);
}

function startRun() {
  if (running || queue.length === 0) return;
  uploadBtn.classList.add('pressed');
  setTimeout(() => uploadBtn.classList.remove('pressed'), 140);
  loadLevel(levelIdx, true);
  running = true;
  stepIdx = -1;
  renderQueue();
  updateHud();
  runStep();
}

function fireEvent(ev) {
  if (ev.type === 'file') {
    eatFlashUntil = performance.now() + 220;
    spawnPopup(ev.x, ev.y, '+1', '#aeb4be');
  } else if (ev.type === 'vaccine') {
    eatFlashUntil = performance.now() + 260;
    spawnPopup(ev.x, ev.y, '백신!', '#2fbf71');
  } else if (ev.type === 'eat') {
    eatFlashUntil = performance.now() + 260;
    spawnPopup(ev.x, ev.y, '치료!', '#2fbf71');
  } else if (ev.type === 'die') {
    spawnPopup(ev.x, ev.y, '감염!', '#d6336c');
  } else if (ev.type === 'bump') {
    spawnPopup(ev.x, ev.y, '쿵', '#8b93a6');
  }
}

uploadBtn.addEventListener('click', startRun);
wellEl.addEventListener('click', () => {
  if (!running && queue.length > 0) {
    queue.pop();
    renderQueue();
  }
});
levelSelect.addEventListener('change', () => loadLevel(Number(levelSelect.value)));
btnPrev.addEventListener('click', () => { if (levelIdx > 0) loadLevel(levelIdx - 1); });
btnNextLv.addEventListener('click', () => { if (levelIdx < levels.length - 1) loadLevel(levelIdx + 1); });
ovRetry.addEventListener('click', () => loadLevel(levelIdx, true));
ovNext.addEventListener('click', () => {
  if (levelIdx < levels.length - 1) loadLevel(levelIdx + 1);
});

addEventListener('keydown', (e) => {
  const map = {
    ArrowUp: 'U', KeyW: 'U',
    ArrowRight: 'R', KeyD: 'R',
    ArrowDown: 'D', KeyS: 'D',
    ArrowLeft: 'L', KeyA: 'L',
  };
  if (overlay.classList.contains('show')) {
    if (e.code === 'Enter') {
      e.preventDefault();
      if (state.status === 'clear' && levelIdx < levels.length - 1) loadLevel(levelIdx + 1);
      else loadLevel(levelIdx, true);
    } else if (e.code === 'KeyR' || e.code === 'Escape') {
      e.preventDefault();
      loadLevel(levelIdx, true);
    }
    return;
  }
  if (running) {
    if (e.code === 'Escape' || e.code === 'KeyR') {
      e.preventDefault();
      loadLevel(levelIdx, true);
    }
    return;
  }
  if (map[e.code]) {
    e.preventDefault();
    queue.push(map[e.code]);
    faceDir = map[e.code];
    renderQueue();
  } else if (e.code === 'Backspace' && queue.length > 0) {
    e.preventDefault();
    queue.pop();
    renderQueue();
  } else if (e.code === 'Escape' || e.code === 'KeyR') {
    e.preventDefault();
    loadLevel(levelIdx);
  } else if (e.code === 'BracketLeft' && levelIdx > 0) {
    e.preventDefault();
    loadLevel(levelIdx - 1);
  } else if (e.code === 'BracketRight' && levelIdx < levels.length - 1) {
    e.preventDefault();
    loadLevel(levelIdx + 1);
  } else if (e.code === 'Enter') {
    e.preventDefault();
    startRun();
  }
});

loadLevel(0);
requestAnimationFrame(render);
