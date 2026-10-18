/* ===========================================================
   The Lullaby Lab — self-contained generative music box (Web Audio API, no audio files)
   • Pip "composes" an 8-bar lullaby in 6/8 from a seed number
   • Pin-cylinder animation, play-along keys, sleep timer, endless mode
   • Public API: window.LullabyLab.{play, pause, stop, compose}
   • Events on document: "lullabylab:play" and "lullabylab:pause"
   =========================================================== */
(function () {
  "use strict";

  const STEPS_PER_BAR = 6, BARS = 8, TOTAL = STEPS_PER_BAR * BARS;
  const PENTA = [0, 2, 4, 7, 9];              // major pentatonic = always sounds sweet
  const LANES = 10;                            // two octaves of pentatonic
  const laneSemis = (l) => PENTA[l % 5] + 12 * Math.floor(l / 5);
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------------- seeded random ---------------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- composer ---------------- */
  const CHORDS = { I: { r: 0, t: 4 }, vi: { r: -3, t: 3 }, IV: { r: 5, t: 4 }, V: { r: -5, t: 4 } };
  const PROGS = [
    ["I", "I", "vi", "vi", "IV", "IV", "V", "I"],
    ["I", "vi", "IV", "V", "I", "vi", "IV", "I"],
    ["I", "IV", "I", "V", "vi", "IV", "V", "I"],
    ["I", "I", "IV", "IV", "I", "vi", "V", "I"],
  ];
  const RHYTHMS = [
    [1, 0, 0, 1, 0, 0], [1, 0, 1, 1, 0, 0], [1, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0], [1, 0, 0, 1, 1, 0], [1, 0, 0, 0, 0, 0],
  ];
  const RHYTHMS_END = [[1, 0, 0, 0, 0, 0], [1, 0, 0, 1, 0, 0]];
  const ADJ = ["Sleepy", "Fluffy", "Yawning", "Cozy", "Drowsy", "Moonlit", "Snuggly", "Tiny", "Fuzzy", "Dreamy"];
  const NOUN = ["Segfault", "Pull Request", "Semicolon", "Stack Trace", "Merge Conflict", "Compile Loop", "Cache Miss", "Null Pointer", "Bug", "Deploy"];
  const NOTES = [
    "I wrote this one in my sleep. Zero bugs. Probably. 🐛",
    "No semicolons were harmed in the making of this lullaby.",
    "Compiled in 0.3 naps. Ship it! 🚀",
    "This tune passed all my sleepy unit tests ✅",
    "Warning: may cause yawning in production. 😴",
    "Made with 100% organic, free-range stardust ✨",
    "git commit -m \"added more cuddles\" 💗",
    "Merged straight into your dreams. No review needed. 🌙",
  ];

  function generate(seed, theme) {
    const r = rng(seed);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const night = theme !== "day";
    const root = pick([55, 57, 58, 60, 62]);
    const bpm = night ? 44 + Math.floor(r() * 17) : 60 + Math.floor(r() * 25);
    const prog = pick(PROGS);
    const chordOf = (bar) => CHORDS[prog[bar]];
    const pcsOf = (bar) => { const c = chordOf(bar); return [c.r, c.r + c.t, c.r + 7].map((x) => ((x % 12) + 12) % 12); };
    const fit = (l, pcs) => {
      const ok = (x) => x >= 0 && x < LANES && pcs.includes(laneSemis(x) % 12);
      if (ok(l)) return l;
      for (const d of [1, -1, 2, -2]) if (ok(l + d)) return l + d;
      return l;
    };

    const mel = new Array(TOTAL).fill(-1);
    let lane = pick([2, 3, 4, 5, 7]);
    const walk = (l, strong, pcs, up) => {
      l = clamp(l + pick([-2, -1, -1, -1, 0, 1, 1, 1, 2]) + (up && r() < 0.3 ? 1 : 0), 0, LANES - 1);
      return strong ? fit(l, pcs) : l;
    };
    const makePhrase = (startBar, hold, up) => {
      for (let b = 0; b < 2; b++) {
        const bar = startBar + b;
        const tpl = b === 1 && hold ? pick(RHYTHMS_END) : pick(RHYTHMS);
        for (let s = 0; s < STEPS_PER_BAR; s++) {
          if (!tpl[s]) continue;
          lane = walk(lane, s === 0 || s === 3, pcsOf(bar), up);
          mel[bar * STEPS_PER_BAR + s] = lane;
        }
      }
    };
    const varyCopy = (fromBar, toBar, bars, chance) => {
      for (let i = 0; i < bars * STEPS_PER_BAR; i++) {
        const src = mel[fromBar * STEPS_PER_BAR + i];
        if (src < 0) continue;
        let l = clamp(src + (r() < chance ? pick([-1, 1]) : 0), 0, LANES - 1);
        const bar = toBar + Math.floor(i / STEPS_PER_BAR), s = i % STEPS_PER_BAR;
        if (s === 0 || s === 3) l = fit(l, pcsOf(bar));
        mel[toBar * STEPS_PER_BAR + i] = l;
      }
    };

    makePhrase(0, true, false);        // A
    varyCopy(0, 2, 2, 0.25);           // A' (a gentle echo)
    lane = mel[2 * STEPS_PER_BAR] >= 0 ? mel[2 * STEPS_PER_BAR] : lane;
    makePhrase(4, false, true);        // B (reaches higher)
    varyCopy(0, 6, 1, 0.3);            // bar 7 = A's first bar, over the V chord
    const prev = mel.slice(6 * STEPS_PER_BAR, 7 * STEPS_PER_BAR).filter((x) => x >= 0).pop() ?? 4;
    mel[7 * STEPS_PER_BAR] = [0, 5].reduce((best, t) => (Math.abs(t - prev) < Math.abs(best - prev) ? t : best), 0); // land softly on home

    // accompaniment: rocking bass + soft arpeggio + occasional twinkle
    const acc = Array.from({ length: TOTAL }, () => []);
    for (let b = 0; b < BARS; b++) {
      const c = chordOf(b), i0 = b * STEPS_PER_BAR;
      acc[i0].push({ m: root + c.r - 12, v: 0.55 });
      acc[i0 + 2].push({ m: root + c.r + c.t, v: 0.22 });
      acc[i0 + 4].push({ m: root + c.r + 7, v: 0.2 });
      if ((b === 1 || b === 3 || b === 5) && r() < 0.7) acc[i0 + 5].push({ m: root + 24 + pick(PENTA), v: 0.18 });
    }

    const adj = pick(ADJ), noun = pick(NOUN);
    const name = pick([`${adj} ${noun} Lullaby`, `Lullaby for a ${adj} ${noun}`, `${noun} Goes Night-Night`, `The ${adj} ${noun} Waltz`]);
    return { seed, root, bpm, mel, acc, name, note: pick(NOTES) };
  }

  /* ---------------- timbres ---------------- */
  const TIMBRES = {
    musicbox: { type: "sine", parts: [[1, 1, 1.7], [3, 0.22, 0.8], [5.4, 0.1, 0.4]], lp: 6000 },
    glass:    { type: "sine", parts: [[1, 1, 3.0], [2, 0.35, 2.2], [3.01, 0.15, 1.4]], lp: 9000 },
    harp:     { type: "triangle", parts: [[1, 1, 2.0], [2, 0.3, 1.0], [3, 0.12, 0.6]], lp: 2600 },
  };

  /* ---------------- the lab ---------------- */
  const Lab = {};
  window.LullabyLab = Lab;
  Lab._generate = generate;

  function init() {
    const root = document.getElementById("lullabyLab");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "1";

    const $ = (id) => document.getElementById(id);
    const el = {
      seed: $("llSeed"), song: $("llSong"), note: $("llNote"), cv: $("llRoll"), bars: $("llBars"),
      play: $("llPlay"), compose: $("llCompose"), tempo: $("llTempo"), tempoOut: $("llTempoOut"),
      sound: $("llSound"), sleep: $("llSleep"), endless: $("llEndless"), keys: $("llKeys"),
    };
    const htmlEl = document.documentElement;
    const theme = () => (htmlEl.getAttribute("data-theme") === "day" ? "day" : "night");

    let ctx, master, voiceBus;
    let song, pending = null;
    let bpm = 54, timbre = "musicbox";
    let playing = false, timer = null, rafId = 0, sleepT = null, sleepT2 = null;
    let nextTime = 0, absStep = 0, queue = [], lastPos = 0, lastBar = -1;

    const stepDur = () => 60 / (bpm * 3);       // 6/8: bpm counts dotted-quarter pulses

    /* ---------- audio ---------- */
    function initAudio() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      voiceBus = ctx.createGain();
      const dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver();
      dry.gain.value = 0.8; wet.gain.value = 0.45;
      const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
      conv.buffer = buf;
      voiceBus.connect(dry); voiceBus.connect(conv); conv.connect(wet);
      dry.connect(master); wet.connect(master); master.connect(comp); comp.connect(ctx.destination);
    }

    function playNote(m, t, v, tim) {
      const T = TIMBRES[tim || timbre], f = hz(m);
      const out = ctx.createBiquadFilter();
      out.type = "lowpass"; out.frequency.value = T.lp; out.connect(voiceBus);
      T.parts.forEach(([ratio, gain, dec]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = T.type; o.frequency.value = f * ratio;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v * gain * 0.28, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + dec + 0.05);
      });
    }

    /* ---------- scheduler ---------- */
    function scheduleStep(n, t) {
      const i = n % TOTAL;
      if (i === 0 && n > 0 && el.endless.checked && !pending) pending = generate(1 + Math.floor(Math.random() * 9999), theme());
      if (pending && i % STEPS_PER_BAR === 0) { song = pending; pending = null; applySong(true); }
      const lane = song.mel[i];
      if (lane >= 0) playNote(song.root + laneSemis(lane), t, i % STEPS_PER_BAR === 0 ? 0.9 : 0.7);
      song.acc[i].forEach((a) => playNote(a.m, t, a.v));
      queue.push({ n, t });
    }
    function tick() {
      while (nextTime < ctx.currentTime + 0.18) {
        scheduleStep(absStep, nextTime);
        nextTime += stepDur(); absStep++;
      }
    }

    /* ---------- drawing ---------- */
    const g2 = el.cv.getContext("2d");
    let palette = { pin: "#ffc85c", past: "#b9a4ff", line: "rgba(255,255,255,.12)", comb: "#efe9ff" };
    function readPalette() {
      palette = theme() === "day"
        ? { pin: "#ffd98a", past: "#f6a21e", line: "rgba(255,226,176,.16)", comb: "#ffe2b0" }
        : { pin: "#ffc85c", past: "#b9a4ff", line: "rgba(255,255,255,.12)", comb: "#efe9ff" };
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = el.cv.clientWidth, h = el.cv.clientHeight;
      if (!w || !h) return;
      el.cv.width = Math.round(w * dpr); el.cv.height = Math.round(h * dpr);
      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(lastPos);
    }
    function draw(pos) {
      const w = el.cv.clientWidth, h = el.cv.clientHeight;
      if (!w || !h || !song) return;
      g2.clearRect(0, 0, w, h);
      const padY = 20, laneH = (h - padY * 2) / (LANES - 1);
      const headX = Math.max(36, w * 0.16), sw = (w - headX - 16) / 15;
      const yOf = (l) => h - padY - l * laneH;

      g2.lineWidth = 1; g2.strokeStyle = palette.line;
      for (let l = 0; l < LANES; l++) { g2.beginPath(); g2.moveTo(0, yOf(l)); g2.lineTo(w, yOf(l)); g2.stroke(); }

      const k0 = Math.floor(pos) - Math.ceil(headX / sw) - 1, k1 = Math.floor(pos) + 17;
      for (let k = k0; k <= k1; k++) {
        const idx = ((k % TOTAL) + TOTAL) % TOTAL, l = song.mel[idx];
        if (l < 0) continue;
        const x = headX + (k - pos) * sw, y = yOf(l), age = pos - k;
        const hot = age >= 0 && age < 1.4 ? 1 - age / 1.4 : 0;
        g2.globalAlpha = clamp(Math.min(x / 30, (w - x) / 20), 0, 1) * (age > 1.4 ? 0.55 : 1);
        g2.fillStyle = age > 0 ? palette.past : palette.pin;
        g2.shadowColor = palette.pin; g2.shadowBlur = 18 * hot;
        g2.beginPath(); g2.arc(x, y, 5 + 4 * hot, 0, Math.PI * 2); g2.fill();
      }
      g2.globalAlpha = 1; g2.shadowBlur = 0;

      g2.strokeStyle = palette.comb; g2.lineWidth = 2; g2.globalAlpha = 0.75;
      g2.beginPath(); g2.moveTo(headX, 6); g2.lineTo(headX, h - 6); g2.stroke();
      g2.lineWidth = 3;
      for (let l = 0; l < LANES; l++) { g2.beginPath(); g2.moveTo(headX - 9, yOf(l)); g2.lineTo(headX, yOf(l)); g2.stroke(); }
      g2.globalAlpha = 1;

      const bar = Math.floor((((pos % TOTAL) + TOTAL) % TOTAL) / STEPS_PER_BAR);
      if (bar !== lastBar) { lastBar = bar; [...el.bars.children].forEach((s, i) => s.classList.toggle("on", i === bar)); }
    }
    function currentPos() {
      const now = ctx.currentTime, d = stepDur();
      let last = null;
      for (const e of queue) { if (e.t <= now) last = e; else break; }
      let pos;
      if (last) pos = last.n + clamp((now - last.t) / d, 0, 1);
      else if (queue[0]) pos = queue[0].n - (queue[0].t - now) / d;
      else pos = absStep;
      while (queue.length > 2 && queue[1].t < now - 1) queue.shift();
      return pos;
    }
    function frame() {
      if (!playing) return;
      lastPos = currentPos();
      draw(lastPos);
      rafId = requestAnimationFrame(frame);
    }

    /* ---------- UI ---------- */
    function setBpm(v) { bpm = clamp(Math.round(v), 36, 100); el.tempo.value = bpm; el.tempoOut.textContent = bpm; }
    function applySong(keepPos) {
      el.seed.textContent = "Lullaby #" + String(song.seed).padStart(4, "0");
      el.song.textContent = song.name;
      el.note.textContent = song.note;
      setBpm(song.bpm);
      if (!keepPos) { lastPos = 0; lastBar = -1; }
      draw(lastPos);
    }
    function setPlayUI() {
      el.play.setAttribute("aria-pressed", String(playing));
      el.play.querySelector(".ll-play-ico").textContent = playing ? "❚❚" : "▶";
      el.play.querySelector(".ll-play-label").textContent = playing ? "Pause" : "Play";
      root.classList.toggle("is-playing", playing);
    }

    function startSleep() {
      clearTimeout(sleepT); clearTimeout(sleepT2);
      const mins = Number(el.sleep.value);
      if (!mins || !playing) return;
      sleepT = setTimeout(() => {
        master.gain.setTargetAtTime(0, ctx.currentTime, 2.5);
        el.note.textContent = "Goodnight… 💤";
        sleepT2 = setTimeout(pause, 7000);
      }, mins * 60000);
    }

    function play() {
      initAudio();
      ctx.resume();
      if (playing) return;
      playing = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
      nextTime = ctx.currentTime + 0.08; queue = [];
      timer = setInterval(tick, 25);
      startSleep(); setPlayUI(); frame();
      document.dispatchEvent(new CustomEvent("lullabylab:play"));
    }
    function pause() {
      if (!playing) return;
      playing = false;
      clearInterval(timer); clearTimeout(sleepT); clearTimeout(sleepT2); cancelAnimationFrame(rafId);
      queue = []; absStep = Math.ceil(lastPos); // resume cleanly from the next step
      setPlayUI(); draw(lastPos);
      document.dispatchEvent(new CustomEvent("lullabylab:pause"));
    }
    function composeNew() {
      const s = generate(1 + Math.floor(Math.random() * 9999), theme());
      if (playing) { pending = s; el.note.textContent = "Composing… 🎼"; }
      else { pending = null; song = s; applySong(false); }
    }

    /* ---------- play-along keys ---------- */
    for (let l = 0; l < LANES; l++) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ll-key"; b.textContent = "★"; b.setAttribute("aria-label", "Note " + (l + 1));
      const hit = () => {
        initAudio(); ctx.resume();
        playNote(song.root + laneSemis(l), ctx.currentTime + 0.01, 0.9);
        b.classList.add("hit"); setTimeout(() => b.classList.remove("hit"), 220);
      };
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); hit(); });
      b.addEventListener("click", (e) => { if (e.detail === 0) hit(); }); // keyboard activation
      el.keys.appendChild(b);
    }
    for (let i = 0; i < BARS; i++) el.bars.appendChild(document.createElement("span"));

    /* ---------- wiring ---------- */
    el.play.addEventListener("click", () => (playing ? pause() : play()));
    el.compose.addEventListener("click", composeNew);
    el.tempo.addEventListener("input", () => setBpm(el.tempo.value));
    el.sound.addEventListener("change", () => { timbre = el.sound.value; });
    el.sleep.addEventListener("change", startSleep);
    window.addEventListener("resize", resize);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(el.cv); // also fires when its page becomes visible
    new MutationObserver(() => { readPalette(); draw(lastPos); }).observe(htmlEl, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", () => {
      if (!ctx || !playing) return;
      document.hidden ? ctx.suspend() : ctx.resume();
    });

    Lab.play = play;
    Lab.pause = pause;
    Lab.stop = pause;           // call when leaving the page/section
    Lab.compose = composeNew;

    readPalette();
    song = generate(1 + Math.floor(Math.random() * 9999), theme());
    applySong(false);
    resize();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();