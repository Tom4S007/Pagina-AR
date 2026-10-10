let activeStream = null;

// TODO: 8TH WALL — inyectar el SDK oficial desde la configuración del proyecto y cargar una
// escena XR8 aprobada (world tracking / image targets), con claves privadas en backend o
// variables autorizadas. Esta función de cámara es sólo una previsualización 2D local.
export function createArDialog() {
  return `<div class="ar-dialog-inner">
    <div><p class="eyebrow eyebrow-light"><span class="eyebrow-line"></span> Prototipo de interacción</p>
      <h2 id="ar-dialog-title">Una especie,<br /><em>a tu alrededor.</em></h2>
      <p>Esta demostración muestra un encuadre de cámara con una imagen de la guía. No reconoce el espacio ni ancla un ave en 3D.</p>
      <div class="ar-status" id="ar-status">La cámara permanece apagada hasta que la actives. El video se procesa sólo en tu dispositivo y se detiene al cerrar.</div>
      <div class="ar-controls"><button id="start-camera" type="button">Activar cámara de prueba</button><button class="secondary" type="button" id="ar-finish">Continuar sin cámara</button></div>
      <p class="detail-credit">8th Wall no está enlazado en esta versión: faltan la licencia, el proyecto XR y la escena publicada.</p>
    </div>
    <div class="ar-camera-wrap"><video id="ar-camera-video" autoplay muted playsinline aria-label="Vista previa de la cámara"></video><span class="camera-placeholder">La vista de cámara aparecerá aquí<br /><br />Actívala sólo si deseas probarla.</span><img class="camera-bird" src="/assets/loro-cabeciazul.jpg" alt="Ilustración de loro superpuesta para demostración, sin seguimiento espacial" /><span class="camera-overlay-label">CAPA VISUAL · SIN ANCLAJE AR</span></div>
  </div>`;
}

export async function startCameraPreview(video) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const error = new Error('La API de cámara no está disponible en este navegador seguro.');
    error.name = 'CameraUnavailableError';
    throw error;
  }
  activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  try {
    video.srcObject = activeStream;
    await video.play();
    return true;
  } catch (error) {
    stopCameraPreview(video);
    throw error;
  }
}

export function stopCameraPreview(video) {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
  if (video) video.srcObject = null;
}
