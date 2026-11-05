// S3 플레이: 게임 화면(play/board.js)이 보이고 이 화면은 키와 캔버스 밖 요소만 맡는다. 진행은 play/session.js의 Play.
// 들어오기 전에 Play.load로 레벨을 불러 둔다(스테이지 선택, 결과의 다음 레벨·다시 시도, 일시정지의 처음부터).
//   S3a 입력: 방향키·WASD·스와이프 입력, Backspace(⌫) 하나 지우기, R 전부 비우기, Enter(ENTER) 실행, Esc 일시정지(S5)
//         입력이 비었을 때 Backspace(⌫)도 일시정지다. 휴대폰에는 Esc가 없어 ⌫가 뒤로를 맡는다
//   S3b 실행: R·Esc 중단하고 입력은 남김. ⌫·ENTER는 받지 않는다. 실행이 끝나면 결과(S4)

SCREENS.S3 = () => {
  const i = Play.idx;
  const lv = Play.level;
  Shell.label(`${lv.id} ${lv.name}`);
  Shell.stamp(Play.state.status === 'clear');

  const sync = () => {
    Shell.playHud(i, Play.state);
    Shell.queue(Play.queue, Play.running ? Play.stepIdx : null);
  };
  Play.bind({
    change: sync,
    event: ev => {
      if (ev.type === 'clear') Shell.stamp(true);
    },
    finish: result => go('S4', result),
  });
  sync();

  Menu.set({
    layer: 'play',
    onKey: e => {
      const k = KEYS[e.code];
      if (Play.running) {
        if (e.code === 'Escape' || e.code === 'KeyR') Play.stop();
        return true;
      }
      if (e.code === 'Backspace') {
        if (Play.queue.length) Play.pop();
        else if (!e.repeat) go('S5'); // 길게 눌러 다 지운 뒤에는 멈춘다
      } else if (k === 'ok') Play.run(Progress.tileMs());
      else if (k === 'back') go('S5');
      else if (k) Play.push(k);
      else if (e.code === 'KeyR') Play.load(i);
      else return false;
      return true;
    },
  });
};
