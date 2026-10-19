import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const mount = document.getElementById("pip3d-canvas");
if (mount) {
  try { initPip3D(mount); } catch (e) { console.warn("Pip 3D failed, using 2D fallback", e); }
}

function initPip3D(mount) {
  /* ---------- Renderer / scene / camera ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 1.5, 12.5);
  camera.lookAt(0, 1.3, 0);

  /* ---------- Lights ---------- */
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0x9a8cff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 7, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0xffc27a, 25, 30);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  /* ---------- Theme-aware materials ---------- */
  const themed = []; // {mat, night, day}
  const themeMat = (night, day, opts = {}) => {
    const mat = new THREE.MeshStandardMaterial({ color: night, roughness: 0.55, ...opts });
    themed.push({ mat, night: new THREE.Color(night), day: new THREE.Color(day) });
    return mat;
  };
  const mat = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...opts });

  const skull   = mat(0xfff6ec, { roughness: 0.35 });
  const dark    = mat(0x3a2428, { roughness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc94d, emissiveIntensity: 1.6 });
  const pink    = mat(0xf7a8c4, { roughness: 0.4 });
  const cheek   = mat(0xffb3b3, { roughness: 0.8 });
  const capMat  = themeMat(0x5b4fc4, 0xe8a528, { roughness: 0.85 });
  const suitMat = themeMat(0x4b3fb0, 0xe8a528, { roughness: 0.85 });
  const trim    = themeMat(0xf7d84a, 0x8a4f1c, { roughness: 0.8 });
  const cloudM  = mat(0xffffff, { roughness: 0.9 });

  const mesh = (geo, m, pos = [0, 0, 0], scale = [1, 1, 1]) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(...pos);
    o.scale.set(...scale);
    return o;
  };
  const sph = (r = 1) => new THREE.SphereGeometry(r, 32, 24);

  /* ---------- Pip ---------- */
  const pivot = new THREE.Group();   // user rotation
  const pip = new THREE.Group();     // bobbing / jumping
  pivot.add(pip);
  scene.add(pivot);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 2.3, 0);
  pip.add(head);
  head.add(mesh(sph(1.5), skull, [0, 0, 0], [1.12, 1, 1.02]));

  // Eyes (sockets blink by scaling Y)
  const eyes = new THREE.Group();
  head.add(eyes);
  const pupils = [];
  [-1, 1].forEach((s) => {
    const eye = new THREE.Group();
    eye.position.set(s * 0.65, -0.05, 1.12);
    eye.add(mesh(sph(0.46), dark, [0, 0, 0], [1, 1.1, 0.55]));
    const p = mesh(sph(0.11), glowMat, [s * 0.04, 0.06, 0.24]);
    eye.add(p);
    pupils.push(p);
    eyes.add(eye);
  });

  // Nose, smile, cheeks
  head.add(mesh(sph(0.1), dark, [0, -0.38, 1.5], [1, 0.8, 0.6]));
  const smile = mesh(new THREE.TorusGeometry(0.22, 0.04, 10, 24, Math.PI), dark, [0.04, -0.62, 1.42]);
  smile.rotation.z = Math.PI;
  head.add(smile);
  [-1, 1].forEach((s) => head.add(mesh(sph(0.22), cheek, [s * 1.0, -0.38, 1.05], [1, 0.7, 0.4])));

  // Nightcap (dome + drooping tail + pom-pom)
  const cap = new THREE.Group();
  cap.rotation.set(-0.3, 0, 0.12);
  head.add(cap);
  cap.add(mesh(new THREE.SphereGeometry(1.62, 32, 20, 0, Math.PI * 2, 0, 1.05), capMat, [0, 0.05, 0], [1.13, 1, 1.04]));
  const tail = new THREE.Group();
  tail.position.set(-0.8, 1.35, 0);
  cap.add(tail);
  const tailMesh = mesh(new THREE.ConeGeometry(0.75, 2.2, 24), capMat, [-1.0, -0.45, 0]);
  tailMesh.rotation.z = 2.0;
  tail.add(tailMesh);
  const pom = mesh(sph(0.38), trim, [-2.05, -1.05, 0]);
  tail.add(pom);

  // Bow
  const bow = new THREE.Group();
  bow.position.set(-1.1, 1.0, 1.15);
  bow.rotation.set(0.1, 0.5, 0.3);
  [-1, 1].forEach((s) => {
    const w = mesh(new THREE.ConeGeometry(0.3, 0.55, 16), pink, [s * 0.3, 0, 0]);
    w.rotation.z = s * -Math.PI / 2;
    bow.add(w);
  });
  bow.add(mesh(sph(0.14), pink));
  head.add(bow);

  // Body
  pip.add(mesh(new THREE.CapsuleGeometry(0.9, 0.9, 12, 24), suitMat, [0, 0.35, 0]));
  for (let i = 0; i < 3; i++) pip.add(mesh(sph(0.09), trim, [0, 0.9 - i * 0.45, 0.88]));

  // Heart-dot pattern
  const dotGeo = sph(0.1);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 2.2 - 1.1;
    const y = 0.2 + Math.sin(i * 2.3) * 0.5;
    pip.add(mesh(dotGeo, trim, [Math.sin(a) * 0.9, y, Math.cos(a) * 0.9], [1, 1, 0.4]));
  }

  // Waving arm (right) + resting arm (left)
  const armR = new THREE.Group();
  armR.position.set(1.0, 1.0, 0.35);
  armR.add(mesh(new THREE.CapsuleGeometry(0.25, 0.55, 8, 16), suitMat, [0, 0.45, 0]));
  armR.add(mesh(sph(0.3), skull, [0, 1.05, 0]));
  pip.add(armR);

  const armL = new THREE.Group();
  armL.position.set(-1.0, 0.9, 0.35);
  armL.rotation.set(0.7, 0, 0.35);
  armL.add(mesh(new THREE.CapsuleGeometry(0.25, 0.5, 8, 16), suitMat, [0, -0.45, 0]));
  armL.add(mesh(sph(0.28), skull, [0, -0.95, 0]));
  pip.add(armL);

  // Legs + feet
  [-1, 1].forEach((s) => {
    const leg = mesh(new THREE.CapsuleGeometry(0.4, 0.5, 8, 16), suitMat, [s * 0.55, -0.55, 0.9]);
    leg.rotation.x = Math.PI / 2;
    pip.add(leg);
    pip.add(mesh(sph(0.46), trim, [s * 0.55, -0.55, 1.65], [1, 0.9, 0.7]));
  });

  // Cloud seat
  const cloud = new THREE.Group();
  cloud.position.set(0, -1.35, 0.2);
  cloud.add(mesh(sph(1), cloudM, [0, 0, 0], [2.0, 0.65, 1.7]));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.55 + (i % 3) * 0.12;
    cloud.add(mesh(sph(r), cloudM, [Math.cos(a) * 1.8, -0.1 + (i % 2) * 0.1, Math.sin(a) * 1.4], [1, 0.8, 1]));
  }
  pivot.add(cloud);

  /* ---------- Floating stars + moon ---------- */
  function starGeo(r = 0.3) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const rad = i % 2 ? r * 0.48 : r;
      i ? s.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : s.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.05, bevelSegments: 2 });
    g.center();
    return g;
  }
  const starCols = [0xf6d58b, 0xd9b8f0, 0xf3c6d8, 0xffe7a3];
  const stars = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(starGeo(0.22 + Math.random() * 0.2), mat(starCols[i % 4], { roughness: 0.4, emissive: starCols[i % 4], emissiveIntensity: 0.25 }));
    stars.push({ m, a: (i / 9) * Math.PI * 2, r: 3.4 + Math.random() * 0.9, y: 0.2 + Math.random() * 4, sp: 0.15 + Math.random() * 0.2, ph: Math.random() * 6 });
    pivot.add(m);
  }

  const moonShape = new THREE.Shape();
  moonShape.absarc(0, 0, 1, 0.9, Math.PI * 2 - 0.9, false);
  moonShape.absarc(0.55, 0, 0.783, -1.48, 1.48, true);
  const moonGeo = new THREE.ExtrudeGeometry(moonShape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 });
  moonGeo.center();
  const moon = new THREE.Mesh(moonGeo, mat(0xffe9a8, { roughness: 0.5, emissive: 0xffd36b, emissiveIntensity: 0.35 }));
  moon.position.set(2.9, 4.6, -0.5);
  moon.rotation.z = 0.4;
  moon.scale.setScalar(0.75);
  pivot.add(moon);

  /* ---------- Theme sync (follows <html data-theme>) ---------- */
  let theme = document.documentElement.dataset.theme || "night";
  new MutationObserver(() => (theme = document.documentElement.dataset.theme || "night"))
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- Drag to rotate + tap to jump ---------- */
  let dragging = false, lastX = 0, lastY = 0, moved = 0, velY = 0;
  let rotY = 0, rotX = 0, idleAt = 0, spinBoost = 0, jumpT = -1;
  const el = renderer.domElement;

  el.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; velY = 0;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
    velY = dx * 0.01;
    rotY += velY;
    rotX = THREE.MathUtils.clamp(rotX + dy * 0.005, -0.5, 0.5);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    idleAt = performance.now();
    if (moved < 6) {                       // it was a tap
      jumpT = 0;
      mount.dispatchEvent(new CustomEvent("pip3d:tap", { bubbles: true }));
    }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("dblclick", () => (spinBoost = 14)); // double-click = twirl

  /* ---------- Resize + pause offscreen ---------- */
  function resize() {
    const w = mount.clientWidth || 300, h = mount.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(mount);
  resize();

  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(mount);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Animation loop ---------- */
  const clock = new THREE.Clock();
  let nextBlink = 2, blinkT = -1;
  const tmp = new THREE.Color();

  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    // theme color fade
    themed.forEach((o) => o.mat.color.lerp(tmp.copy(theme === "day" ? o.day : o.night), 0.08));
    moon.visible = theme !== "day";
    moon.scale.setScalar(0.75 * THREE.MathUtils.lerp(moon.scale.x / 0.75, theme === "day" ? 0.01 : 1, 0.1));

    // rotation: inertia while dragging, ease back to front when idle
    if (!dragging) {
      rotY += velY; velY *= 0.92;
      rotY += spinBoost * 0.016; spinBoost *= 0.95;
      if (performance.now() - idleAt > 2500 && spinBoost < 0.1) {
        const target = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2;
        rotY += (target - rotY) * 0.04;
        rotX += (0 - rotX) * 0.05;
      }
    }
    pivot.rotation.y = rotY + (reduce ? 0 : Math.sin(t * 0.6) * 0.12);
    pivot.rotation.x = rotX;

    // breathing / bobbing / jump
    let jump = 0;
    if (jumpT >= 0) {
      jumpT += 0.045;
      jump = Math.sin(Math.min(jumpT, 1) * Math.PI) * 1.1;
      if (jumpT >= 1) jumpT = -1;
    }
    pip.position.y = (reduce ? 0 : Math.sin(t * 1.6) * 0.12) + jump;
    pip.scale.set(1 + Math.sin(t * 1.6) * 0.012, 1 - Math.sin(t * 1.6) * 0.012, 1);
    cloud.position.y = -1.35 + Math.sin(t * 1.6 + 1) * 0.05;

    // head tilt + waving arm + resting arm
    head.rotation.z = Math.sin(t * 1.1) * 0.05;
    head.rotation.y = Math.sin(t * 0.8) * 0.08;
    armR.rotation.z = -0.55 + Math.sin(t * 5) * 0.28 - (jump > 0 ? 0.5 : 0);
    armL.rotation.x = 0.7 + Math.sin(t * 1.6) * 0.04;

    // cap tail sway + pom
    tail.rotation.z = Math.sin(t * 1.8) * 0.08;

    // glowing eyes + blink
    glowMat.emissiveIntensity = 1.4 + Math.sin(t * 2.4) * 0.5;
    if (t > nextBlink && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += 0.12;
      eyes.scale.y = 1 - Math.sin(Math.min(blinkT, 1) * Math.PI) * 0.9;
      if (blinkT >= 1) { blinkT = -1; nextBlink = t + 2.5 + Math.random() * 3; }
    }

    // orbiting stars + moon float
    stars.forEach((s) => {
      const a = s.a + t * s.sp;
      s.m.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 1.3 + s.ph) * 0.25, Math.sin(a) * s.r * 0.6);
      s.m.rotation.set(0, t * 0.8 + s.ph, Math.sin(t + s.ph) * 0.3);
    });
    moon.position.y = 4.6 + Math.sin(t * 1.1) * 0.15;

    renderer.render(scene, camera);
  });

  mount.closest(".pip-wrap")?.classList.add("has-3d");
}