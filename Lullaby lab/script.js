const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const rnd = n => Math.random() * n | 0;
const pick = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W, H, dpr;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

// ---- Music settings ----
const STEPS = 16, ROWS = 8;
const MOODS = {
  sleepy:  { root: 60, notes: [0, 2, 4, 7, 9, 12, 14, 16], bpm: 64 }, // major pentatonic
  dreamy:  { root: 62, notes: [0, 2, 4, 6, 7, 9, 11, 12], bpm: 72 },  // lydian
  moonlit: { root: 57, notes: [0, 3, 5, 7, 10, 12, 15, 17], bpm: 56 } // minor pentatonic
};
let mood = MOODS.sleepy, bpm = 64, humOn = true;
const stepDur = () => 60 / bpm / 2;
const freq = r => 440 * Math.pow(2, (mood.root + mood.notes[r] - 69) / 12);
const blank = () => Array.from({ length: ROWS }, () => Array(STEPS).fill(false));
let pat = blank();

// ---- Audio ----
let ac, bus;

function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const master = ac.createGain(); master.gain.value = .8;
  const comp = ac.createDynamicsCompressor();
  master.connect(comp); comp.connect(ac.destination);

  // Soft room reverb built from decaying noise
  const len = ac.sampleRate * 2.8 | 0, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
  }
  const conv = ac.createConvolver(); conv.buffer = ir;
  const wet = ac.createGain(); wet.gain.value = .5;
  conv.connect(wet); wet.connect(master);

  bus = ac.createGain();
  bus.connect(master); bus.connect(conv);
}

// A music-box tine: a pure tone plus two quick, bright overtones
function tine(f, when, vel) {
  const decay = 1.9 * Math.pow(261 / f, .35);
  [[1, .26, 1], [2.76, .06, .38], [5.4, .02, .16]].forEach(([ratio, gain, dec]) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f * ratio;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain * vel, when + .004);
    g.gain.exponentialRampToValueAtTime(.0001, when + decay * dec);
    o.connect(g); g.connect(bus);
    o.start(when); o.stop(when + decay * dec + .05);
  });
}

// Pip's voice: a gentle "oo/ah" hum made from a buzzing tone shaped by two vowel filters
function hum(f, when, dur) {
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = 5.2; lg.gain.value = f * .011;
  lfo.connect(lg); lg.connect(o.frequency);

  const f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter();
  f1.type = f2.type = 'bandpass'; f1.Q.value = f2.Q.value = 5;
  f1.frequency.setValueAtTime(330, when);
  f1.frequency.linearRampToValueAtTime(620, when + dur * .6);
  f2.frequency.setValueAtTime(820, when);
  f2.frequency.linearRampToValueAtTime(1100, when + dur * .6);
  const g2 = ac.createGain(); g2.gain.value = .55;

  const env = ac.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(.1, when + .12);
  env.gain.setValueAtTime(.1, when + Math.max(.13, dur - .25));
  env.gain.linearRampToValueAtTime(0, when + dur);

  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  o.connect(f1); o.connect(f2);
  f1.connect(env); f2.connect(g2); g2.connect(env);
  env.connect(lp); lp.connect(bus);
  o.start(when); lfo.start(when);
  o.stop(when + dur + .05); lfo.stop(when + dur + .05);
}

// ---- Pip composes ----
const ADJ = ['Sleepy', 'Little', 'Silver', 'Quiet', 'Drowsy', 'Velvet', 'Tiny', 'Soft'];
const NOUN = ['Moon', 'Cloud', 'Lantern', 'Moth', 'Owl', 'Star', 'Blanket', 'Pond'];
let songNo = 0;

function compose() {
  const g = blank();
  const rhythms = [[1, 0, 1, 1], [1, 0, 0, 1], [1, 1, 0, 1], [1, 0, 1, 0], [1, 1, 1, 0]];
  const rA = pick(rhythms), rB = pick(rhythms);
  const s = pick([2, 3, 4]);

  // One bar = 4 steps. Walk mostly by small steps so it sounds like a tune.
  const bar = (b, rhythm, start) => {
    let r = clamp(start, 0, ROWS - 1), last = null;
    rhythm.forEach((on, i) => {
      if (!on) return;
      if (last) r = clamp(r + pick([-2, -1, -1, 0, 1, 1, 2]), 0, ROWS - 1);
      g[r][b * 4 + i] = true;
      last = { r, step: b * 4 + i };
    });
    return last;
  };

  bar(0, rA, s);
  bar(1, rA, s + pick([-1, 0, 1]));
  bar(2, rB, s + pick([1, 2, 3]));              // a little higher, a little tension
  const end = bar(3, pick([[1, 0, 1, 0], [1, 0, 0, 0]]), s - pick([0, 1]));
  g[end.r][end.step] = false; g[0][end.step] = true; // come home to the tonic

  // A soft bass note on the first beats
  if (Math.random() < .8) g[0][0] = true;
  if (Math.random() < .7) g[pick([0, 2, 3])][8] = true;

  pat = g;
  songNo++;
  $('song').textContent = pick(ADJ) + ' ' + pick(NOUN) + ' · No. ' + songNo;
}

// ---- Scheduler ----
let playing = false, started = false, timer = null;
let absStep = 0, nextT = 0, steps = [], events = [], pos = 0;

function anyOn(st) { for (let r = 0; r < ROWS; r++) if (pat[r][st]) return true; return false; }

function scheduler() {
  while (nextT < ac.currentTime + .3) {
    const st = absStep % STEPS, sd = stepDur();
    steps.push({ t: nextT, abs: absStep, sd });
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      if (pat[r][st]) { tine(freq(r), nextT, .6 + Math.random() * .15); rows.push(r); }
    }
    let humDur = 0;
    if (humOn && rows.length) {
      let k = 1;
      while (k < 8 && !anyOn((st + k) % STEPS)) k++;
      humDur = Math.min(k * sd * .92, 2.4);
      hum(freq(rows[rows.length - 1]), nextT, humDur);
    }
    if (rows.length) events.push({ t: nextT, rows, hum: humDur });
    nextT += sd; absStep++;
  }
}

function play() {
  initAudio();
  ac.resume();
  if (playing) return;
  if (!started) { started = true; nextT = ac.currentTime + .15; }
  playing = true;
  timer = setInterval(scheduler, 25);
  $('play').textContent = 'Pause';
}

function pause() {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  ac.suspend();
  $('play').textContent = 'Play';
}

function begin() {
  initAudio();
  compose();
  $('panel').classList.add('hide');
  play();
}

// ---- Controls ----
$('go').onclick = begin;
$('play').onclick = () => { if (!ac) begin(); else playing ? pause() : play(); };
$('new').onclick = () => {
  initAudio(); compose();
  $('panel').classList.add('hide');
  if (!playing) play();
};
$('clear').onclick = () => { pat = blank(); $('song').textContent = 'Your own lullaby'; };
$('hum').onchange = e => { humOn = e.target.checked; };
$('bpm').oninput = e => { bpm = +e.target.value; $('bpmv').textContent = bpm; };

document.querySelectorAll('.moods button').forEach(b => {
  b.onclick = () => {
    mood = MOODS[b.dataset.m];
    bpm = mood.bpm; $('bpm').value = bpm; $('bpmv').textContent = bpm;
    document.querySelectorAll('.moods button').forEach(x => x.setAttribute('aria-pressed', x === b));
  };
});

addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); $('play').click(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---- Layout of the music box ----
let L = {};
function layout() {
  const rollH = clamp(H * .44, 190, 330), pad = 14;
  L = {
    rollH, pad, y0: H - rollH - 10,
    rowH: (rollH - pad * 2) / ROWS,
    combX: clamp(W * .2, 92, 170),
    colW: clamp(W * .055, 34, 58)
  };
}
const rowY = r => L.y0 + L.pad + (ROWS - 1 - r + .5) * L.rowH;
const hue = r => 38 + r * 13;

// Click or tap the roll to add or remove a pin
cv.addEventListener('pointerdown', e => {
  const rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
  if (x < L.combX + 6 || y < L.y0 + L.pad || y > L.y0 + L.rollH - L.pad) return;
  const r = ROWS - 1 - Math.floor((y - L.y0 - L.pad) / L.rowH);
  const k = Math.round((x - L.combX) / L.colW + pos);
  const st = ((k % STEPS) + STEPS) % STEPS;
  if (r < 0 || r >= ROWS) return;
  pat[r][st] = !pat[r][st];
  if (pat[r][st] && ac) tine(freq(r), ac.currentTime, .7);
  $('song').textContent = 'Your own lullaby';
});

// ---- Scene state ----
let t = 0, last = performance.now();
let bounce = 0, glow = 0, sway = 0, singUntil = 0;
const rowGlow = Array(ROWS).fill(0);
let notes = [];
const stars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * .75, r: Math.random() * 1.3 + .3, p: Math.random() * 6 }));

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function burst(r) {
  if (calm || notes.length > 90) return;
  notes.push({
    x: L.combX, y: rowY(r), vx: 14 + Math.random() * 34, vy: -(26 + Math.random() * 40),
    l: 1.7, h: hue(r), g: pick(['♪', '✦', '♫'])
  });
}

// ---- Drawing ----
function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#090a26'); sky.addColorStop(.6, '#1d1b4f'); sky.addColorStop(1, '#4a3470');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  for (const s of stars) {
    const tw = calm ? .5 : .5 + .3 * Math.sin(t * 1.3 + s.p);
    ctx.fillStyle = 'rgba(255,255,255,' + (.25 + .5 * tw * (.7 + glow * .3)) + ')';
    ctx.beginPath(); ctx.arc(s.x * W, s.y * L.y0, s.r, 0, 7); ctx.fill();
  }

  // Crescent moon
  const mxp = W * .86, myp = 84, mr = 22;
  const mg = ctx.createRadialGradient(mxp, myp, 0, mxp, myp, mr * 3);
  mg.addColorStop(0, 'rgba(255,240,200,.28)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = mg; ctx.fillRect(mxp - mr * 3, myp - mr * 3, mr * 6, mr * 6);
  ctx.save();
  ctx.beginPath(); ctx.arc(mxp, myp, mr, 0, 7); ctx.clip();
  ctx.beginPath(); ctx.arc(mxp, myp, mr, 0, 7); ctx.arc(mxp + mr * .5, myp - mr * .25, mr * .92, 0, 7);
  ctx.fillStyle = '#fff0c9'; ctx.fill('evenodd');
  ctx.restore();
}

function drawPip(cx, by, s) {
  const open = !playing && (t % 4.3) > .14;
  const m = humOn && playing && ac && ac.currentTime < singUntil ? .5 + .5 * Math.sin(t * 9) : 0;
  const sq = bounce * .05;

  // warm glow behind Pip
  const wg = ctx.createRadialGradient(cx, by - 60 * s, 10, cx, by - 60 * s, 150 * s);
  wg.addColorStop(0, 'rgba(255,190,110,' + (.16 + glow * .14) + ')'); wg.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = wg; ctx.fillRect(cx - 160 * s, by - 210 * s, 320 * s, 300 * s);

  ctx.save();
  ctx.translate(cx, by); ctx.rotate(sway); ctx.scale(s * (1 + sq), s * (1 - sq));

  // antenna with a glowing tip that pulses with each note
  ctx.strokeStyle = '#d9a864'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -100); ctx.quadraticCurveTo(-8, -126, 14, -146); ctx.stroke();
  const gr = 10 + glow * 16;
  const ag = ctx.createRadialGradient(14, -148, 0, 14, -148, gr);
  ag.addColorStop(0, 'rgba(255,248,214,1)'); ag.addColorStop(.4, 'rgba(255,214,120,.7)'); ag.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(14, -148, gr, 0, 7); ctx.fill();

  // ears
  for (const d of [-1, 1]) {
    ctx.save(); ctx.translate(d * 40, -92); ctx.rotate(d * .4);
    ctx.fillStyle = '#f6cf9a'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 21, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4a9a6'; ctx.beginPath(); ctx.ellipse(0, 2, 7, 12, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  // feet
  ctx.fillStyle = '#e8b57a';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 27, -5, 16, 9, 0, 0, 7); ctx.fill(); }

  // body
  const bg = ctx.createRadialGradient(0, -64, 6, 0, -50, 72);
  bg.addColorStop(0, '#fff6e2'); bg.addColorStop(1, '#f1c086');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -50, 62, 54, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(0, -32, 34, 26, 0, 0, 7); ctx.fill();

  // cheeks
  ctx.fillStyle = 'rgba(255,128,128,.45)';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 39, -42, 9, 0, 7); ctx.fill(); }

  // eyes: wide open when paused, peaceful closed arcs while the music plays
  for (const d of [-1, 1]) {
    const ex = d * 22, ey = -58;
    if (open) {
      ctx.fillStyle = '#2a1a2e'; ctx.beginPath(); ctx.ellipse(ex, ey, 7, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 2.5, ey - 3, 2.6, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = '#2a1a2e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ex, ey - 2, 7, .12 * Math.PI, .88 * Math.PI); ctx.stroke();
    }
  }

  // mouth: a little "o" that opens and closes while humming
  if (m > 0) {
    ctx.fillStyle = '#7a2e3a';
    ctx.beginPath(); ctx.ellipse(0, -40, 4 + m * 3, 3 + m * 6, 0, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = '#2a1a2e'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -44, 6, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
  }
  ctx.restore();
}

function drawBox() {
  const { y0, rollH, rowH, combX, colW, pad } = L;

  // wooden case
  const g = ctx.createLinearGradient(0, y0, 0, y0 + rollH);
  g.addColorStop(0, '#4d3122'); g.addColorStop(1, '#26160f');
  ctx.fillStyle = g; rr(8, y0, W - 16, rollH + 10, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,110,.28)'; ctx.lineWidth = 1.5; ctx.stroke();

  // roll bed
  ctx.fillStyle = '#1b100b'; rr(combX, y0 + 8, W - 14 - combX, rollH - 16, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,130,.07)'; ctx.lineWidth = 1;
  for (let r = 0; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(combX, rowY(r)); ctx.lineTo(W - 14, rowY(r)); ctx.stroke();
  }

  // pins scroll past the comb
  ctx.save();
  rr(combX, y0 + 8, W - 14 - combX, rollH - 16, 10); ctx.clip();
  const k0 = Math.floor(pos) - 1, k1 = k0 + Math.ceil((W - combX) / colW) + 3;
  for (let k = k0; k <= k1; k++) {
    const x = combX + (k - pos) * colW, st = ((k % STEPS) + STEPS) % STEPS;
    if (st % 4 === 0) {
      ctx.strokeStyle = st === 0 ? 'rgba(255,200,130,.22)' : 'rgba(255,200,130,.08)';
      ctx.beginPath(); ctx.moveTo(x, y0 + 8); ctx.lineTo(x, y0 + rollH - 8); ctx.stroke();
    }
    for (let r = 0; r < ROWS; r++) {
      const y = rowY(r);
      if (pat[r][st]) {
        const near = Math.max(0, 1 - Math.abs(x - combX) / (colW * .6));
        ctx.fillStyle = 'hsl(' + hue(r) + ',85%,' + (66 + near * 14) + '%)';
        if (near > 0) { ctx.shadowColor = 'hsl(' + hue(r) + ',100%,65%)'; ctx.shadowBlur = 16 * near; }
        ctx.beginPath(); ctx.arc(x, y, 6.5 + near * 2.5, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255,220,170,.16)';
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
      }
    }
  }
  ctx.restore();

  // comb: tines of different lengths that shiver when a pin plucks them
  ctx.fillStyle = '#b98a3e';
  ctx.beginPath(); ctx.moveTo(14, y0 + pad - 4); ctx.lineTo(14 + (combX - 60) * ROWS / 14 + 16, y0 + pad - 4);
  ctx.lineTo(14, y0 + rollH - pad + 4); ctx.closePath(); ctx.fill();
  ctx.lineCap = 'round';
  for (let r = 0; r < ROWS; r++) {
    const y = rowY(r), sx = 18 + r * (combX - 60) / 14;
    const wob = Math.sin(t * 70) * rowGlow[r] * 2.5;
    ctx.strokeStyle = rowGlow[r] > .05 ? 'hsl(' + hue(r) + ',90%,75%)' : '#e6c27a';
    ctx.lineWidth = 3.5 - r * .15;
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(combX - 4, y + wob); ctx.stroke();
  }

  // playhead at the comb
  ctx.strokeStyle = 'rgba(255,214,140,' + (.35 + glow * .4) + ')'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(combX, y0 + 8); ctx.lineTo(combX, y0 + rollH - 8); ctx.stroke();
}

function drawNotes(dt) {
  ctx.font = '18px Georgia, serif'; ctx.textAlign = 'center';
  for (const n of notes) {
    n.x += n.vx * dt; n.y += n.vy * dt; n.l -= dt;
    ctx.fillStyle = 'hsla(' + n.h + ',90%,72%,' + Math.max(0, n.l / 1.7) + ')';
    ctx.fillText(n.g, n.x, n.y);
  }
  notes = notes.filter(n => n.l > 0);
}

// ---- Main loop (always running so Pip keeps breathing) ----
function frame(nowMs) {
  const dt = Math.min((nowMs - last) / 1000, .05);
  last = nowMs; t += dt;
  const now = ac ? ac.currentTime : 0;

  // react to notes as the audio clock reaches them
  while (events.length && events[0].t <= now) {
    const e = events.shift();
    e.rows.forEach(r => { rowGlow[r] = 1; burst(r); });
    bounce = 1; glow = 1;
    if (e.hum) singUntil = e.t + e.hum;
  }
  // where the roll is, straight from the audio clock
  while (steps.length > 1 && steps[1].t <= now) steps.shift();
  if (steps.length) {
    const s = steps[0];
    pos = clamp(s.abs + (now - s.t) / s.sd, s.abs - 1, s.abs + 1);
  }

  const d = Math.exp(-dt * 6);
  bounce *= d; glow *= Math.exp(-dt * 3);
  for (let r = 0; r < ROWS; r++) rowGlow[r] *= Math.exp(-dt * 5);
  const swayTarget = playing && !calm ? Math.sin(t * Math.PI * bpm / 60) * .05 : 0;
  sway += (swayTarget - sway) * .1;

  layout();
  drawSky();
  const s = clamp((L.y0 - 50) / 175, .45, 1.15);
  drawPip(W / 2, L.y0 + 10, s);
  drawBox();
  drawNotes(dt);
  requestAnimationFrame(frame);
}

// Pip's first lullaby is ready before anyone presses play
compose();
songNo = 0; $('song').textContent = "Pip's lullaby";
requestAnimationFrame(frame);