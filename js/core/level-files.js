// 레벨 파일 불러오기: data/stages.js 목차의 id마다 data/levels/<id>.js를 <script>로 불러온다.
// 서버 없이 파일로 열어도 동작한다(브라우저가 폴더 목록을 읽지 못해 목차가 필요하다).
// 레벨 파일은 defineLevel({ ... })을 부르고, 불러온 정의는 LEVEL_DEFS[id]에 모인다.

const LEVEL_DIR = 'data/levels/';
const LEVEL_DEFS = {};

function defineLevel(lv) {
  const file = document.currentScript?.dataset.level;
  if (file && lv.id !== file) console.error(`레벨 파일 ${file}.js의 id가 '${lv.id}'라 파일 이름과 다름`);
  else LEVEL_DEFS[lv.id] = lv;
}

// 목차의 모든 레벨 파일을 불러온다. 없는 파일은 콘솔에 남기고 넘어간다(그 레벨만 빠진다)
function loadLevelFiles() {
  const ids = [...new Set(STAGES.flatMap(st => st.levels))];
  return Promise.all(ids.map(id => new Promise(resolve => {
    const s = document.createElement('script');
    s.src = `${LEVEL_DIR}${id}.js`;
    s.dataset.level = id;
    s.onload = resolve;
    s.onerror = () => {
      console.error(`레벨 ${id} 제외: 파일 ${s.src} 없음`);
      resolve();
    };
    document.head.appendChild(s);
  })));
}
