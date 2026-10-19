/* ===========================================================
   Pip's Nursery — behaviour for page 1 (intro) and page 2 (menu)
   • Night ⇄ Day theme + outfit swap
   • Cute pitched voice (Web Speech API) that tells Pip's story
   • Soft generative lullaby (Web Audio API, no audio files!)
   • 3D tilt, waving, talking bounce, floating sparkles
   • Star shower + menu on page 2
   =========================================================== */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     STORY CONTENT  (edit the words here!)
     --------------------------------------------------------- */
  const STORY = {
    night: {
      greet: [
        { text: "Hi hi! I’m Pip! 👋", say: "Hi hi! I’m Pip!" },
        { text: "A sleepy little skull baby, and a junior dream engineer at the Midnight Nursery. 🌙",
          say: "A sleepy little skull baby, and a junior dream engineer at the Midnight Nursery." },
        { text: "Want to hear my story?", say: "Want to hear my story?" },
      ],
      lines: [
        { text: "Every dream begins with a little spark. ✨", say: "Every dream begins with a little spark." },
        { text: "When the world falls asleep, Pip wakes up — a tiny dream developer turning lines of code into stars and lullabies.",
          say: "When the world falls asleep, Pip wakes up. A tiny dream developer, turning lines of code into stars and lullabies." },
        { text: "All night, Pip debugs the sky, guides lost stars back home, and makes sure no dream feels lonely.",
          say: "All night, Pip debugs the sky, guides lost stars back home, and makes sure no dream feels lonely." },
        { text: "Pip’s little secret? The best dreams aren’t built with perfect code — they’re built with kindness.",
          say: "Pip’s little secret? The best dreams aren’t built with perfect code. They’re built with kindness." },
        { text: "Before sunrise, Pip whispers: “One last dream… just for you.” 💗",
          say: "Before sunrise, Pip whispers... One last dream... just for you.", quote: true },
      ],
      emoji: ["✨", "⭐", "💗", "🌙"],
    },
    day: {
      greet: [
        { text: "Ooh, good morning! ☀️", say: "Ooh! Good morning!" },
        { text: "I swapped my pyjamas for my sunny work outfit!", say: "I swapped my pyjamas for my sunny work outfit!" },
      ],
      lines: [
        { text: "When morning arrives, Pip opens the nursery windows and lets every little dream see the sunshine. ☀️",
          say: "When morning arrives, Pip opens the nursery windows, and lets every little dream see the sunshine." },
        { text: "Now Pip ships last night’s ideas as playful creations, colourful websites and tiny bits of everyday magic.",
          say: "Now Pip ships last night’s ideas as playful creations, colourful websites, and tiny bits of everyday magic." },
        { text: "Every new day is a fresh commit — another chance to make someone’s world a little brighter.",
          say: "Every new day is a fresh commit. Another chance to make someone’s world a little brighter." },
        { text: "“Good morning, sunshine! Ready to make something wonderful together?” 🌻",
          say: "Good morning, sunshine! Ready to make something wonderful together?", quote: true },
      ],
      emoji: ["☀️", "🌻", "💗", "✨"],
    },
  };
  const GIGGLES = ["Hehe! That tickles!", "Eee! Hi again!", "Boop! You found me!", "Hehe, hello friend!"];

  /* ---------------------------------------------------------
     STATE + ELEMENTS
     --------------------------------------------------------- */
  const el = {
    page1: $("#page1"), page2: $("#page2"), pageStorybook: $("#pageStorybook"),
    pipWrap: $("#pipWrap"), pip3d: $("#pip3d"), particles: $("#particles"),
    bubble: $("#bubble"), bubbleText: $("#bubbleText"), story: $("#story"),
    themeBtn: $("#themeBtn"), replayBtn: $("#replayBtn"), musicBtn: $("#musicBtn"),
    nextBtn: $("#nextBtn"), menuBtn: $("#menuBtn"), menuPanel: $("#menuPanel"),
    openStorybookHeroBtn: $("#openStorybookHeroBtn"), storybookThemeBtn: $("#storybookThemeBtn"),
    toast: $("#toast"), canvas: $("#shower"),
  };
  const state = { started: false, theme: "night", page: 1, token: 0, musicOn: true, speaking: false };

  /* ---------------------------------------------------------
     BACKGROUND STARS / DUST
     --------------------------------------------------------- */
  (function makeStars() {
    const frag = document.createDocumentFragment();
    const n = window.innerWidth < 600 ? 55 : 95;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      const size = rand(1.5, 4);
      s.style.cssText = `left:${rand(0, 100)}%;top:${rand(0, 100)}%;width:${size}px;height:${size}px;` +
        `--d:${rand(2.5, 6)}s;--delay:${rand(0, 5)}s`;
      frag.appendChild(s);
    }
    $("#stars").appendChild(frag);
  })();

  /* ---------------------------------------------------------
     TOAST
     --------------------------------------------------------- */
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  /* ---------------------------------------------------------
     PARTICLES (floating emoji around Pip)
     --------------------------------------------------------- */
  function sparkle(n = 4, list = STORY[state.theme].emoji) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "p";
      p.textContent = pick(list);
      p.style.cssText = `left:${rand(12, 84)}%;top:${rand(18, 68)}%;--s:${rand(1.1, 2).toFixed(2)}rem;` +
        `--dx:${rand(-40, 40).toFixed(0)}px;--r:${rand(-40, 40).toFixed(0)}deg;animation-delay:${(i * 0.12).toFixed(2)}s`;
      el.particles.appendChild(p);
      setTimeout(() => p.remove(), 2600 + i * 120);
    }
  }

  /* ---------------------------------------------------------
     CUTE ACTIONS (wave / giggle / pop)
     --------------------------------------------------------- */
  function act(cls, ms) {
    el.pipWrap.classList.remove(cls);
    void el.pipWrap.offsetWidth; // restart animation
    el.pipWrap.classList.add(cls);
    setTimeout(() => el.pipWrap.classList.remove(cls), ms);
  }
  const wave = () => act("waving", 1700);
  setInterval(() => { if (state.started && state.page === 1 && !state.speaking) wave(); }, 8000);

  /* ---------------------------------------------------------
     3D TILT — Pip leans toward your pointer / finger
     --------------------------------------------------------- */
  function tilt(e) {
    if (state.page !== 1 || reduceMotion) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    el.pip3d.style.transform = `rotateY(${(x * 14).toFixed(1)}deg) rotateX(${(-y * 9).toFixed(1)}deg)`;
  }
  window.addEventListener("pointermove", tilt, { passive: true });
  window.addEventListener("pointerleave", () => (el.pip3d.style.transform = ""));

  /* ---------------------------------------------------------
     VOICE — Web Speech API, pitched up to sound tiny & cute
     --------------------------------------------------------- */
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  let voice = null;
  function pickVoice() {
    if (!synth) return;
    const list = synth.getVoices();
    if (!list.length) return;
    const en = list.filter((v) => /^en/i.test(v.lang));
    const pref = /(samantha|google uk english female|google us english|aria|jenny|zira|karen|moira|tessa|serena|female)/i;
    voice = en.find((v) => pref.test(v.name)) || en[0] || list[0];
  }
  if (synth) { pickVoice(); synth.addEventListener?.("voiceschanged", pickVoice); }

  function stopAllSpeech() {
    try {
      state.token++;
      el.pipWrap?.classList.remove("talking");
      state.speaking = false;
      Music.duck(false);
    } catch (e) {}

    try {
      if (window.BedtimeStorybook && typeof window.BedtimeStorybook.stopNarration === "function") {
        window.BedtimeStorybook.stopNarration();
      }
    } catch (e) {}

    try {
      if ("speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  function stopSpeaking() {
    stopAllSpeech();
  }

  // Speak one sentence. Resolves when finished (or cancelled / unsupported).
  function say(text, token) {
    return new Promise((resolve) => {
      const done = () => { clearTimeout(safety); el.pipWrap.classList.remove("talking"); resolve(); };
      const est = text.length * 75 + 1200;
      const safety = setTimeout(done, est + 5000);
      el.pipWrap.classList.add("talking");
      if (token !== state.token) {
        done();
        return;
      }
      if (!synth) {
        setTimeout(done, est); // silent fallback keeps the story moving
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = "en-US"; }
      u.pitch = 1.9;   // high = tiny & cute
      u.rate = 1.02;
      u.volume = 1;
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    });
  }

  /* ---------------------------------------------------------
     STORY ENGINE — shows lines, speaks them, animates Pip
     --------------------------------------------------------- */
  function showBubble(text) {
    el.bubble.classList.remove("quiet");
    el.bubbleText.textContent = text;
  }

  function renderStoryLines(theme) {
    el.story.innerHTML = "";
    STORY[theme].lines.forEach((l) => {
      const p = document.createElement("p");
      p.textContent = l.text;
      if (l.quote) p.classList.add("quote");
      el.story.appendChild(p);
    });
  }

  async function tell(theme, { withGreeting = true } = {}) {
    stopSpeaking();
    const token = state.token;
    const data = STORY[theme];
    state.speaking = true;
    Music.duck(true);
    renderStoryLines(theme);
    const paras = $$("p", el.story);

    const sequence = [];
    if (withGreeting) data.greet.forEach((g) => sequence.push({ ...g, kind: "greet" }));
    data.lines.forEach((l, i) => sequence.push({ ...l, kind: "line", i }));

    for (const item of sequence) {
      if (token !== state.token) return;
      showBubble(item.text);
      if (item.kind === "greet" || item.i === 0) wave();
      sparkle(3);
      if (item.kind === "line") {
        paras.forEach((p) => p.classList.remove("now"));
        paras[item.i].classList.add("show", "now");
      }
      await say(item.say, token);
      if (token !== state.token) return;
      await sleep(350);
    }
    if (token !== state.token) return;
    paras.forEach((p) => p.classList.remove("now"));
    state.speaking = false;
    Music.duck(false);
    showBubble(theme === "night" ? "Psst… tap me! 💗" : "Tap me! Hehe! 🌻");
    sparkle(6);
  }

  /* ---------------------------------------------------------
     THEME — night ⇄ day (+ outfit swap)
     --------------------------------------------------------- */
  function applyTheme(theme) {
    state.theme = theme;
    root.setAttribute("data-theme", theme);
    const night = theme === "night";
    $(".theme-ico", el.themeBtn).textContent = night ? "☀️" : "🌙";
    $(".theme-label", el.themeBtn).textContent = night ? "Wake up the day" : "Back to bedtime";
    if (el.storybookThemeBtn) {
      const ico = el.storybookThemeBtn.querySelector(".ico-theme") || el.storybookThemeBtn;
      ico.textContent = night ? "☀️" : "🌙";
      el.storybookThemeBtn.setAttribute("aria-label", night ? "Switch to day mode" : "Switch to bedtime mode");
      el.storybookThemeBtn.setAttribute("title", night ? "Wake up the day" : "Back to bedtime");
    }
    $$("[data-theme-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeSet === theme)));
    try { Music.setMode(theme); } catch (e) {}
    try { Shower.recolor(); } catch (e) {}
  }

  function switchTheme(theme, { speak = true } = {}) {
    try { stopAllSpeech(); } catch (e) {}
    if (theme === state.theme) return;
    applyTheme(theme);
    if (state.page === 1 && state.started) {
      try { act("pop", 950); } catch (e) {}
      try { sparkle(8, theme === "day" ? ["☀️", "🌻", "✨"] : ["🌙", "⭐", "✨"]); } catch (e) {}
      try { Shower.burst(window.innerWidth * 0.5, window.innerHeight * 0.4, 36); } catch (e) {}
      if (speak) tell(theme);
    }
  }

  el.themeBtn.addEventListener("click", () => switchTheme(state.theme === "night" ? "day" : "night"));
  $$("[data-theme-set]").forEach((b) => b.addEventListener("click", () => switchTheme(b.dataset.themeSet, { speak: false })));
  el.replayBtn.addEventListener("click", () => { if (state.started) tell(state.theme, { withGreeting: false }); });

  // Tap Pip → giggle
  el.pipWrap.addEventListener("click", () => {
    if (!state.started) return;
    try { stopAllSpeech(); } catch (e) {}
    act("giggle", 650);
    sparkle(5, ["💗", "✨", "⭐"]);
    const token = ++state.token;
    const line = pick(GIGGLES);
    showBubble(line);
    Music.duck(true);
    say(line, token).then(() => { if (token === state.token) Music.duck(false); });
  });

  /* ---------------------------------------------------------
     MUSIC — soft music-box lullaby made with the Web Audio API
     --------------------------------------------------------- */
  const Music = (() => {
    let ctx, master, bus, timer, mode = "night", step = 0, nextTime = 0;
    let enabled = true, active = false, ducked = false;
    const LEVEL = 0.8;

    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const PATTERNS = {
      night: { // slow, dreamy, sparse music-box
        bpm: 56,
        chords: [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 52, 59]],
        mel: [
          [76, 0, 79, 0, 81, 0, 79, 0], [76, 0, 74, 0, 72, 0, 0, 0],
          [74, 0, 76, 0, 79, 0, 76, 0], [74, 0, 72, 0, 0, 0, 0, 0],
        ],
        sparkle: [84, 88, 91, 86],
      },
      day: { // lighter, bouncier, still gentle
        bpm: 82,
        chords: [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]],
        mel: [
          [72, 76, 79, 76, 84, 79, 76, 79], [71, 74, 79, 74, 83, 79, 74, 79],
          [69, 72, 76, 72, 81, 76, 72, 76], [69, 72, 77, 72, 81, 77, 72, 76],
        ],
        sparkle: [88, 91, 93, 86],
      },
    };

    function impulse(seconds, decay) {
      const rate = ctx.sampleRate, len = rate * seconds;
      const buf = ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      bus = ctx.createGain(); bus.connect(master);
      const conv = ctx.createConvolver(); conv.buffer = impulse(2.8, 2.4);
      const wet = ctx.createGain(); wet.gain.value = 0.55;
      bus.connect(conv); conv.connect(wet); wet.connect(master);
      return true;
    }

    function bell(m, t, vel, dur) {
      const f = hz(m);
      [[1, "sine", 1], [2, "sine", 0.28], [4.1, "sine", 0.08]].forEach(([mult, type, amp], idx) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f * mult;
        const d = dur / (idx + 1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vel * amp, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(bus);
        o.start(t); o.stop(t + d + 0.05);
      });
    }

    function pad(m, t, dur) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "triangle"; o.frequency.value = hz(m);
      lp.type = "lowpass"; lp.frequency.value = 700;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(lp); lp.connect(g); g.connect(bus);
      o.start(t); o.stop(t + dur + 0.05);
    }

    function schedule(s, t) {
      const P = PATTERNS[mode], eighth = 30 / P.bpm;
      const bar = Math.floor(s / 8) % 4, beat = s % 8;
      if (beat === 0) {
        P.chords[bar].forEach((m) => pad(m, t, eighth * 8));
        bell(P.chords[bar][0] - 12, t, 0.16, 2.4); // soft bass note
      }
      const note = P.mel[bar][beat];
      if (note) bell(note, t, 0.13, mode === "night" ? 2.2 : 1.4);
      else if (beat % 2 === 1 && Math.random() < 0.14) bell(pick(P.sparkle), t, 0.045, 2.6); // random twinkle
    }

    function tick() {
      const eighth = 30 / PATTERNS[mode].bpm;
      while (nextTime < ctx.currentTime + 0.3) {
        schedule(step, nextTime);
        nextTime += eighth; step++;
      }
    }

    function apply(time = 1.2) {
      if (!ctx) return;
      const target = enabled && active ? LEVEL * (ducked ? 0.35 : 1) : 0;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(target, ctx.currentTime, time / 3);
    }

    return {
      start() {
        if (!ctx && !init()) return;
        ctx.resume();
        active = true;
        if (!timer) { nextTime = ctx.currentTime + 0.15; step = 0; timer = setInterval(tick, 50); }
        apply(2);
      },
      pause() { // used when leaving page 1
        active = false; apply(0.8);
        setTimeout(() => { if (!active && timer) { clearInterval(timer); timer = null; } }, 1500);
      },
      resume() { if (state.started) this.start(); },
      setEnabled(on) { enabled = on; apply(0.5); },
      isEnabled: () => enabled,
      duck(on) { ducked = on; apply(0.6); },
      setMode(m) { mode = m; step = Math.ceil(step / 8) * 8; },
      suspend() { if (ctx) ctx.suspend(); },
      unsuspend() { if (ctx && active && enabled) ctx.resume(); },
    };
  })();

  el.musicBtn.addEventListener("click", () => {
    state.musicOn = !state.musicOn;
    Music.setEnabled(state.musicOn);
    el.musicBtn.setAttribute("aria-pressed", String(state.musicOn));
    el.musicBtn.setAttribute("aria-label", state.musicOn ? "Mute music" : "Unmute music");
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? Music.suspend() : Music.unsuspend()));

  /* ---------------------------------------------------------
     STAR SHOWER (canvas)
     --------------------------------------------------------- */
  const Shower = (() => {
    const c = el.canvas, g = c.getContext("2d");
    let W = 0, H = 0, dpr = 1, parts = [], running = false, rate = 0, heavyUntil = 0, endAt = 0;
    const PAL = {
      night: ["#ffe08a", "#ffffff", "#b9a4ff", "#ffb3d9", "#9fd3ff"],
      day:   ["#ffd37a", "#fff1c1", "#e07a10", "#c2410c", "#7a3b12"],
    };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      c.width = W * dpr; c.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize); resize();

    function starPath(x, y, r, rot) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r, a = rot + (i * Math.PI) / 5 - Math.PI / 2;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
    }

    function spawnFall() {
      const col = pick(PAL[state.theme]);
      parts.push({
        x: rand(-0.1 * W, 1.1 * W), y: -20, vx: rand(-1.6, -0.2), vy: rand(2.4, 6),
        r: rand(5, 13), rot: rand(0, 6), vr: rand(-0.05, 0.05), col, life: 1, trail: true, tw: rand(0, 6),
      });
    }

    function frame(t) {
      if (!running) return;
      g.clearRect(0, 0, W, H);
      const heavy = t < heavyUntil;
      const r = heavy ? 3.2 : (state.page === 2 ? 0.12 : 0);
      rate += r; // accumulate fractional spawns
      while (rate >= 1 && parts.length < 260) { spawnFall(); rate -= 1; }
      if (rate >= 1) rate = 0;
      parts = parts.filter((p) => p.y < H + 40 && p.life > 0.02);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.tw += 0.15;
        if (p.burst) { p.vy += 0.06; p.life -= 0.016; }
        const alpha = Math.max(0, p.life) * (0.75 + 0.25 * Math.sin(p.tw));
        g.globalAlpha = alpha;
        if (p.trail) { // glowing streak behind each star
          const grad = g.createLinearGradient(p.x, p.y, p.x - p.vx * 12, p.y - p.vy * 12);
          grad.addColorStop(0, p.col); grad.addColorStop(1, "transparent");
          g.strokeStyle = grad; g.lineWidth = p.r * 0.35; g.lineCap = "round";
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 12, p.y - p.vy * 12); g.stroke();
        }
        g.fillStyle = p.col; g.shadowColor = p.col; g.shadowBlur = 12;
        starPath(p.x, p.y, p.r, p.rot); g.fill();
      }
      g.shadowBlur = 0; g.globalAlpha = 1;
      if (!parts.length && !heavy && state.page !== 2) { running = false; return; }
      requestAnimationFrame(frame);
    }

    function run() { if (!running) { running = true; requestAnimationFrame(frame); } }

    return {
      start(ms = 6000) { heavyUntil = performance.now() + ms; run(); },
      burst(x, y, n = 30) {
        if (reduceMotion) return;
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), s = rand(2, 7);
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: rand(4, 9), rot: rand(0, 6),
            vr: rand(-0.1, 0.1), col: pick(PAL[state.theme]), life: 1, burst: true, tw: rand(0, 6) });
        }
        run();
      },
      recolor() { parts.forEach((p) => (p.col = pick(PAL[state.theme]))); },
      clear() { parts = []; },
    };
  })();

  /* ---------------------------------------------------------
     NAVIGATION (page 1 ⇄ page 2 ⇄ pageStorybook) + MENU
     --------------------------------------------------------- */
  function show(n) {
    try { stopAllSpeech(); } catch (e) {}
    state.page = n;
    const isP1 = n === 1 || n === "page1";
    const isP2 = n === 2 || n === "page2";
    const isStory = n === 3 || n === "storybook" || n === "pageStorybook";

    el.page1.classList.toggle("active", isP1);
    el.page2.classList.toggle("active", isP2);
    if (el.pageStorybook) el.pageStorybook.classList.toggle("active", isStory);

    el.page1.setAttribute("aria-hidden", String(!isP1));
    el.page2.setAttribute("aria-hidden", String(!isP2));
    if (el.pageStorybook) el.pageStorybook.setAttribute("aria-hidden", String(!isStory));

    window.scrollTo(0, 0);
  }

  el.nextBtn.addEventListener("click", () => {
    try { stopAllSpeech(); } catch (e) {}
    show(2);                           // switch page first, so nothing can block it
    try { Music.pause(); } catch (e) { /* music lives on page 1 only */ }
    try {
      Shower.burst(window.innerWidth / 2, window.innerHeight - 70, 40);
      Shower.start(6500);              // ✨ star shower!
    } catch (e) { /* canvas problem – page still opens */ }
  });

  function toggleMenu(open) {
    const isOpen = open ?? !el.menuPanel.classList.contains("open");
    el.menuPanel.classList.toggle("open", isOpen);
    el.menuBtn.setAttribute("aria-expanded", String(isOpen));
    el.menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  }
  el.menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    try { stopAllSpeech(); } catch (err) {}
    toggleMenu();
  });
  document.addEventListener("click", (e) => { if (!el.menuPanel.contains(e.target) && e.target !== el.menuBtn) toggleMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleMenu(false); });

  $$(".menu-link").forEach((b) =>
    b.addEventListener("click", () => {
      try { stopAllSpeech(); } catch (err) {}
      if (b.dataset.go === "home") {
        toggleMenu(false);
        show(1);
        try { Music.resume(); } catch (e) {}
        sparkle(6);
      } else if (b.dataset.go === "storybook") {
        toggleMenu(false);
        try { Music.pause(); } catch (e) {}
        show(3);
        if (window.BedtimeStorybook) {
          window.BedtimeStorybook.renderCurrentPage();
        }
      } else if (b.dataset.soon) {
        toast(`${b.dataset.soon} is coming soon ✨`);
      }
    })
  );

  if (el.openStorybookHeroBtn) {
    el.openStorybookHeroBtn.addEventListener("click", () => {
      try { stopAllSpeech(); } catch (err) {}
      try { Music.pause(); } catch (e) {}
      show(3);
      if (window.BedtimeStorybook) {
        window.BedtimeStorybook.renderCurrentPage();
      }
    });
  }

  if (el.storybookThemeBtn) {
    el.storybookThemeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      switchTheme(state.theme === "night" ? "day" : "night", { speak: false });
    });
  }

  /* ===========================================================
     FEATURE 5: BEDTIME STORYBOOK ENGINE
     “Pip and the Little Star That Forgot to Shine”
     7 Pages with original dreamy narrative, matching vector SVG
     scenes, previous/next controls, page counter, progress bar,
     and Read Aloud / Pause / Stop with speech cancellation.
     =========================================================== */

  const storyPages = [
    {
      page: 1,
      chapter: 'Chapter 1',
      mood: '🌙 Quiet & Dreamy',
      title: 'The Midnight Nursery',
      caption: 'Page 1 · The Midnight Nursery',
      paragraphs: [
        'High above the slumbering world, nestled inside a soft lavender cloud, Pip the skull baby adjusted his starry nightcap.',
        'Tonight was extra cozy in the Midnight Nursery. Moonbeam tea was simmering, and cotton-candy breezes whispered through the starry sky.',
        'Pip looked through his brass moon-telescope and spotted something unusual: a tiny star sitting all alone on a fluffy pink puff, looking very dim and sad.'
      ],
      svg: `
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pip looking through a brass telescope at a dim little star">
          <defs>
            <radialGradient id="skyGrad1" cx="60%" cy="25%" r="75%">
              <stop offset="0%" stop-color="#4a368c" />
              <stop offset="60%" stop-color="#241a54" />
              <stop offset="100%" stop-color="#120c2e" />
            </radialGradient>
            <radialGradient id="moonGlow1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fff8db" />
              <stop offset="60%" stop-color="#fde047" stop-opacity="0.6" />
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="amberEye" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="40%" stop-color="#fde047" />
              <stop offset="90%" stop-color="#d97706" />
            </radialGradient>
          </defs>

          <!-- Sky background -->
          <rect width="400" height="300" fill="url(#skyGrad1)" rx="20" />

          <!-- Distant twinkling stars -->
          <circle cx="50" cy="45" r="1.8" fill="#ffd1e8" opacity="0.8" />
          <circle cx="120" cy="30" r="2.2" fill="#fff" opacity="0.9" />
          <circle cx="210" cy="50" r="1.5" fill="#fde047" opacity="0.8" />
          <circle cx="340" cy="85" r="2" fill="#ffd1e8" opacity="0.75" />
          <circle cx="280" cy="35" r="2.5" fill="#fff" opacity="0.85" />
          <text x="75" y="80" fill="#ffb6d9" font-size="12" class="anim-sparkle">✦</text>
          <text x="170" y="70" fill="#ddd6fe" font-size="10" class="anim-sparkle">✧</text>
          <text x="350" y="45" fill="#fef08a" font-size="14" class="anim-sparkle">✦</text>

          <!-- Crescent Moon with sleepy smile -->
          <g transform="translate(305, 40)" class="anim-bob">
            <circle cx="25" cy="25" r="32" fill="url(#moonGlow1)" />
            <path d="M 38 6 C 20 6 8 20 8 38 C 8 50 14 60 24 66 C 14 62 6 50 6 36 C 6 18 20 4 38 6 Z" fill="#fef08a" />
            <!-- Sleeping face on moon -->
            <path d="M 17 32 Q 21 35 25 32" stroke="#b45309" stroke-width="1.8" fill="none" stroke-linecap="round" />
            <circle cx="16" cy="36" r="3" fill="#ffb6d9" opacity="0.7" />
          </g>

          <!-- Soft background pastel clouds -->
          <path d="M -20 250 Q 30 200 90 230 Q 150 190 210 230 Q 280 200 350 235 Q 410 210 430 260 L 430 310 L -20 310 Z" fill="#2d1f66" opacity="0.7" />
          <path d="M 0 260 Q 60 215 130 245 Q 200 210 270 245 Q 340 220 410 265 L 410 310 L 0 310 Z" fill="#d8b4fe" opacity="0.45" />

          <!-- Dim Little Star (Twinkle) sitting sadly on a far pink cloud -->
          <g transform="translate(65, 125)">
            <path d="M -25 35 Q -10 15 15 22 Q 35 15 50 32 Q 60 45 40 52 Q 10 56 -10 50 Z" fill="#ffb6d9" opacity="0.85" />
            <g class="anim-bob">
              <path d="M 15 5 L 18 16 L 29 16 L 20 23 L 23 34 L 15 27 L 7 34 L 10 23 L 1 16 L 12 16 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" stroke-linejoin="round" />
              <path d="M 11 19 Q 13 21 15 19" stroke="#64748b" stroke-width="1" fill="none" />
              <path d="M 17 19 Q 19 21 21 19" stroke="#64748b" stroke-width="1" fill="none" />
              <circle cx="19" cy="24" r="1.2" fill="#93c5fd" />
            </g>
          </g>

          <!-- Pip on Cloud Balcony (Authentic Pip from First Page) -->
          <g class="anim-bob">
            <!-- Cloud Balcony under Pip -->
            <ellipse cx="280" cy="245" rx="85" ry="28" fill="#ffffff" opacity="0.95" />
            <ellipse cx="280" cy="240" rx="65" ry="20" fill="#ffd1e8" opacity="0.6" />

            <!-- Pip character (same as first page) -->
            <image class="scene-pip scene-pip-night" href="pip_night.png" xlink:href="pip_night.png" x="205" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />
            <image class="scene-pip scene-pip-day" href="pip_day.png" xlink:href="pip_day.png" x="205" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />

            <!-- Brass Moon-Telescope mounted on stand pointing toward Twinkle -->
            <g transform="translate(195, 150) rotate(-16)">
              <rect x="-16" y="-3" width="32" height="7" rx="2" fill="#f59e0b" stroke="#78350f" stroke-width="1.2" />
              <rect x="16" y="-5" width="8" height="11" rx="2" fill="#d97706" />
              <rect x="-22" y="-4" width="6" height="9" rx="1.5" fill="#d97706" />
              <!-- Tripod mount -->
              <line x1="0" y1="4" x2="-8" y2="28" stroke="#d97706" stroke-width="2" stroke-linecap="round" />
              <line x1="0" y1="4" x2="6" y2="28" stroke="#d97706" stroke-width="2" stroke-linecap="round" />
              <ellipse cx="-1" cy="29" rx="14" ry="4" fill="#ffffff" opacity="0.8" />
            </g>
          </g>
        </svg>
      `
    },
    {
      page: 2,
      chapter: 'Chapter 2',
      mood: '☁️ Gentle & Sweet',
      title: 'A Dim Little Friend',
      caption: 'Page 2 · A Dim Little Friend',
      paragraphs: [
        'Pip floated over on a marshmallow cloud pod, his glowing amber eyes blinking with warmth.',
        '“Hello there, little friend,” Pip whispered with his gentle baby voice.',
        'The tiny star curled its sleepy points and sniffed softly. “My name is Twinkle,” the star murmured, “and I think my sparkle is all gone. Everyone else is glittering like sugar, but my light won’t turn on tonight.”'
      ],
      svg: `
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pip approaching Twinkle the sad little star on a cloud pod">
          <defs>
            <radialGradient id="skyGrad2" cx="40%" cy="30%" r="75%">
              <stop offset="0%" stop-color="#4e3391" />
              <stop offset="60%" stop-color="#2c1a59" />
              <stop offset="100%" stop-color="#150a33" />
            </radialGradient>
            <radialGradient id="amberEye2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="40%" stop-color="#fde047" />
              <stop offset="90%" stop-color="#d97706" />
            </radialGradient>
          </defs>

          <rect width="400" height="300" fill="url(#skyGrad2)" rx="20" />
          <text x="60" y="50" fill="#ffd1e8" font-size="12" class="anim-sparkle">✧</text>
          <text x="200" y="60" fill="#ffb6d9" font-size="14" class="anim-bob">♥</text>
          <text x="320" y="45" fill="#fde047" font-size="11" class="anim-sparkle">✦</text>

          <!-- Pip floating over (Authentic Pip from First Page) -->
          <g class="anim-bob">
            <!-- Marshmallow cloud pod glow -->
            <ellipse cx="115" cy="245" rx="85" ry="28" fill="#ffffff" opacity="0.92" />
            <ellipse cx="115" cy="240" rx="65" ry="20" fill="#ffd1e8" opacity="0.6" />

            <!-- Pip character (same as first page) -->
            <image class="scene-pip scene-pip-night" href="pip_night.png" xlink:href="pip_night.png" x="40" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />
            <image class="scene-pip scene-pip-day" href="pip_day.png" xlink:href="pip_day.png" x="40" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />

            <!-- Friendly greeting sparkles -->
            <text x="175" y="145" fill="#fde047" font-size="14" class="anim-sparkle">✦</text>
            <text x="195" y="165" fill="#ffb6d9" font-size="12" class="anim-sparkle">♥</text>
            <text x="215" y="135" fill="#ddd6fe" font-size="11" class="anim-sparkle">✧</text>
          </g>

          <!-- Twinkle Star on its pink puff -->
          <g transform="translate(265, 125)" class="anim-bob">
            <ellipse cx="25" cy="65" rx="55" ry="25" fill="#ffd1e8" opacity="0.9" />
            <ellipse cx="25" cy="60" rx="45" ry="18" fill="#ffffff" opacity="0.8" />

            <path d="M 25 0 L 33 22 L 56 22 L 38 36 L 44 58 L 25 44 L 6 58 L 12 36 L -6 22 L 17 22 Z" fill="#d1d5db" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round" />
            <path d="M 17 27 Q 21 31 25 27" stroke="#4b5563" stroke-width="2" fill="none" stroke-linecap="round" />
            <path d="M 28 27 Q 32 31 36 27" stroke="#4b5563" stroke-width="2" fill="none" stroke-linecap="round" />
            <circle cx="15" cy="35" r="3.5" fill="#f472b6" opacity="0.45" />
            <circle cx="35" cy="35" r="3.5" fill="#f472b6" opacity="0.45" />
            <path d="M 23 38 Q 26 35 29 38" stroke="#4b5563" stroke-width="1.6" fill="none" stroke-linecap="round" />
            <circle cx="16" cy="31" r="2" fill="#93c5fd" />
          </g>

          <circle cx="215" cy="140" r="3" fill="#ffb6d9" opacity="0.8" />
          <circle cx="230" cy="132" r="4.5" fill="#d8b4fe" opacity="0.8" />
          <circle cx="248" cy="122" r="6" fill="#fef08a" opacity="0.85" />
        </svg>
      `
    },
    {
      page: 3,
      chapter: 'Chapter 3',
      mood: '🌸 Warm & Comforting',
      title: 'The Blanket of Lavender Dreams',
      caption: 'Page 3 · The Blanket of Lavender Dreams',
      paragraphs: [
        'Pip smiled his crooked little smile and reached into his satchel of lullabies.',
        '“Sometimes when dream engineers feel empty, we just need to get cozy,” Pip explained.',
        'He gently wrapped Twinkle in a warm quilt spun from spun-sugar clouds and lavender dreams. Twinkle sighed a soft, cozy sigh, and a faint rosy blush began to bloom on its little star cheeks.'
      ],
      svg: `
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pip wrapping Twinkle in a cozy patchwork blanket">
          <defs>
            <radialGradient id="skyGrad3" cx="50%" cy="30%" r="75%">
              <stop offset="0%" stop-color="#553594" />
              <stop offset="60%" stop-color="#301c60" />
              <stop offset="100%" stop-color="#180c38" />
            </radialGradient>
            <radialGradient id="warmAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.8" />
              <stop offset="60%" stop-color="#f472b6" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#c084fc" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="amberEye3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="40%" stop-color="#fde047" />
              <stop offset="90%" stop-color="#d97706" />
            </radialGradient>
          </defs>

          <rect width="400" height="300" fill="url(#skyGrad3)" rx="20" />
          <ellipse cx="200" cy="265" rx="190" ry="50" fill="#3b2778" opacity="0.6" />
          <ellipse cx="200" cy="250" rx="160" ry="40" fill="#ffffff" opacity="0.9" />
          <ellipse cx="200" cy="240" rx="140" ry="30" fill="#ffd1e8" opacity="0.7" />

          <!-- Warm cozy aura behind Twinkle -->
          <circle cx="255" cy="155" r="75" fill="url(#warmAura)" class="anim-bob" />

          <!-- Pip with satchel (Authentic Pip from First Page) -->
          <g class="anim-bob">
            <!-- Pip character (same as first page) -->
            <image class="scene-pip scene-pip-night" href="pip_night.png" xlink:href="pip_night.png" x="35" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />
            <image class="scene-pip scene-pip-day" href="pip_day.png" xlink:href="pip_day.png" x="35" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />

            <!-- Satchel of lullabies beside Pip -->
            <g transform="translate(150, 165)">
              <rect x="0" y="0" width="26" height="20" rx="5" fill="#a78bfa" stroke="#4c1d95" stroke-width="1.5" />
              <path d="M 0 7 Q 13 14 26 7" stroke="#4c1d95" stroke-width="1.4" fill="none" />
              <text x="8" y="15" fill="#fef08a" font-size="9">✦</text>
              <circle cx="13" cy="7" r="2.5" fill="#fde047" stroke="#b45309" stroke-width="0.8" />
            </g>
          </g>

          <!-- Twinkle Star Snuggled inside the Patchwork Blanket -->
          <g transform="translate(230, 115)" class="anim-bob">
            <polygon points="25,5 33,26 17,26" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
            <polygon points="45,35 25,28 35,45" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
            <polygon points="5,35 25,28 15,45" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />

            <path d="M 18 34 Q 22 37 25 34" stroke="#4b5563" stroke-width="2" fill="none" stroke-linecap="round" />
            <path d="M 28 34 Q 32 37 35 34" stroke="#4b5563" stroke-width="2" fill="none" stroke-linecap="round" />
            <circle cx="16" cy="40" r="4" fill="#fb7185" opacity="0.65" />
            <circle cx="36" cy="40" r="4" fill="#fb7185" opacity="0.65" />
            <path d="M 23 44 Q 26 47 30 44" stroke="#4b5563" stroke-width="1.6" fill="none" stroke-linecap="round" />

            <g transform="translate(-10, 42)">
              <path d="M 0 10 Q 35 -5 70 10 Q 75 45 60 60 Q 35 70 5 60 Q -8 40 0 10 Z" fill="#d8b4fe" stroke="#a855f7" stroke-width="2" />
              <rect x="8" y="10" width="22" height="20" rx="4" fill="#ffb6d9" opacity="0.85" />
              <rect x="34" y="10" width="24" height="20" rx="4" fill="#fef08a" opacity="0.85" />
              <rect x="8" y="34" width="24" height="20" rx="4" fill="#a7f3d0" opacity="0.85" />
              <rect x="36" y="34" width="22" height="20" rx="4" fill="#fed7aa" opacity="0.85" />
              <line x1="32" y1="8" x2="32" y2="56" stroke="#7e22ce" stroke-width="1.2" stroke-dasharray="3,2" />
              <line x1="6" y1="32" x2="62" y2="32" stroke="#7e22ce" stroke-width="1.2" stroke-dasharray="3,2" />
              <text x="14" y="24" fill="#db2777" font-size="9">♥</text>
              <text x="42" y="24" fill="#d97706" font-size="9">✦</text>
            </g>
          </g>

          <text x="180" y="80" fill="#ffd1e8" font-size="12" class="anim-sparkle">✦</text>
          <text x="310" y="100" fill="#fef08a" font-size="14" class="anim-sparkle">✧</text>
          <text x="240" y="65" fill="#f472b6" font-size="11">♥</text>
        </svg>
      `
    },
    {
      page: 4,
      chapter: 'Chapter 4',
      mood: '🎶 Musical & Soothing',
      title: 'The Moonbeam Melody',
      caption: 'Page 4 · The Moonbeam Melody',
      paragraphs: [
        'Pip pulled out his celestial music box, carved from an old falling star.',
        'He gently wound the golden key: Tink... chime... shimmer... A melody as soft as kitten whiskers floated into the air.',
        'Pip sang along in his sweet little voice, humming a sleepy lullaby about peaceful nights, sweet dreams, and the quiet beauty of resting before you shine.'
      ],
      svg: `
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pip playing a celestial music box for Twinkle">
          <defs>
            <radialGradient id="skyGrad4" cx="50%" cy="30%" r="75%">
              <stop offset="0%" stop-color="#4f388e" />
              <stop offset="60%" stop-color="#2d1c5b" />
              <stop offset="100%" stop-color="#140a32" />
            </radialGradient>
            <radialGradient id="musicGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="50%" stop-color="#ffb6d9" stop-opacity="0.6" />
              <stop offset="100%" stop-color="#c084fc" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="amberEye4" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="40%" stop-color="#fde047" />
              <stop offset="90%" stop-color="#d97706" />
            </radialGradient>
          </defs>

          <rect width="400" height="300" fill="url(#skyGrad4)" rx="20" />
          <path d="M 120 180 Q 180 120 240 160 Q 300 200 360 140" stroke="#fbcfe8" stroke-width="3" fill="none" opacity="0.6" stroke-dasharray="6,4" />
          <path d="M 140 190 Q 200 130 260 170 Q 320 210 370 155" stroke="#fde047" stroke-width="2" fill="none" opacity="0.5" />

          <!-- Musical notes floating -->
          <g class="anim-note-1" transform="translate(170, 140)"><text x="0" y="0" fill="#fde047" font-size="20">♪</text></g>
          <g class="anim-note-2" transform="translate(205, 120)"><text x="0" y="0" fill="#ffb6d9" font-size="22">♫</text></g>
          <g class="anim-note-3" transform="translate(235, 105)"><text x="0" y="0" fill="#c084fc" font-size="18">♬</text></g>

          <!-- Pip with Music Box (Authentic Pip from First Page) -->
          <g class="anim-bob">
            <!-- Pip character (same as first page) -->
            <image class="scene-pip scene-pip-night" href="pip_night.png" xlink:href="pip_night.png" x="25" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />
            <image class="scene-pip scene-pip-day" href="pip_day.png" xlink:href="pip_day.png" x="25" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />

            <!-- Golden Music Box beside Pip -->
            <g transform="translate(138, 150)">
              <circle cx="18" cy="18" r="28" fill="url(#musicGlow)" opacity="0.75" />
              <rect x="0" y="10" width="36" height="24" rx="4" fill="#f59e0b" stroke="#78350f" stroke-width="2" />
              <rect x="2" y="12" width="32" height="6" fill="#fde047" />
              <polygon points="0,10 10,-4 46,-4 36,10" fill="#fbbf24" stroke="#78350f" stroke-width="1.5" />
              <g transform="translate(18, 5)" class="anim-sparkle">
                <polygon points="0,-6 2,-2 6,-2 3,1 4,5 0,3 -4,5 -3,1 -6,-2 -2,-2" fill="#fffbeb" stroke="#d97706" stroke-width="1" />
              </g>
            </g>
          </g>

          <!-- Twinkle Listening Happily -->
          <g transform="translate(260, 115)" class="anim-bob">
            <ellipse cx="30" cy="115" rx="60" ry="25" fill="#ffffff" opacity="0.9" />
            <ellipse cx="30" cy="110" rx="45" ry="18" fill="#e9d5ff" opacity="0.7" />

            <path d="M 30 10 L 38 32 L 61 32 L 43 46 L 49 68 L 30 54 L 11 68 L 17 46 L -1 32 L 22 32 Z" fill="#fef9c3" stroke="#eab308" stroke-width="2" stroke-linejoin="round" />
            <ellipse cx="23" cy="38" rx="3" ry="4" fill="#241a54" />
            <ellipse cx="37" cy="38" rx="3" ry="4" fill="#241a54" />
            <circle cx="22" cy="36" r="1.2" fill="#fff" />
            <circle cx="36" cy="36" r="1.2" fill="#fff" />
            <circle cx="16" cy="44" r="4.5" fill="#f43f5e" opacity="0.5" />
            <circle cx="44" cy="44" r="4.5" fill="#f43f5e" opacity="0.5" />
            <path d="M 25 48 Q 30 53 35 48" stroke="#241a54" stroke-width="2" fill="none" stroke-linecap="round" />
          </g>
        </svg>
      `
    },
    {
      page: 5,
      chapter: 'Chapter 5',
      mood: '🫖 Cozy & Peaceful',
      title: 'A Cup of Stardust Tea',
      caption: 'Page 5 · A Cup of Stardust Tea',
      paragraphs: [
        'Next, Pip poured Twinkle a porcelain thimble filled with warm honey-dew and chamomile stardust.',
        '“You don’t always have to blaze brightly across the sky,” Pip whispered kindly. “Even the biggest stars take naps. It is okay to rest until your heart is ready.”',
        'Twinkle took a tiny sip, and a warm golden tingle tickled all five of its tips.'
      ],
      svg: `
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pip and Twinkle enjoying stardust tea on a cloud">
          <defs>
            <radialGradient id="skyGrad5" cx="50%" cy="30%" r="75%">
              <stop offset="0%" stop-color="#51338a" />
              <stop offset="60%" stop-color="#2d1a58" />
              <stop offset="100%" stop-color="#140a32" />
            </radialGradient>
            <radialGradient id="teaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="60%" stop-color="#fed7aa" stop-opacity="0.5" />
              <stop offset="100%" stop-color="#fb7185" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="amberEye5" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="40%" stop-color="#fde047" />
              <stop offset="90%" stop-color="#d97706" />
            </radialGradient>
          </defs>

          <rect width="400" height="300" fill="url(#skyGrad5)" rx="20" />
          <ellipse cx="200" cy="240" rx="175" ry="45" fill="#ffffff" opacity="0.92" />
          <ellipse cx="200" cy="230" rx="145" ry="32" fill="#ffd1e8" opacity="0.65" />

          <!-- Pip on Left sipping tea (Authentic Pip from First Page) -->
          <g class="anim-bob">
            <image class="scene-pip scene-pip-night" href="pip_night.png" xlink:href="pip_night.png" x="20" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />
            <image class="scene-pip scene-pip-day" href="pip_day.png" xlink:href="pip_day.png" x="20" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />
          </g>

          <!-- Cloud Table & Tea between Pip and Twinkle -->
          <g transform="translate(155, 155)">
            <ellipse cx="30" cy="30" rx="35" ry="14" fill="#ffffff" stroke="#e9d5ff" stroke-width="2" />
            <path d="M 20 18 Q 30 8 40 18 L 42 26 Q 30 30 18 26 Z" fill="#f472b6" stroke="#9d174d" stroke-width="1.5" />
            <circle cx="30" cy="9" r="2.5" fill="#fef08a" />
            <path d="M 40 18 Q 48 20 40 25" stroke="#9d174d" stroke-width="1.8" fill="none" stroke-linecap="round" />
            <path d="M 18 20 Q 12 18 10 14" stroke="#9d174d" stroke-width="1.8" fill="none" stroke-linecap="round" />

            <g class="anim-steam-1" transform="translate(26, -5)"><text x="0" y="0" fill="#fbcfe8" font-size="12">♥</text></g>
            <g class="anim-steam-2" transform="translate(32, -14)"><text x="0" y="0" fill="#fef08a" font-size="9">✦</text></g>

            <rect x="8" y="24" width="7" height="8" rx="1.5" fill="#fef08a" stroke="#b45309" stroke-width="1" />
            <rect x="45" y="24" width="7" height="8" rx="1.5" fill="#fef08a" stroke="#b45309" stroke-width="1" />
          </g>

          <!-- Twinkle glowing from tea -->
          <g transform="translate(250, 115)" class="anim-bob">
            <circle cx="30" cy="40" r="38" fill="url(#teaGlow)" opacity="0.8" />
            <path d="M 30 10 L 38 32 L 61 32 L 43 46 L 49 68 L 30 54 L 11 68 L 17 46 L -1 32 L 22 32 Z" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round" />
            <polygon points="30,10 33,20 27,20" fill="#f59e0b" />
            <polygon points="61,32 50,33 54,39" fill="#f59e0b" />
            <polygon points="-1,32 10,33 6,39" fill="#f59e0b" />
            <path d="M 20 38 Q 24 41 27 38" stroke="#241a54" stroke-width="2" fill="none" stroke-linecap="round" />
            <path d="M 33 38 Q 36 41 40 38" stroke="#241a54" stroke-width="2" fill="none" stroke-linecap="round" />
            <circle cx="18" cy="45" r="4.5" fill="#fb7185" opacity="0.6" />
            <circle cx="42" cy="45" r="4.5" fill="#fb7185" opacity="0.6" />
            <path d="M 26 48 Q 30 52 34 48" stroke="#241a54" stroke-width="2" fill="none" stroke-linecap="round" />
          </g>
        </svg>
      `
    },
    {
      page: 6,
      chapter: 'Chapter 6',
      mood: '✨ Radiant & Joyful',
      title: 'The Spark of Friendship',
      caption: 'Page 6 · The Spark of Friendship',
      paragraphs: [
        'Suddenly, a golden spark ignited deep inside Twinkle’s belly!',
        'First it blushed warm peach, then radiant rose, and then—POP!—a magnificent burst of pastel starlight lit up the night!',
        'Twinkle giggled, swirling around Pip in joyful loops, sprinkling glitter all over Pip’s nightcap. “I remember now!” cried Twinkle. “Kindness and friendship are what make stars shine!”'
      ],
      svg: `
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Twinkle bursting with radiant pastel light and swirling joyfully around Pip">
          <defs>
            <radialGradient id="skyGrad6" cx="50%" cy="30%" r="75%">
              <stop offset="0%" stop-color="#5b2f96" />
              <stop offset="60%" stop-color="#321666" />
              <stop offset="100%" stop-color="#140838" />
            </radialGradient>
            <radialGradient id="burstGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="35%" stop-color="#fef08a" />
              <stop offset="70%" stop-color="#ffb6d9" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#c084fc" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="amberEye6" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="40%" stop-color="#fde047" />
              <stop offset="90%" stop-color="#d97706" />
            </radialGradient>
          </defs>

          <rect width="400" height="300" fill="url(#skyGrad6)" rx="20" />

          <!-- Radiant rays -->
          <g transform="translate(230, 110)" class="anim-star-pulse">
            <circle cx="0" cy="0" r="95" fill="url(#burstGlow)" />
            <line x1="0" y1="-85" x2="0" y2="85" stroke="#fef08a" stroke-width="2.5" opacity="0.8" />
            <line x1="-85" y1="0" x2="85" y2="0" stroke="#fef08a" stroke-width="2.5" opacity="0.8" />
            <line x1="-60" y1="-60" x2="60" y2="60" stroke="#ffb6d9" stroke-width="2" opacity="0.75" />
            <line x1="60" y1="-60" x2="-60" y2="60" stroke="#c084fc" stroke-width="2" opacity="0.75" />
          </g>

          <!-- Sparkling orbit -->
          <g transform="translate(230, 110)" class="anim-sparkle">
            <text x="50" y="30" fill="#fde047" font-size="16">✦</text>
            <text x="-65" y="20" fill="#ffb6d9" font-size="14">✦</text>
            <text x="20" y="-60" fill="#ffffff" font-size="18">✧</text>
            <text x="-40" y="-45" fill="#ddd6fe" font-size="14">✦</text>
            <text x="35" y="65" fill="#f472b6" font-size="12">♥</text>
            <text x="-55" y="55" fill="#fde047" font-size="12">♥</text>
          </g>

          <!-- Dazzling Twinkle Star -->
          <g transform="translate(230, 110)" class="anim-bob">
            <g transform="translate(-30, -35)">
              <path d="M 30 5 L 38 27 L 61 27 L 43 41 L 49 63 L 30 49 L 11 63 L 17 41 L -1 27 L 22 27 Z" fill="#fffbeb" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round" />
              <ellipse cx="23" cy="33" rx="3.5" ry="4.5" fill="#1e1645" />
              <ellipse cx="37" cy="33" rx="3.5" ry="4.5" fill="#1e1645" />
              <circle cx="21" cy="31" r="1.5" fill="#fff" />
              <circle cx="35" cy="31" r="1.5" fill="#fff" />
              <circle cx="15" cy="39" r="5" fill="#fb7185" opacity="0.7" />
              <circle cx="45" cy="39" r="5" fill="#fb7185" opacity="0.7" />
              <path d="M 24 40 Q 30 50 36 40 Z" fill="#d97706" />
            </g>
          </g>

          <!-- Pip celebrating with joy (Authentic Pip from First Page) -->
          <g class="anim-bob">
            <image class="scene-pip scene-pip-night" href="pip_night.png" xlink:href="pip_night.png" x="25" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />
            <image class="scene-pip scene-pip-day" href="pip_day.png" xlink:href="pip_day.png" x="25" y="72" width="150" height="195" preserveAspectRatio="xMidYMid meet" />

            <!-- Stardust glitter sprinkled around Pip -->
            <text x="12" y="55" fill="#fef08a" font-size="14" class="anim-sparkle">✦</text>
            <text x="145" y="65" fill="#ffb6d9" font-size="15" class="anim-sparkle">✨</text>
            <text x="35" y="125" fill="#ffd1e8" font-size="12">♥</text>
            <text x="140" y="115" fill="#fde047" font-size="13">✦</text>
          </g>
        </svg>
      `
    },
    {
      page: 7,
      chapter: 'Chapter 7',
      mood: '🌙 Sweet Dreams & Peaceful',
      title: 'Goodnight, Little Stars',
      caption: 'Page 7 · Goodnight, Little Stars',
      paragraphs: [
        'Together, Pip and Twinkle floated up to the highest velvet arch of the night sky.',
        'With one happy leap, Twinkle took its place right beside the glowing crescent moon, casting a gentle pinkish-gold lullaby light over all sleeping dreamers down below.',
        'Pip waved his little hand, snuggled into his cloud hammock, and closed his eyes. “Goodnight, Twinkle. Sweet dreams, world.”'
      ],
      svg: `
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Twinkle shining beside the crescent moon while Pip sleeps peacefully in a cloud hammock">
          <defs>
            <radialGradient id="skyGrad7" cx="50%" cy="20%" r="80%">
              <stop offset="0%" stop-color="#4c3285" />
              <stop offset="50%" stop-color="#281a54" />
              <stop offset="100%" stop-color="#100828" />
            </radialGradient>
            <radialGradient id="starlightWash" cx="65%" cy="30%" r="65%">
              <stop offset="0%" stop-color="#fef08a" stop-opacity="0.45" />
              <stop offset="50%" stop-color="#ffb6d9" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#100828" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="twinkleGlow7" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="50%" stop-color="#fef08a" />
              <stop offset="85%" stop-color="#f472b6" stop-opacity="0.6" />
              <stop offset="100%" stop-color="#c084fc" stop-opacity="0" />
            </radialGradient>
          </defs>

          <rect width="400" height="300" fill="url(#skyGrad7)" rx="20" />
          <rect width="400" height="300" fill="url(#starlightWash)" rx="20" />

          <!-- Constellations -->
          <circle cx="50" cy="50" r="1.8" fill="#fff" opacity="0.8" />
          <circle cx="90" cy="35" r="2.5" fill="#fde047" opacity="0.9" />
          <circle cx="140" cy="65" r="1.5" fill="#ffd1e8" opacity="0.8" />
          <text x="35" y="85" fill="#ffb6d9" font-size="12">✦</text>
          <text x="180" y="45" fill="#fef08a" font-size="10">✧</text>

          <!-- Smiling Crescent Moon at top right -->
          <g transform="translate(255, 30)" class="anim-bob">
            <circle cx="40" cy="40" r="45" fill="#fef08a" opacity="0.25" />
            <path d="M 60 10 C 35 10 18 30 18 55 C 18 72 26 86 40 94 C 26 88 15 72 15 52 C 15 28 35 8 60 10 Z" fill="#fef08a" />
            <path d="M 28 46 Q 33 50 38 46" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round" />
            <circle cx="26" cy="52" r="4" fill="#ffb6d9" opacity="0.75" />
          </g>

          <!-- Twinkle Shining Proudly beside the Moon -->
          <g transform="translate(325, 75)" class="anim-bob">
            <circle cx="25" cy="25" r="38" fill="url(#twinkleGlow7)" />
            <path d="M 25 2 L 31 18 L 47 18 L 34 28 L 39 44 L 25 34 L 11 44 L 16 28 L 3 18 L 19 18 Z" fill="#fffbeb" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round" />
            <path d="M 19 23 Q 22 26 25 23" stroke="#241a54" stroke-width="1.6" fill="none" stroke-linecap="round" />
            <path d="M 27 23 Q 30 26 33 23" stroke="#241a54" stroke-width="1.6" fill="none" stroke-linecap="round" />
            <circle cx="17" cy="28" r="3" fill="#fb7185" opacity="0.75" />
            <circle cx="33" cy="28" r="3" fill="#fb7185" opacity="0.75" />
            <path d="M 22 29 Q 25 32 28 29" stroke="#241a54" stroke-width="1.4" fill="none" stroke-linecap="round" />
          </g>

          <!-- Cloud Pillars supporting Hammock -->
          <ellipse cx="60" cy="235" rx="65" ry="35" fill="#ffffff" opacity="0.9" />
          <ellipse cx="60" cy="225" rx="50" ry="25" fill="#d8b4fe" opacity="0.5" />
          <ellipse cx="260" cy="235" rx="65" ry="35" fill="#ffffff" opacity="0.9" />
          <ellipse cx="260" cy="225" rx="50" ry="25" fill="#ffd1e8" opacity="0.5" />

          <!-- Cloud Hammock Cradle for Pip -->
          <g transform="translate(50, 95)">
            <path d="M 10 70 Q 85 140 160 70" stroke="#fbcfe8" stroke-width="4" fill="none" />
            <path d="M 10 70 Q 85 140 160 70 Q 85 160 10 70 Z" fill="#ffb6d9" opacity="0.6" />
            <path d="M 25 90 Q 85 135 145 90" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.6" stroke-dasharray="4,4" />

            <!-- Pip resting peacefully in the cloud hammock (Authentic Pip from First Page) -->
            <g class="anim-bob">
              <image class="scene-pip scene-pip-night" href="pip_night.png" xlink:href="pip_night.png" x="12" y="0" width="145" height="188" preserveAspectRatio="xMidYMid meet" />
              <image class="scene-pip scene-pip-day" href="pip_day.png" xlink:href="pip_day.png" x="12" y="0" width="145" height="188" preserveAspectRatio="xMidYMid meet" />
            </g>

            <!-- Floating z z Z drifting into dreams -->
            <g transform="translate(125, 20)" class="anim-bob">
              <text x="0" y="10" fill="#fde047" font-family="'Fredoka', cursive" font-size="13" opacity="0.75">z</text>
              <text x="12" y="-2" fill="#ffd1e8" font-family="'Fredoka', cursive" font-size="16" opacity="0.85">z</text>
              <text x="26" y="-16" fill="#fef08a" font-family="'Fredoka', cursive" font-size="22" opacity="1">Z</text>
            </g>
          </g>
        </svg>
      `
    }
  ];

  const BedtimeStorybook = (() => {
    let currentPageIndex = 0;
    let currentUtterance = null;
    let isSpeaking = false;
    let isPaused = false;
    let narrationToken = 0;
    let autoNarrateTimer = null;
    const synthAvailable = 'speechSynthesis' in window;

    // Elements
    const sceneViewport = $("#sceneViewport");
    const sceneCloudTag = $("#sceneCloudTag");
    const badgeChapter = $("#badgeChapter");
    const badgeMood = $("#badgeMood");
    const storyChapterTitle = $("#storyChapterTitle");
    const storyParagraphBox = $("#storyParagraphBox");
    const storybookProgressBar = $("#storybookProgressBar");
    const progressPercent = $("#progressPercent");
    const storybookDots = $("#storybookDots");
    const currPageNum = $("#currPageNum");
    const prevPageBtn = $("#prevPageBtn");
    const nextPageBtn = $("#nextPageBtn");

    const readAloudBtn = $("#readAloudBtn");
    const pauseNarrationBtn = $("#pauseNarrationBtn");
    const stopNarrationBtn = $("#stopNarrationBtn");
    const narratorStatus = $("#narratorStatus");
    const narratorIcon = $("#narratorIcon");
    const narrationToolbar = $(".narration-status-line");
    const storybookBackBtn = $("#storybookBackBtn");

    function clearSentenceHighlights() {
      $$(".story-sentence").forEach(span => span.classList.remove("active-spoken"));
    }

    function updateNarrationUI() {
      if (!readAloudBtn || !pauseNarrationBtn || !stopNarrationBtn) return;

      if (!synthAvailable) {
        if (narratorStatus) narratorStatus.textContent = 'Voice narration not supported in this browser';
        readAloudBtn.disabled = true;
        pauseNarrationBtn.disabled = true;
        stopNarrationBtn.disabled = true;
        return;
      }

      if (isSpeaking) {
        if (isPaused) {
          readAloudBtn.classList.remove('speaking');
          readAloudBtn.disabled = true;
          pauseNarrationBtn.disabled = false;
          $(".btn-ico", pauseNarrationBtn).textContent = '▶️';
          $(".btn-text", pauseNarrationBtn).textContent = 'Resume';
          stopNarrationBtn.disabled = false;
          if (narratorStatus) narratorStatus.textContent = 'Narration paused · Press Resume';
          if (narrationToolbar) narrationToolbar.classList.remove('reading');
        } else {
          readAloudBtn.classList.add('speaking');
          readAloudBtn.disabled = true;
          pauseNarrationBtn.disabled = false;
          $(".btn-ico", pauseNarrationBtn).textContent = '⏸️';
          $(".btn-text", pauseNarrationBtn).textContent = 'Pause';
          stopNarrationBtn.disabled = false;
          if (narratorStatus) narratorStatus.textContent = 'Pip is reading to you...';
          if (narrationToolbar) narrationToolbar.classList.add('reading');
        }
      } else {
        readAloudBtn.classList.remove('speaking');
        readAloudBtn.disabled = false;
        $(".btn-ico", readAloudBtn).textContent = '🔊';
        $(".btn-text", readAloudBtn).textContent = 'Read Aloud';

        pauseNarrationBtn.disabled = true;
        $(".btn-ico", pauseNarrationBtn).textContent = '⏸️';
        $(".btn-text", pauseNarrationBtn).textContent = 'Pause';

        stopNarrationBtn.disabled = true;

        if (narratorStatus) narratorStatus.textContent = `Pip's Storyteller ready for Page ${currentPageIndex + 1}`;
        if (narrationToolbar) narrationToolbar.classList.remove('reading');
        clearSentenceHighlights();
      }
    }

    function stopNarration() {
      if (autoNarrateTimer) {
        clearTimeout(autoNarrateTimer);
        autoNarrateTimer = null;
      }
      narrationToken++;

      if (synthAvailable) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.cancel();
        } catch (e) {}
      }

      isSpeaking = false;
      isPaused = false;
      currentUtterance = null;

      try {
        updateNarrationUI();
        clearSentenceHighlights();
      } catch (e) {}
    }

    function pauseNarration() {
      if (!synthAvailable || !isSpeaking) return;
      if (isPaused) {
        try {
          window.speechSynthesis.resume();
        } catch (e) {}
        isPaused = false;
        updateNarrationUI();
      } else {
        try {
          window.speechSynthesis.pause();
        } catch (e) {}
        isPaused = true;
        updateNarrationUI();
      }
    }

    function playNarration() {
      if (!synthAvailable) {
        toast('Speech narration is not supported in this browser.');
        return;
      }

      if (isPaused && currentUtterance) {
        try {
          window.speechSynthesis.resume();
        } catch (e) {}
        isPaused = false;
        updateNarrationUI();
        return;
      }

      // Stop and cancel any existing or pending speech
      if (autoNarrateTimer) {
        clearTimeout(autoNarrateTimer);
        autoNarrateTimer = null;
      }
      const thisToken = ++narrationToken;
      const targetPageIndex = currentPageIndex;
      const pageData = storyPages[targetPageIndex];
      if (!pageData) return;

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (e) {}

      // Update state to reading immediately
      isSpeaking = true;
      isPaused = false;
      updateNarrationUI();

      // Drain delay (60ms) to ensure browser TTS subsystem flushes previous utterance completely
      autoNarrateTimer = setTimeout(() => {
        if (thisToken !== narrationToken || state.page !== 3 || currentPageIndex !== targetPageIndex) {
          return;
        }

        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.cancel();
        } catch (e) {}

        // Read ONLY the current page's story text, never button labels or UI elements
        const fullText = pageData.paragraphs.join(' ');
        const utterance = new SpeechSynthesisUtterance(fullText);
        currentUtterance = utterance;

        // Soothing, gentle bedtime storytelling tone
        utterance.rate = 0.88;
        utterance.pitch = 1.15;

        try {
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const preferred = voices.find(v =>
              v.lang.startsWith('en') && (
                v.name.includes('Natural') ||
                v.name.includes('Samantha') ||
                v.name.includes('Victoria') ||
                v.name.includes('Karen') ||
                v.name.includes('Zira') ||
                v.name.includes('Google US English')
              )
            ) || voices.find(v => v.lang.startsWith('en'));

            if (preferred) {
              utterance.voice = preferred;
            }
          }
        } catch (e) {}

        const sentenceSpans = $$('.story-sentence', storyParagraphBox);
        let runningCharCount = 0;
        const charOffsets = [];
        sentenceSpans.forEach(span => {
          const start = runningCharCount;
          runningCharCount += span.textContent.length;
          charOffsets.push({ span, start, end: runningCharCount });
        });

        utterance.onboundary = (e) => {
          if (thisToken !== narrationToken) return;
          if (e.charIndex !== undefined && charOffsets.length > 0) {
            const match = charOffsets.find(item => e.charIndex >= item.start && e.charIndex <= item.end);
            if (match) {
              clearSentenceHighlights();
              match.span.classList.add('active-spoken');
            }
          }
        };

        utterance.onstart = () => {
          if (thisToken !== narrationToken) return;
          isSpeaking = true;
          isPaused = false;
          updateNarrationUI();
          if (sentenceSpans[0]) {
            sentenceSpans[0].classList.add('active-spoken');
          }
        };

        utterance.onpause = () => {
          if (thisToken !== narrationToken) return;
          isPaused = true;
          updateNarrationUI();
        };

        utterance.onresume = () => {
          if (thisToken !== narrationToken) return;
          isPaused = false;
          updateNarrationUI();
        };

        utterance.onend = () => {
          if (thisToken !== narrationToken) return;
          isSpeaking = false;
          isPaused = false;
          currentUtterance = null;
          updateNarrationUI();
          clearSentenceHighlights();
        };

        utterance.onerror = () => {
          if (thisToken !== narrationToken) return;
          isSpeaking = false;
          isPaused = false;
          currentUtterance = null;
          updateNarrationUI();
          clearSentenceHighlights();
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          if (thisToken === narrationToken) {
            isSpeaking = false;
            isPaused = false;
            currentUtterance = null;
            updateNarrationUI();
          }
        }
      }, 60);
    }

    function initStoryDots() {
      if (!storybookDots) return;
      storybookDots.innerHTML = '';
      storyPages.forEach((item, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `story-dot-btn ${idx === currentPageIndex ? 'active' : ''}`;
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', idx === currentPageIndex ? 'true' : 'false');
        dot.setAttribute('aria-label', `Page ${idx + 1}: ${item.title}`);
        dot.textContent = `Page ${idx + 1}`;
        dot.addEventListener('click', () => goToPage(idx, true));
        storybookDots.appendChild(dot);
      });
    }

    function renderStoryPage(index) {
      const data = storyPages[index];
      if (!data) return;

      if (sceneCloudTag) sceneCloudTag.textContent = data.caption;
      if (badgeChapter) badgeChapter.textContent = data.chapter;
      if (badgeMood) badgeMood.textContent = data.mood;
      if (storyChapterTitle) storyChapterTitle.textContent = data.title;

      if (storyParagraphBox) {
        storyParagraphBox.innerHTML = '';
        data.paragraphs.forEach((pText, pIndex) => {
          const pElem = document.createElement('p');
          const sentences = pText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [pText];
          sentences.forEach((sentence, sIndex) => {
            const span = document.createElement('span');
            span.className = 'story-sentence';
            span.id = `sentence-${pIndex}-${sIndex}`;
            span.textContent = sentence;
            pElem.appendChild(span);
          });
          storyParagraphBox.appendChild(pElem);
        });
      }

      if (sceneViewport) {
        sceneViewport.innerHTML = data.svg;
      }

      if (currPageNum) currPageNum.textContent = String(index + 1);

      if (prevPageBtn) {
        prevPageBtn.disabled = index === 0;
      }
      if (nextPageBtn) {
        if (index === storyPages.length - 1) {
          nextPageBtn.innerHTML = `Read Again ↻`;
        } else {
          nextPageBtn.innerHTML = `Next <span aria-hidden="true">›</span>`;
        }
        nextPageBtn.disabled = false;
      }

      const percentage = Math.round(((index + 1) / storyPages.length) * 100);
      if (storybookProgressBar) {
        storybookProgressBar.style.width = `${percentage}%`;
      }
      if (progressPercent) {
        progressPercent.textContent = `Page ${index + 1} of 7 (${percentage}%)`;
      }

      if (storybookDots) {
        const dots = $$('.story-dot-btn', storybookDots);
        dots.forEach((dot, dotIdx) => {
          const isActive = dotIdx === index;
          dot.classList.toggle('active', isActive);
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      }

      updateNarrationUI();
    }

    function goToPage(newIndex, autoNarrate = false) {
      if (newIndex < 0 || newIndex >= storyPages.length) return;
      // Stop and cancel all speech from previous page so voices never overlap
      stopNarration();
      currentPageIndex = newIndex;
      renderStoryPage(currentPageIndex);

      // Immediately start reading the new page aloud when navigating
      if (autoNarrate && synthAvailable) {
        playNarration();
      }
    }

    function bindEvents() {
      if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
          if (currentPageIndex > 0) goToPage(currentPageIndex - 1, true);
        });
      }

      if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
          if (currentPageIndex < storyPages.length - 1) {
            goToPage(currentPageIndex + 1, true);
          } else {
            // Loop back to page 1 and auto-read page 1
            goToPage(0, true);
            toast('Beginning the story again from Page 1! ✨');
          }
        });
      }

      if (readAloudBtn) readAloudBtn.addEventListener('click', playNarration);
      if (pauseNarrationBtn) pauseNarrationBtn.addEventListener('click', pauseNarration);
      if (stopNarrationBtn) stopNarrationBtn.addEventListener('click', stopNarration);

      if (storybookBackBtn) {
        storybookBackBtn.addEventListener('click', () => {
          try { stopAllSpeech(); } catch (e) {}
          show(1);
          try { Music.resume(); } catch (e) {}
          sparkle(5);
        });
      }

      // Keyboard arrow navigation -> immediately read destination page
      window.addEventListener('keydown', (e) => {
        if (state.page !== 3) return;
        if (e.key === 'ArrowRight' && currentPageIndex < storyPages.length - 1) {
          goToPage(currentPageIndex + 1, true);
        } else if (e.key === 'ArrowLeft' && currentPageIndex > 0) {
          goToPage(currentPageIndex - 1, true);
        }
      });

      // Mobile Touch Swipe -> immediately read destination page
      let touchStartX = 0, touchStartY = 0;
      if (el.pageStorybook) {
        el.pageStorybook.addEventListener('touchstart', (e) => {
          touchStartX = e.changedTouches[0].screenX;
          touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        el.pageStorybook.addEventListener('touchend', (e) => {
          const diffX = e.changedTouches[0].screenX - touchStartX;
          const diffY = e.changedTouches[0].screenY - touchStartY;
          if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0 && currentPageIndex < storyPages.length - 1) {
              goToPage(currentPageIndex + 1, true);
            } else if (diffX > 0 && currentPageIndex > 0) {
              goToPage(currentPageIndex - 1, true);
            }
          }
        }, { passive: true });
      }
    }

    return {
      init() {
        initStoryDots();
        renderStoryPage(currentPageIndex);
        bindEvents();
      },
      open() {
        renderStoryPage(currentPageIndex);
      },
      renderCurrentPage() {
        renderStoryPage(currentPageIndex);
      },
      goToPage,
      stopNarration,
      playNarration,
      pauseNarration,
    };
  })();

  window.BedtimeStorybook = BedtimeStorybook;

  /* ---------------------------------------------------------
     WAKE UP PIP  (first tap = browsers allow sound + voice)
     --------------------------------------------------------- */
  applyTheme("night");

  renderStoryLines("night");
  $$("p", el.story).forEach((p) => p.classList.add("show"));
  showBubble("Hi! I’m Pip! 👋 Tap anywhere to hear me");
  setTimeout(wave, 600);

  function begin() {
    if (state.started) return;
    state.started = true;
    ["click", "touchend", "keydown"].forEach((ev) => window.removeEventListener(ev, begin));
    if (state.page === 1) {
      Music.setMode(state.theme);
      Music.start();
      tell(state.theme);
    }
  }
  ["click", "touchend", "keydown"].forEach((ev) => window.addEventListener(ev, begin));

  // Initialize Bedtime Storybook component
  BedtimeStorybook.init();
})();