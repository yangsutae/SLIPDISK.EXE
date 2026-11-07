// 캔버스 밖 요소: 셔터 라벨, 셔터 창 HUD, 하단 입력바(방향 줄, ⌫ 키, ENTER 키. 정본 디자인/에셋/입력바/).
// 화면이 바뀌어도 그 자리에 두고 내용만 바꾼다(IA 캔버스 밖 요소 표). 창 밖 하드웨어라 픽셀로 그리지 않는다.

const Shell = (() => {
  const $ = id => document.getElementById(id);
  const labelTitle = $('label-title');
  const hudEl = $('hud');
  const queueEl = $('queue');
  const keys = { back: $('btn-back'), enter: $('btn-enter') };
  const DEG = { U: 0, R: 90, D: 180, L: -90 };

  // rows: [[class, 이름, 값], ...]. 줄이 4개보다 적으면 위에서부터 붙여 쓴다
  function hud(rows) {
    hudEl.classList.toggle('few', rows.length < 4);
    hudEl.innerHTML = rows
      .map(([cls, name, value]) => `<div class="hud-row ${cls}"><span>${name}</span><b>${value}</b></div>`)
      .join('');
  }

  const arrow = (d, cls = '') => `
    <svg class="deboss-item ${cls}" viewBox="0 0 46 46" aria-hidden="true">
      <g filter="url(#true-deboss)">
        <use href="#stamped-arrow" fill="#20232b" transform="rotate(${DEG[d]} 23 23)"/>
      </g>
    </svg>`;
  const CURSOR = `
    <svg class="deboss-item deboss-cursor" viewBox="0 0 46 46" aria-hidden="true">
      <g filter="url(#true-deboss)">
        <rect x="10" y="35" width="26" height="3.5" rx="1.2" fill="#20232b"/>
      </g>
    </svg>`;

  return {
    keys,

    label(sub) {
      labelTitle.innerHTML = sub ? `SLIPDISK.EXE<small>- ${sub}</small>` : 'SLIPDISK.EXE';
    },
    hud,
    // 스테이지 선택·전체 클리어: 클리어 수와 최단 달성 수
    menuHud() {
      hud([['', 'CLEARED', `${Progress.countClear()}/${CATALOG.levels.length}`], ['best', 'PAR', Progress.countPar()]]);
    },
    // 플레이·결과·일시정지: 남은 파일·바이러스, 백신 효과 남은 횟수, 최단/최고 기록
    playHud(i, state) {
      const left = remaining(state.items);
      hud([
        ['file', 'FILES', left.files],
        ['virus', 'VIRUSES', left.viruses],
        ['vaccine', 'VACCINE', state.super > 0 ? state.super : '-'],
        ['best', 'PAR/BEST', `${CATALOG.levels[i].par ?? '?'}/${Progress.best(i) ?? '-'}`],
      ]);
    },

    // 방향 줄. stepIdx가 숫자면 실행 중 표시(지난 입력은 옅게, 지금 입력은 앰버)를 하고 다음 입력 자리(_)를 뺀다
    queue(dirs = [], stepIdx = null) {
      const running = stepIdx !== null;
      queueEl.innerHTML = [...dirs]
        .map((d, i) => arrow(d, running ? (i < stepIdx ? 'done' : i === stepIdx ? 'cur' : '') : ''))
        .join('') + (running ? '' : CURSOR);
      queueEl.scrollLeft = queueEl.scrollWidth;
    },

    // 키보드로 누르거나 메뉴 항목을 골라도 화면의 키가 0.11초 눌린 모습을 보인다. name: 'back' | 'enter'
    press(name) {
      keys[name].classList.add('pressed');
      setTimeout(() => keys[name].classList.remove('pressed'), 110);
    },
  };
})();
