// Modelos FBX de las aves: carga, ajuste de tamaño, recorte de animaciones y selección por toque.
// No depende del motor AR: recibe THREE por parámetro (three.js r128, cargado desde ar-scene.js).

const FBX_LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js';
const FFLATE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js'; // el FBXLoader r128 lo necesita para FBX comprimidos

const CROSSFADE = 0.3; // segundos de mezcla entre animaciones

// Carga FBXLoader (y fflate) una sola vez. loadScript viene de ar-scene.js.
export async function ensureFbxLoader(THREE, loadScript) {
  if (THREE.FBXLoader) return;
  await loadScript(FFLATE_URL);
  await loadScript(FBX_LOADER_URL);
}

// Recorta [from, to] segundos de un clip. Se muestrea cada pista (en vez de AnimationUtils.subclip)
// porque en los FBX cada hueso trae su propio número de keyframes y subclip dejaría pistas sin valores.
export function sampleSubclip(THREE, clip, name, from, to, fps = 30) {
  const length = to - from;
  const count = Math.max(2, Math.round(length * fps) + 1);
  const tracks = clip.tracks.map((track) => {
    const interpolant = track.createInterpolant();
    const size = track.getValueSize();
    const times = new Float32Array(count);
    const values = new Float32Array(count * size);
    for (let i = 0; i < count; i += 1) {
      times[i] = Math.min(i / fps, length);
      const sample = interpolant.evaluate(from + times[i]);
      for (let k = 0; k < size; k += 1) values[i * size + k] = sample[k];
    }
    return new track.constructor(track.name, times, values);
  });
  return new THREE.AnimationClip(name, length, tracks);
}

// spec = { nombre: { from, to, loop: 'pingpong' | 'repeat' | 'once' } } sobre el clip fuente.
// Sin spec se usan los clips tal cual vienen en el archivo (el primero hace de reposo).
export function buildEntries(THREE, sourceClips, spec, sourceIndex = 0) {
  if (!spec) {
    return sourceClips.map((clip, i) => ({ name: clip.name || `clip${i}`, clip, loop: i === 0 ? 'repeat' : 'once' }));
  }
  const source = sourceClips[sourceIndex] || sourceClips[0];
  if (!source) return [];
  return Object.entries(spec).map(([name, def]) => ({
    name,
    clip: sampleSubclip(THREE, source, name, def.from, Math.min(def.to, source.duration)),
    loop: def.loop || 'once',
  }));
}

// Mezcla de animaciones: el reposo se repite; las demás se reproducen una vez y vuelven al reposo.
export function createAnimator(THREE, root, entries, idleName, onChange) {
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  const loops = {};
  entries.forEach(({ name, clip, loop }) => {
    const action = mixer.clipAction(clip);
    action.clampWhenFinished = true;
    actions[name] = action;
    loops[name] = loop;
  });
  const names = entries.map((e) => e.name);
  const idle = actions[idleName] ? idleName : names[0];
  const cycle = names.filter((n) => n !== idle);
  let current = null;
  let currentName = null;
  let cursor = -1;

  function play(name) {
    const action = actions[name];
    if (!action || action === current) return;
    const mode = loops[name];
    if (mode === 'once') action.setLoop(THREE.LoopOnce, 1);
    else if (mode === 'pingpong') action.setLoop(THREE.LoopPingPong, Infinity);
    else action.setLoop(THREE.LoopRepeat, Infinity);
    action.reset();
    if (current) action.crossFadeFrom(current, CROSSFADE, false);
    action.play();
    current = action;
    currentName = name;
    if (onChange) onChange(name);
  }

  // Al terminar una animación de «una vez» se vuelve al reposo.
  mixer.addEventListener('finished', (event) => { if (event.action === current) play(idle); });

  return {
    mixer,
    names,
    idle,
    get current() { return currentName; },
    play,
    start() { play(idle); },
    // Cada toque lanza la siguiente animación de la lista (sin contar el reposo) y da la vuelta.
    next() {
      if (!cycle.length) return null;
      cursor = (cursor + 1) % cycle.length;
      play(cycle[cursor]);
      return cycle[cursor];
    },
    update(dt) { mixer.update(dt); },
  };
}

// Centra el modelo, lo apoya en y=0 y lo escala para que su lado más largo mida `fit` unidades.
// Los FBX vienen en unidades muy distintas (el pechirrojo mide ~9, la guacamaya ~43), por eso se normaliza.
export function fitObject(THREE, object, fit = 0.8, lift = 0) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const k = fit / Math.max(size.x, size.y, size.z, 1e-6);
  const pivot = new THREE.Group();
  object.scale.multiplyScalar(k);
  object.position.set(-center.x * k, -box.min.y * k + lift, -center.z * k);
  pivot.add(object);
  return { object: pivot, size: size.multiplyScalar(k), lift };
}

// Esfera invisible que recibe el toque. Raycaster sobre un SkinnedMesh usa la pose original (no la animada),
// así que el toque no seguiría al ave mientras se mueve; la esfera sí.
export function addTouchProxy(THREE, holder, size, lift = 0) {
  const radius = Math.max(size.x, size.y, size.z) * 0.55;
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set(0, size.y / 2 + lift, 0);
  proxy.name = 'touch-proxy';
  proxy.userData.holder = holder;
  holder.add(proxy);
  return proxy;
}

// Devuelve el nombre del ave tocada (o null). Raycaster NO ignora objetos invisibles: se filtran a mano.
export function pickBird(THREE, raycaster, ndc, camera, holders) {
  const proxies = [];
  Object.entries(holders).forEach(([name, holder]) => {
    if (!holder.visible) return;
    holder.traverse((o) => { if (o.name === 'touch-proxy') { o.userData.birdName = name; proxies.push(o); } });
  });
  if (!proxies.length) return null;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(proxies, false);
  return hits.length ? hits[0].object.userData.birdName : null;
}

// Si la textura del FBX no viaja con el archivo (rutas de Windows), el material queda negro o gris.
// cfg.texture = imagen junto al FBX; cfg.color = color liso de respaldo.
export function fixMaterials(THREE, object, cfg) {
  const texture = cfg.texture ? new THREE.TextureLoader().load(cfg.texture) : null;
  object.traverse((o) => {
    if (!o.isMesh) return;
    [].concat(o.material).forEach((m) => {
      if (!m.map) return;
      if (texture) { m.map = texture; m.color.set(0xffffff); }
      else if (cfg.color != null) { m.map = null; m.color.set(cfg.color); }
      m.needsUpdate = true;
    });
  });
}

function parseFbx(THREE, url) {
  return new Promise((resolve, reject) => new THREE.FBXLoader().load(url, resolve, undefined, reject));
}

// Carga un ave FBX lista para colgar de un holder: { object, clips, size }.
export async function loadFbxBird(THREE, cfg) {
  const root = await parseFbx(THREE, cfg.model);
  (cfg.remove || []).forEach((name) => {
    const extra = root.getObjectByName(name);
    if (extra && extra.parent) extra.parent.remove(extra);
  });
  fixMaterials(THREE, root, cfg);
  const clips = root.animations.slice();
  const fitted = fitObject(THREE, root, cfg.fit ?? 0.8, cfg.lift ?? 0);
  return { object: fitted.object, root, clips, size: fitted.size, lift: fitted.lift };
}
