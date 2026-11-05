// 레벨 목록: 목차(data/stages.js)와 불러온 레벨 정의(LEVEL_DEFS)를 검사해 플레이할 레벨만 남기고,
// 화면이 쓰는 값(단계, 크기, 최단 이동 수, 대상 수)을 붙인다. app.js가 레벨 파일을 다 불러온 뒤 CATALOG.build()를 부른다.
// 화면·저장 데이터·플레이는 이 CATALOG만 읽는다. 레벨 번호는 CATALOG.levels의 순서(0부터)다.
//   levels  [{ id, name, ko, map, group, w, h, files, viruses, par }]  par는 최단 이동 수, 해법이 없으면 null
//   groups  [{ no, name, ko, size, levels: [레벨 번호...] }]          레벨이 하나도 남지 않은 단계는 빠진다
//   totalFiles, totalViruses

const CATALOG = {
  levels: [],
  groups: [],
  totalFiles: 0,
  totalViruses: 0,

  build() {
    for (const st of STAGES) {
      const gr = { no: st.no, name: st.name, ko: st.ko, size: '', levels: [] };
      for (const id of st.levels) {
        const lv = LEVEL_DEFS[id];
        if (!lv) continue; // 파일이 없다는 이유는 level-files.js가 남겼다
        const errors = validateLevel(lv);
        if (this.levels.some(o => o.id === id)) errors.push('목차에 두 번 있음');
        // 형식이 틀린 레벨은 콘솔에 이유를 남기고 목록에서 뺀다
        if (errors.length) {
          console.error(`레벨 ${id} 제외: ${errors.join(', ')}`);
          continue;
        }
        const start = parseLevel(lv);
        const left = remaining(start.items);
        const solution = solve(lv);
        if (!gr.size) gr.size = `${start.w}×${start.h}`;
        gr.levels.push(this.levels.length);
        this.levels.push({
          ...lv,
          group: st.no,
          w: start.w,
          h: start.h,
          files: left.files,
          viruses: left.viruses,
          par: solution ? solution.length : null,
        });
      }
      if (gr.levels.length) this.groups.push(gr);
    }
    this.totalFiles = this.levels.reduce((n, lv) => n + lv.files, 0);
    this.totalViruses = this.levels.reduce((n, lv) => n + lv.viruses, 0);
  },
};
