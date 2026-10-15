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
// freeze: nombres de pistas (p. ej. «Root.position») que se dejan fijas en su primer valor, para que
// la animación no desplace al ave de la lámina (vuelos que avanzan en el clip original).
export function sampleSubclip(THREE, clip, name, from, to, fps = 30, freeze = []) {
  const length = to - from;
  const count = Math.max(2, Math.round(length * fps) + 1);
  const tracks = clip.tracks.map((track) => {
    const interpolant = track.createInterpolant();
    const size = track.getValueSize();
    const times = new Float32Array(count);
    const values = new Float32Array(count * size);
    const frozen = freeze.includes(track.name);
    for (let i = 0; i < count; i += 1) {
      times[i] = Math.min(i / fps, length);
      const sample = interpolant.evaluate(from + (frozen ? 0 : times[i]));
      for (let k = 0; k < size; k += 1) values[i * size + k] = sample[k];
    }
    return new track.constructor(track.name, times, values);
  });
  return new THREE.AnimationClip(name, length, tracks);
}

// spec = { nombre: { from, to, loop, source } } sobre los clips del archivo.
//   source: índice o parte del nombre del clip del FBX (por defecto, el primero).
//   from/to: segundos a recortar (por defecto, el clip completo).
//   loop: 'pingpong' | 'repeat' | 'once' (por defecto 'once').
//   inPlace: true → el hueso raíz no se desplaza (el ave vuela «en el sitio» sobre la lámina).
// Sin spec se usan los clips tal cual vienen en el archivo (el primero hace de reposo).
function findSource(clips, source) {
  if (typeof source === 'number') return clips[source];
  if (typeof source === 'string') return clips.find((c) => c.name.includes(source));
  return clips[0];
}

export function buildEntries(THREE, sourceClips, spec, rootBones = []) {
  if (!spec) {
    return sourceClips.map((clip, i) => ({ name: clip.name || `clip${i}`, clip, loop: i === 0 ? 'repeat' : 'once' }));
  }
  return Object.entries(spec).flatMap(([name, def]) => {
    const source = findSource(sourceClips, def.source);
    if (!source) { console.warn(`Animación «${name}»: no se encontró el clip ${def.source ?? 0}`); return []; }
    const from = def.from ?? 0;
    const to = Math.min(def.to ?? source.duration, source.duration);
    const freeze = def.inPlace ? rootBones.map((bone) => `${bone}.position`) : [];
    return [{ name, clip: sampleSubclip(THREE, source, name, from, to, 30, freeze), loop: def.loop || 'once' }];
  });
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

// Caja que envuelve al modelo EN LA POSE ACTUAL (con el esqueleto aplicado). Box3.setFromObject usaría la
// pose original (T-pose), que en estos FBX está rotada y desplazada respecto a la pose animada.
function posedBounds(THREE, object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  object.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(pos.count / 20000));
    for (let i = 0; i < pos.count; i += stride) {
      v.fromBufferAttribute(pos, i);
      if (o.isSkinnedMesh) o.boneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      box.expandByPoint(v);
    }
  });
  return box;
}

// Gira (cfg.rotation, grados XYZ), centra el modelo, lo apoya en y=0 y lo escala para que su lado más largo
// mida cfg.fit unidades. Los FBX vienen en unidades muy distintas (colibri ~8, guacamaya ~43), por eso se
// normaliza. Hay que llamarla con el reposo ya aplicado (animator.start() + update(0)).
export function fitModel(THREE, root, cfg) {
  const rotation = (cfg.rotation || [0, 0, 0]).map((deg) => (deg * Math.PI) / 180);
  const rot = new THREE.Group();
  rot.rotation.set(rotation[0], rotation[1], rotation[2]);
  rot.add(root);
  const box = posedBounds(THREE, rot);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const lift = cfg.lift ?? 0;
  const k = (cfg.fit ?? 0.8) / Math.max(size.x, size.y, size.z, 1e-6);
  rot.scale.setScalar(k);
  rot.position.set(-center.x * k, -box.min.y * k + lift, -center.z * k);
  const pivot = new THREE.Group();
  pivot.add(rot);
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

// Si la textura del FBX no viaja con el archivo (rutas de Windows o imagen aparte), el material queda negro o gris.
//   cfg.texture  imagen que sustituye la textura rota (ruta desde la página).
//   cfg.color    color liso de respaldo para los materiales que tenían textura.
//   cfg.colors   { índiceDeMaterial: color } para fijar colores concretos (tiene prioridad).
export function fixMaterials(THREE, object, cfg) {
  const texture = cfg.texture ? new THREE.TextureLoader().load(cfg.texture) : null;
  object.traverse((o) => {
    if (!o.isMesh) return;
    [].concat(o.material).forEach((m, index) => {
      if (cfg.colors && cfg.colors[index] != null) { m.map = null; m.color.set(cfg.colors[index]); }
      else if (m.map && texture) { m.map = texture; m.color.set(0xffffff); }
      else if (m.map && cfg.color != null) { m.map = null; m.color.set(cfg.color); }
      else return;
      m.needsUpdate = true;
    });
  });
}

function parseFbx(THREE, url) {
  return new Promise((resolve, reject) => new THREE.FBXLoader().load(url, resolve, undefined, reject));
}

// Huesos de primer nivel (sin hueso padre): son los que mueven al ave entera.
function findRootBones(root) {
  const names = [];
  root.traverse((o) => { if (o.isBone && !(o.parent && o.parent.isBone)) names.push(o.name); });
  return names;
}

// Carga un ave FBX: { root, clips, rootBones }. Después hay que ponerle el reposo y llamar a fitModel.
export async function loadFbxBird(THREE, cfg) {
  const root = await parseFbx(THREE, cfg.model);
  // Algunos FBX traen cámara y luces de la escena de Blender: no deben entrar a la escena AR.
  const extras = [];
  root.traverse((o) => { if (o.isCamera || o.isLight || (cfg.remove || []).includes(o.name)) extras.push(o); });
  extras.forEach((o) => { if (o.parent) o.parent.remove(o); });
  fixMaterials(THREE, root, cfg);
  return { root, clips: root.animations.slice(), rootBones: findRootBones(root) };
}