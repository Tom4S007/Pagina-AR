// Escena AR real con el motor de 8th Wall (engine-binary) + three.js.
// Se carga bajo demanda: el motor y three.js sólo se descargan cuando la persona pulsa
// «Probar experiencia». Si algo falla, startArScene() devuelve false y app.js muestra la demo 2D.
//
// Licencia: el binario de 8th Wall se distribuye con licencia de uso limitado.
// Revisar «Permitted Use» y atribución antes de publicar en un sitio institucional.

import {
  ensureFbxLoader, loadFbxBird, buildEntries, createAnimator, fitModel, addTouchProxy, pickBird,
} from './ar-models.js';

const ENGINE_URL = 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
const GLTF_LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';

// Carpeta (relativa a la página) con el JSON y las imágenes generadas por la CLI.
const TARGET_BASE = './assets/targets/data/';
// Nombre del target (campo "name" del JSON) → modelo (.fbx o .glb). null = objeto de prueba (cubo + ejes).
// Opciones de los .fbx:
//   fit      tamaño (lado más largo) del ave en unidades de la lámina; ajústalo si se ve grande o pequeña.
//   rotation [x, y, z] en grados; todas las aves se giran para mirar hacia +Z (el borde inferior de la lámina).
//   remove   nombres de mallas sueltas que no son parte del ave.
//   texture / color / colors  respaldo si el FBX no trae su textura (ver fixMaterials en ar-models.js).
//   clips  animaciones recortadas del clip del FBX (segundos). Si se omite, se usan los clips del archivo.
//   idle   nombre de la animación de reposo (se repite en bucle; las demás se lanzan con un toque).
const TARGETS = {
  Canario: {
    json: 'Canario.json',
    model: 'assets/models/Canario/source/canario.fbx',
    texture: 'assets/models/Canario/texture/canario-texture.jpg', // el FBX apunta a una captura de pantalla que no está en el repo
    rotation: [0, 90, 0],
    clips: {
      reposo: { from: 9.25, to: 10.75, loop: 'pingpong' },
      vuelo: { from: 0, to: 5 },
      aterrizaje: { from: 5.25, to: 9.25 },
      picoteo: { from: 11, to: 13 },
    },
    idle: 'reposo',
  },
  Colibri: {
    json: 'Colibri.json',
    model: 'assets/models/colibri/source/colibri.fbx',
    texture: 'assets/models/colibri/textures/Image_1.png', // el FBX la busca junto a sí mismo, pero está en ../textures
    clips: {
      suspendido: { source: 'hover_skeletal.1', loop: 'repeat' },
      vuelo: { source: 'flight_skeletal.002', from: 0, to: 8, inPlace: true },
    },
    idle: 'suspendido',
  },
  Guacamaya: {
    json: 'Guacamaya.json',
    model: 'assets/models/Guacamaya/source/guacamaya.fbx',
    texture: 'assets/models/Guacamaya/texture/guacamaya.jpeg', // el FBX apunta a una imagen de WhatsApp que no está en el repo
    rotation: [0, 0, 0],
    clips: {
      reposo: { from: 9.75, to: 11, loop: 'pingpong' },
      vuelo: { from: 0, to: 4.75 },
      aterrizaje: { from: 5.25, to: 9.75 },
      picoteo: { from: 11, to: 13 },
    },
    idle: 'reposo',
  },
  Pechirrojo: {
    json: 'Pechirrojo.json',
    model: 'assets/models/pechirrojo.fbx',
    remove: ['Cubo001'], // cubo negro suelto bajo el ave
    rotation: [0, -90, 0],
    // La textura «plumaje rojo Color base» no viene con el FBX: el cuerpo (material 0) queda en un color liso.
    // Si añades esa imagen a assets/models/, usa `texture: 'assets/models/<archivo>'` en lugar de `colors`.
    colors: { 0: 0xd8431f },
    clips: {
      reposo: { from: 5, to: 5.75, loop: 'pingpong' },
      aleteo: { from: 1.75, to: 4.75 },
      acicalar: { from: 6, to: 7.5 },
    },
    idle: 'reposo',
  },
  TurpialAmarillo: { json: 'Turpial-Amarillo.json', model: null },
};

let overlay = null;
let running = false;
let resizeHandler = null;

// El motor no dimensiona el lienzo (queda en 300x150): se ajusta a la pantalla en píxeles reales.
function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // tope 2x para cuidar rendimiento y batería
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
}

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
    // Si index.html ya trae la etiqueta del motor, no se vuelve a inyectar.
    if (!document.querySelector('script[src*="engine-binary"]')) {
      loadScript(ENGINE_URL, { preloadChunks: 'slam' }).catch((error) => { clearTimeout(timer); reject(error); });
    }
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
  canvas.className = 'ar-canvas';
  if (!document.getElementById('ar-canvas-style')) {
    const style = document.createElement('style');
    style.id = 'ar-canvas-style';
    style.textContent = '.ar-canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;object-fit:cover}';
    document.head.appendChild(style);
  }
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

// Devuelve { root, clips, fbx }. Los .fbx se centran y escalan después (fitModel); los .glb se usan tal cual.
async function loadModel(THREE, cfg) {
  if (/\.fbx$/i.test(cfg.model)) return { ...(await loadFbxBird(THREE, cfg)), fbx: true };
  if (!THREE.GLTFLoader) await loadScript(GLTF_LOADER_URL);
  const gltf = await new Promise((resolve, reject) => new THREE.GLTFLoader().load(cfg.model, resolve, undefined, reject));
  return { root: gltf.scene, clips: gltf.animations || [], fbx: false };
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
  if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
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

    // Un objeto 3D por target, indexado por nombre. Los modelos se cargan en paralelo.
    if (Object.values(TARGETS).some((cfg) => /\.fbx$/i.test(cfg.model || ''))) await ensureFbxLoader(THREE, loadScript);
    const objects = {};
    const animators = {};
    await Promise.all(targetData.map(async (data) => {
      const cfg = TARGETS[data.name] || {};
      let model = null;
      try { if (cfg.model) model = await loadModel(THREE, cfg); }
      catch (error) { console.warn(`Modelo de ${data.name} no disponible; se usa el objeto de prueba.`, error); }
      const holder = new THREE.Group();
      holder.visible = false;
      if (model && model.clips.length) {
        const entries = buildEntries(THREE, model.clips, cfg.clips, model.rootBones);
        const animator = createAnimator(THREE, model.root, entries, cfg.idle, (clip) => {
          if (overlay && holder.visible) overlay.status.textContent = `${data.name} · ${clip} (toca el ave para cambiar)`;
        });
        animator.start();
        animator.update(0); // aplica el reposo: el ajuste de tamaño y posición se mide con esa pose
        animators[data.name] = animator;
      }
      if (model && model.fbx) {
        const fitted = fitModel(THREE, model.root, cfg);
        holder.add(fitted.object);
        addTouchProxy(THREE, holder, fitted.size, fitted.lift);
      } else {
        holder.add(model ? model.root : placeholderObject(THREE));
      }
      objects[data.name] = holder;
    }));
    const clock = new THREE.Clock();

    const XR8 = window.XR8;
    XR8.XrController.configure({ imageTargetData: targetData });

    const show = ({ detail }) => {
      const holder = objects[detail.name];
      if (!holder) return;
      holder.position.copy(detail.position);
      holder.quaternion.copy(detail.rotation);
      holder.scale.set(detail.scale, detail.scale, detail.scale);
      holder.visible = true;
      overlay.status.textContent = animators[detail.name] ? `${detail.name} · toca el ave para animarla` : 'Lámina detectada';
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

        // Toque sobre el ave → siguiente animación.
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const canvas = overlay.canvas;
        canvas.addEventListener('pointerdown', (event) => {
          const rect = canvas.getBoundingClientRect();
          ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
          const name = pickBird(THREE, raycaster, ndc, camera, objects);
          if (name && animators[name]) animators[name].next();
        });
        // Diagnóstico temporal: quitar cuando todo funcione.
        const report = () => {
          if (!overlay) return;
          const c = overlay.canvas;
          overlay.status.textContent = `canvas ${c.width}x${c.height} · css ${c.clientWidth}x${c.clientHeight} · dpr ${window.devicePixelRatio}`;
        };
        report();
        setTimeout(report, 1500);
      },
      onUpdate: () => {
        const dt = clock.getDelta();
        Object.values(animators).forEach((animator) => animator.update(dt));
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
    fitCanvas(overlay.canvas);
    resizeHandler = () => { if (overlay) fitCanvas(overlay.canvas); };
    window.addEventListener('resize', resizeHandler);
    XR8.run({ canvas: overlay.canvas });
    running = true;
    return true;
  } catch (error) {
    console.warn('No se pudo iniciar la escena AR; se usará la demostración 2D.', error);
    stopArScene();
    return false;
  }
}