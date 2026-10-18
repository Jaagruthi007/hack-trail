/* ================= EASTER EGG ================= */
(() => {
  const egg = document.getElementById('secretEgg');
  const overlay = document.getElementById('eggOverlay');
  const sky = document.getElementById('eggSky');
  const closeBtn = document.getElementById('eggClose');
  if (!egg || !overlay) return;

  let taps = 0, audio = null, musicTimer = null, shootTimer = null, step = 0, opening = false;

  /* ---- music box lullaby (original tune, generated live) ---- */
  const N = { G2:98, C3:130.81, F3:174.61, C4:261.63, D4:293.66, E4:329.63, G4:392, A4:440,
              C5:523.25, D5:587.33, E5:659.25, G5:783.99 };
  const melody = ['E4','G4','A4','G4','E4','D4','C4','D4', 'E4','G4','C5','A4','G4','E4','D4','C4',
                  'D4','E4','G4','E4','D4','C4','D4','E4', 'G4','A4','G4','E4','D4','C4','C4',null];
  const bass = { 0:'C3', 8:'C3', 16:'G2', 24:'F3' };
  const TEMPO = 480;

  function ping(freq, vol = 0.12, dur = 1.6) {
    if (!audio || !freq) return;
    const t = audio.currentTime;
    [[1, 'sine', vol], [2, 'triangle', vol * 0.35], [4, 'sine', vol * 0.1]].forEach(([m, type, v]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = freq * m;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function startMusic() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) { return; }
    step = 0;
    musicTimer = setInterval(() => {
      const i = step % melody.length;
      if (bass[i]) ping(N[bass[i]], 0.1, 2.4);
      if (melody[i]) ping(N[melody[i]]);
      step++;
    }, TEMPO);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  /* ---- sky decorations ---- */
  function buildSky() {
    sky.innerHTML = '';
    for (let i = 0; i < 70; i++) {
      const s = document.createElement('span');
      s.className = 'egg-star';
      const size = 1 + Math.random() * 3;
      s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--s:${size}px;--d:${2+Math.random()*3}s;--l:${Math.random()*3}s`;
      sky.appendChild(s);
    }
  }
  function shootingStar() {
    const s = document.createElement('span');
    s.className = 'egg-shoot';
    s.style.left = 45 + Math.random() * 50 + '%';
    s.style.top = Math.random() * 35 + '%';
    sky.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
  sky.addEventListener('pointerdown', e => {
    const sp = document.createElement('span');
    sp.className = 'egg-spark';
    sp.textContent = ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)];
    sp.style.left = e.clientX + 'px';
    sp.style.top = e.clientY + 'px';
    overlay.appendChild(sp);
    setTimeout(() => sp.remove(), 950);
    ping(N[['C5','D5','E5','G5'][Math.floor(Math.random() * 4)]], 0.07, 1.2);
  });

  /* ---- open / close ---- */
  function openLullaby() {
    buildSky();
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('show'));
    overlay.querySelectorAll('.egg-lyrics p').forEach(p => { p.style.animation = 'none'; p.offsetWidth; p.style.animation = ''; });
    startMusic();
    shootTimer = setInterval(shootingStar, 3500);
    closeBtn.focus();
    document.addEventListener('keydown', onKey);
  }
  function closeLullaby() {
    overlay.classList.remove('show');
    stopMusic(); clearInterval(shootTimer);
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      overlay.hidden = true;
      egg.className = 'egg'; taps = 0; opening = false;   // egg is whole again, ready to be found twice
      egg.focus({ preventScroll: true });
    }, 1000);
  }
  function onKey(e) { if (e.key === 'Escape') closeLullaby(); }
  closeBtn.addEventListener('click', closeLullaby);

  /* ---- tap the egg 3 times ---- */
  egg.addEventListener('click', () => {
    if (opening) return;
    taps++;
    egg.classList.remove('wiggle'); void egg.offsetWidth; egg.classList.add('wiggle');
    egg.classList.add('s' + Math.min(taps, 3));
    if (navigator.vibrate) navigator.vibrate(taps === 3 ? [30, 40, 60] : 20);

    // wake the audio context on a real user gesture (needed on iOS/Chrome)
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {}
    ping(600 + taps * 150, 0.08, 0.5);

    if (taps >= 3) {
      opening = true;
      setTimeout(() => {
        egg.classList.add('open');
        [N.C5, N.E5, N.G5].forEach((f, i) => setTimeout(() => ping(f, 0.1, 1.4), i * 120));
        setTimeout(openLullaby, 900);
      }, 600);
    }
  });
})();