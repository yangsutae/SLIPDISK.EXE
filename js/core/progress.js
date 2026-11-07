// 저장 데이터(IA 저장 데이터 절): 레벨별 최고 기록, 마지막으로 연 레벨, 전체 클리어 화면을 봤는지, 설정값.
// 브라우저 localStorage에 둔다. 기록은 레벨 id로 찾으므로 레벨을 끼워 넣거나 순서를 바꿔도 남는다.
// 해금: 단계 안은 순차라서 단계 첫 레벨, 클리어한 레벨, 클리어한 레벨 바로 다음 레벨이 열린다.
// 다음 단계의 첫 레벨은 앞 단계를 STAGE_GATE개(앞 단계 레벨이 그보다 적으면 전부) 클리어하면 열린다. 1단계 첫 레벨은 늘 열려 있다.
// 주소 끝에 #unlock을 붙여 열면 모든 레벨이 열린다. 테스트용이고 저장 데이터는 바꾸지 않는다.

const SPEEDS = [['SLOW', 100], ['NORMAL', 68], ['FAST', 40]]; // 실행 속도: 칸당 이동 시간(ms)
const STAGE_GATE = 10; // 다음 단계 첫 레벨을 여는 앞 단계 클리어 수

const Progress = (() => {
  const KEY = 'slipdisk.exe/save-v2'; // v1은 레벨 번호를 다시 매기기 전 기록이라 읽지 않는다
  const unlockAll = location.hash === '#unlock';
  const L = CATALOG.levels;
  const fresh = () => ({ best: {}, last: null, allClearSeen: false, speed: 1 });

  let data = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') data = { ...data, ...saved };
  } catch { /* 저장소를 못 쓰면 이번 실행 동안만 기억한다 */ }
  if (!data.best || typeof data.best !== 'object') data.best = {};
  if (!SPEEDS[data.speed]) data.speed = 1;

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch { /* 위와 같음 */ }
  };

  const best = i => data.best[L[i].id] ?? null;
  const isClear = i => best(i) !== null;
  const isPar = i => isClear(i) && L[i].par !== null && best(i) <= L[i].par;

  // 레벨 i가 열리려면 클리어해야 하는 것: 단계 안 앞 레벨(prev), 단계 첫 레벨이면 앞 단계와 그 수. 1단계 첫 레벨은 null
  function need(i) {
    const groups = CATALOG.groups;
    const s = groups.findIndex(gr => gr.levels.includes(i));
    const k = groups[s].levels.indexOf(i);
    if (k > 0) return { prev: groups[s].levels[k - 1] };
    if (s === 0) return null;
    const stage = groups[s - 1];
    return { stage, count: Math.min(STAGE_GATE, stage.levels.length) };
  }

  return {
    best,
    isClear,
    isPar,
    isOpen(i) {
      if (unlockAll || isClear(i)) return true;
      const n = need(i);
      if (!n) return true;
      return n.stage ? n.stage.levels.filter(isClear).length >= n.count : isClear(n.prev);
    },
    // 잠긴 레벨을 골랐을 때 알림 띠 문구
    lockText(i) {
      const n = need(i);
      return n?.stage ? `CLEAR ${n.count} LEVELS OF STAGE ${n.stage.no} FIRST` : 'CLEAR THE PREVIOUS LEVEL FIRST';
    },
    countClear: () => L.filter((_, i) => isClear(i)).length,
    countPar: () => L.filter((_, i) => isPar(i)).length,

    // 마지막으로 연 레벨 번호. 스테이지 선택 화면의 처음 커서 자리다. 저장된 id가 목록에 없으면 0
    get last() {
      return Math.max(0, L.findIndex(lv => lv.id === data.last));
    },
    open(i) {
      data.last = L[i].id;
      save();
    },
    record(i, moves) {
      const prev = best(i);
      data.best[L[i].id] = prev === null ? moves : Math.min(prev, moves);
      save();
    },

    get allClearSeen() {
      return data.allClearSeen;
    },
    seeAllClear() {
      data.allClearSeen = true;
      save();
    },

    get speed() {
      return data.speed;
    },
    set speed(v) {
      data.speed = v;
      save();
    },
    tileMs: () => SPEEDS[data.speed][1],

    // 기록 지우기: 클리어 표시·최고 기록·마지막 레벨·전체 클리어 여부를 지우고 설정은 남긴다
    wipe() {
      data = { ...fresh(), speed: data.speed };
      save();
    },
  };
})();
