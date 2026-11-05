// 플레이 진행: 레벨 불러오기, 입력 큐, 실행(한 번 이동씩 미끄러짐), 사건 칸에서 화면 상태 바꾸기, 결과 알리기.
// DOM을 만지지 않는다. 화면 쪽(ui/screens/play.js)이 bind로 넘긴 함수로 바뀐 점을 알린다.
//   change()        HUD·입력바를 다시 써야 할 때
//   event(ev)       실행 중 사건 칸에 닿았을 때. ev.type은 file·vaccine·eat·die·bump·clear
//   finish(result)  실행이 끝나고 마지막 문양이 사라진 뒤. { status: 'clear'|'dead'|'play', moves, left: { files, viruses } }
// 그리기(play/board.js)는 이 객체의 값을 읽기만 한다.

const POP_MS = 680; // 사건 문양이 떠 있는 시간. 마지막 이동 뒤 이만큼 기다렸다가 결과를 알린다

const Play = {
  idx: 0,          // CATALOG.levels 번호
  level: null,
  state: null,     // 화면에 보이는 상태. 이동하는 동안은 이동 전 상태에서 사건 칸마다 바뀐다
  queue: [],       // 입력한 방향 'U'|'D'|'L'|'R'
  running: false,
  stepIdx: -1,     // 실행 중인 입력 번호
  slide: null,     // 지금 미끄러지는 이동 { dir, from, path, events, fired, start, duration, bumped }
  popups: [],      // 떠 있는 문양 { x, y, kind, dir, born }
  faceDir: 'R',
  eatFlashUntil: 0,
  flashFace: ':D',
  timer: 0,
  hooks: {},

  bind(hooks) {
    this.hooks = hooks;
  },
  emit(name, arg) {
    this.hooks[name]?.(arg);
  },

  // 레벨 처음 상태로. keepQueue면 입력은 남긴다(다시 시도, 실행 중단)
  load(idx, keepQueue = false) {
    clearTimeout(this.timer);
    this.idx = idx;
    this.level = CATALOG.levels[idx];
    this.state = parseLevel(this.level);
    this.running = false;
    this.stepIdx = -1;
    this.slide = null;
    this.popups = [];
    if (!keepQueue) this.queue = [];
    this.emit('change');
  },

  push(dir) {
    if (this.running) return;
    this.queue.push(dir);
    this.faceDir = dir;
    this.emit('change');
  },
  pop() {
    if (this.running || !this.queue.length) return;
    this.queue.pop();
    this.emit('change');
  },

  // tileMs: 칸당 이동 시간. 입력이 없거나 이미 실행 중이면 false
  run(tileMs) {
    if (this.running || !this.queue.length) return false;
    this.load(this.idx, true);
    this.tileMs = tileMs;
    this.running = true;
    this.advance();
    return true;
  },
  stop() {
    this.load(this.idx, true);
  },

  advance() {
    this.stepIdx++;
    const dir = this.queue[this.stepIdx];
    this.faceDir = dir;
    const { state: next, events, path } = step(this.state, dir);
    const duration = Math.max(110, path.length * this.tileMs);
    this.slide = {
      dir,
      from: { ...this.state.player },
      path,
      events,
      fired: new Set(),
      start: performance.now(),
      duration,
      bumped: path.length === 0,
    };
    this.emit('change');

    // 이동하는 동안 state는 이동 전 상태로 두고 사건 칸에서 fire가 바꾼다. 이동이 끝나면 규칙 결과로 맞춘다.
    this.timer = setTimeout(() => {
      this.fireUpTo(Infinity); // 그리기 루프가 멈춰 있었어도 사건을 빠뜨리지 않는다
      this.state = next;
      this.slide = null;
      this.emit('change');
      if (next.status === 'play' && this.stepIdx < this.queue.length - 1) this.advance();
      // 마지막 이동은 끝 칸의 문양이 결과 화면에 가려지지 않도록 문양이 사라진 뒤 알린다
      else this.timer = setTimeout(() => this.finish(), POP_MS);
    }, duration + 45);
  },

  finish() {
    this.running = false;
    this.emit('change');
    this.emit('finish', {
      status: this.state.status,
      moves: this.stepIdx + 1,
      left: remaining(this.state.items),
    });
  },

  // 지금 미끄러지는 이동에서 지나온 칸 수(소수). rAF 시각이 start보다 앞설 수 있어 0 아래를 자른다.
  slideDist(now) {
    const sl = this.slide;
    return clamp((now - sl.start) / sl.duration, 0, 1) * sl.path.length;
  },

  // 매 프레임: 지나온 칸의 사건을 일으키고 다 뜬 문양을 지운다
  update(now) {
    this.popups = this.popups.filter(pop => now - pop.born < POP_MS);
    if (this.slide) this.fireUpTo(this.slideDist(now));
  },
  fireUpTo(dist) {
    const sl = this.slide;
    if (!sl) return;
    for (const ev of sl.events) {
      if (dist >= ev.at && !sl.fired.has(ev)) {
        sl.fired.add(ev);
        this.fire(ev);
      }
    }
  },

  // 사건이 일어난 칸에서 화면용 state(오브젝트, 백신 효과, 결과)를 바꾸고 문양을 띄운다.
  // 문양 kind: save·vaccine·delete·infect·bump, shatter는 바이러스 조각. dir은 bump 문양을 놓을 벽 쪽.
  fire(ev) {
    const now = performance.now();
    const k = key(ev.x, ev.y);
    const pop = (kind, dir) => this.popups.push({ x: ev.x, y: ev.y, kind, dir, born: now });
    if (ev.type === 'file') {
      this.state.items.delete(k);
      this.flashFace = ':D';
      this.eatFlashUntil = now + 220;
      pop('save');
    } else if (ev.type === 'vaccine') {
      this.state.items.delete(k);
      this.state.super = SUPER_MOVES;
      this.flashFace = 'B)';
      this.eatFlashUntil = now + 260;
      pop('vaccine');
    } else if (ev.type === 'eat') {
      this.state.items.delete(k);
      this.flashFace = ':D';
      this.eatFlashUntil = now + 260;
      pop('shatter');
      pop('delete');
    } else if (ev.type === 'die') {
      this.state.status = 'dead';
      pop('infect');
    } else if (ev.type === 'bump') {
      pop('bump', this.slide.dir);
    } else if (ev.type === 'clear') {
      this.state.status = 'clear';
    }
    this.emit('event', ev);
    this.emit('change');
  },
};
