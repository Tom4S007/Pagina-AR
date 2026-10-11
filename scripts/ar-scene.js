// Escena AR real con el motor de 8th Wall (engine-binary) + three.js.
// Se carga bajo demanda: el motor y three.js sólo se descargan cuando la persona pulsa
// «Probar experiencia». Si algo falla, startArScene() devuelve false y app.js muestra la demo 2D.
//
// Licencia: el binario de 8th Wall se distribuye con licencia de uso limitado.
// Revisar «Permitted Use» y atribución antes de publicar en un sitio institucional.

const ENGINE_URL = 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
const GLTF_LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';

// Carpeta (relativa a la página) con el JSON y las imágenes generadas por la CLI.
const TARGET_BASE = './assets/targets/data/';
// Nombre del target (campo "name" del JSON) → archivo .glb. null = objeto de prueba (cubo + ejes).
const TARGETS = {
  SicSeven: { json: 'SicSeven.json', model: null }, // ej.: './assets/models/pechirrojo.glb'
};

let overlay = null;
let running = false;

function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-ar-src="${src}"]`);
    if (existing) { existing.addEventListener('load', resolve); if (existing.dataset.loaded) resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.arSrc = src;
    Object.entries(attrs).forEach(([key, value]) => { script.dataset[key] = value; });
    script.addEventListener('load', () => { script.dataset.loaded = '1'; resolve(); });
    script.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)));
    document.head.appendChild(script);
  });
}

function loadEngine() {
  if (window.XR8) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El motor AR tardó demasiado en iniciar.')), 20000);
    window.addEventListener('xrloaded', () => { clearTimeout(timer); resolve(); }, { once: true });
    loadScript(ENGINE_URL, { preloadChunks: 'slam' }).catch((error) => { clearTimeout(timer); reject(error); });
  });
}

async function loadTargets() {
  const entries = Object.entries(TARGETS);
  return Promise.all(entries.map(async ([, cfg]) => {
    const response = await fetch(`${TARGET_BASE}${cfg.json}`);
    if (!response.ok) throw new Error(`No se pudo leer ${cfg.json} (${response.status})`);
    const data = await response.json();
    // El JSON generado por la CLI trae «image-targets/...»; aquí las imágenes viven en TARGET_BASE.
    data.imagePath = new URL(`${TARGET_BASE}${data.resources.luminanceImage}`, document.baseURI).href;
    return data;
  }));
}

function buildOverlay(onClose) {
  const box = document.createElement('div');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Experiencia de realidad aumentada');
  box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  const status = document.createElement('div');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'position:absolute;left:12px;right:12px;bottom:max(18px,env(safe-area-inset-bottom));padding:12px 14px;background:rgba(0,0,0,.6);color:#fff;font:600 14px/1.4 system-ui,sans-serif;text-align:center;border-radius:6px;';
  status.textContent = 'Iniciando cámara…';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Cerrar ✕';
  close.setAttribute('aria-label', 'Cerrar realidad aumentada');
  close.style.cssText = 'position:absolute;top:max(12px,env(safe-area-inset-top));right:12px;padding:10px 14px;border:0;border-radius:6px;background:#fff;color:#8a1428;font:700 14px system-ui,sans-serif;cursor:pointer;';
  close.addEventListener('click', onClose);
  box.append(canvas, status, close);
  document.body.appendChild(box);
  document.body.classList.add('dialog-open');
  return { box, canvas, status };
}

function loadModel(THREE, url) {
  return new Promise((resolve, reject) => {
    const start = () => new THREE.GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    if (THREE.GLTFLoader) start();
    else loadScript(GLTF_LOADER_URL).then(start, reject);
  });
}

function placeholderObject(THREE) {
  const group = new THREE.Group();
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xff051e }),
  );
  group.add(cube, new THREE.AxesHelper(0.5)); // ejes: rojo X, verde Y, azul Z (para ver la orientación)
  return group;
}

export function stopArScene() {
  if (running && window.XR8) { try { window.XR8.stop(); } catch { /* ya detenido */ } }
  running = false;
  if (overlay) { overlay.box.remove(); overlay = null; }
  document.body.classList.remove('dialog-open');
  document.removeEventListener('keydown', onKey);
}

function onKey(event) { if (event.key === 'Escape') stopArScene(); }

// Devuelve true si la escena AR arrancó; false si no es posible (para usar la demo 2D).
export async function startArScene() {
  if (running) return true;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  overlay = buildOverlay(stopArScene);
  document.addEventListener('keydown', onKey);
  try {
    overlay.status.textContent = 'Cargando motor AR…';
    await loadEngine();
    await loadScript(THREE_URL).catch(() => { throw new Error('No se pudo cargar three.js'); });
    const THREE = window.THREE;
    const targetData = await loadTargets();

    // Un objeto 3D por target, indexado por nombre.
    const objects = {};
    for (const data of targetData) {
      const cfg = TARGETS[data.name] || {};
      let object;
      try { object = cfg.model ? await loadModel(THREE, cfg.model) : placeholderObject(THREE); }
      catch (error) { console.warn(`Modelo de ${data.name} no disponible; se usa el objeto de prueba.`, error); object = placeholderObject(THREE); }
      const holder = new THREE.Group();
      holder.visible = false;
      holder.add(object);
      objects[data.name] = holder;
    }

    const XR8 = window.XR8;
    XR8.XrController.configure({ imageTargetData: targetData });

    const show = ({ detail }) => {
      const holder = objects[detail.name];
      if (!holder) return;
      holder.position.copy(detail.position);
      holder.quaternion.copy(detail.rotation);
      holder.scale.set(detail.scale, detail.scale, detail.scale);
      holder.visible = true;
      overlay.status.textContent = 'Lámina detectada';
    };
    const hide = ({ detail }) => {
      if (objects[detail.name]) objects[detail.name].visible = false;
      overlay.status.textContent = 'Apunta la cámara a la lámina';
    };

    const sceneModule = {
      name: 'aves-uao-scene',
      onStart: () => {
        const { scene, camera } = XR8.Threejs.xrScene();
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(1, 3, 2);
        scene.add(sun);
        Object.values(objects).forEach((holder) => scene.add(holder));
        camera.position.set(0, 3, 0);
        overlay.status.textContent = 'Apunta la cámara a la lámina';
      },
      listeners: [
        { event: 'reality.imagefound', process: show },
        { event: 'reality.imageupdated', process: show },
        { event: 'reality.imagelost', process: hide },
      ],
    };

    XR8.clearCameraPipelineModules();
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
      sceneModule,
    ]);
    XR8.run({ canvas: overlay.canvas });
    running = true;
    return true;
  } catch (error) {
    console.warn('No se pudo iniciar la escena AR; se usará la demostración 2D.', error);
    stopArScene();
    return false;
  }
}