import { createArDialog, stopCameraPreview } from './ar.js';

const $ = (selector, root = document) => root.querySelector(selector);
const grid = $('#birds-grid');
const searchInput = $('#bird-search');
const familyFilter = $('#family-filter');
const sortSelect = $('#sort-order');
const resultCount = $('#result-count');
const emptyState = $('#empty-state');
const speciesDialog = $('#species-dialog');
const detailContent = $('#detail-content');
const toast = $('#toast');
const FAVORITES_KEY = 'aves-uao:favoritas:v1';
let records = [];
let showFavorites = false;
let toastTimer;
let returnFocusTo;

// TODO: DATABASE/API — reemplazar esta lectura local por GET {API_BASE_URL}/api/v1/species.
// El JSON actual es una muestra editorial; no constituye una base institucional ni persistencia.
async function loadCatalog() {
  try {
    const response = await fetch('./data/species.json', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`No se pudo leer el catálogo (${response.status})`);
    const catalog = await response.json();
    records = Array.isArray(catalog.records) ? catalog.records : [];
    populateFamilyFilter();
    renderCatalog();
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="load-error">No pudimos cargar la guía. Actualiza la página o consulta el archivo README.</p>';
    resultCount.textContent = 'Catálogo no disponible';
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function getFavorites() {
  // TODO: DATABASE — migrar favoritos a un perfil de usuario cuando se defina autenticación.
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveFavorites(favorites) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); }
  catch { showToast('El navegador no permitió guardar esta preferencia local.'); }
}
function populateFamilyFilter() {
  const selected = familyFilter.value || 'all';
  const families = [...new Set(records.map((record) => record.family).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  familyFilter.innerHTML = '<option value="all">Todas las familias</option>' + families.map((family) => `<option value="${escapeHtml(family)}">${escapeHtml(family)}</option>`).join('');
  if ([...familyFilter.options].some((option) => option.value === selected)) familyFilter.value = selected;
}
function getVisibleRecords() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  const family = familyFilter.value;
  const favorites = getFavorites();
  let visible = records.filter((record) => {
    const text = [record.common, record.scientific, record.english, record.family, record.order, record.description, ...(record.traits || [])].join(' ').toLocaleLowerCase('es');
    return (!query || text.includes(query)) && (family === 'all' || record.family === family) && (!showFavorites || favorites.has(record.id));
  });
  if (sortSelect.value === 'name') visible = visible.toSorted((a, b) => a.common.localeCompare(b.common, 'es'));
  if (sortSelect.value === 'family') visible = visible.toSorted((a, b) => a.family.localeCompare(b.family, 'es') || a.common.localeCompare(b.common, 'es'));
  return visible;
}
function renderImage(record) {
  if (record.image) {
    const isIllustration = (record.credit || '').includes('Ilustración');
    return `<img class="${isIllustration ? 'illustration' : ''}" src="${escapeHtml(record.image)}" alt="${escapeHtml(record.common)}" loading="lazy" />`;
  }
  return `<span class="image-pending" aria-label="Imagen de especie pendiente de digitalización"><svg viewBox="0 0 72 72" aria-hidden="true" fill="none"><path d="M12 42c11-2 19-16 31-17 6 0 10 4 10 9 0 2-1 4-2 5 5-1 10-4 14-9-2 12-10 20-23 21-10 1-18-4-26-5l-6 4 2-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M39 51c-2 5-5 8-9 10m14-9 4 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>`;
}
function renderCard(record) {
  const favorite = getFavorites().has(record.id);
  const status = record.status === 'transcribed' ? 'Ficha transcrita' : 'Inventario · ampliar';
  const summary = record.description;
  const imageCredit = record.credit ? `<span class="photo-credit-tag">${escapeHtml(record.credit.startsWith('Ilustración') ? 'Ilustración · guía 2023' : 'Fotografía · guía 2023')}</span>` : '<span class="photo-credit-tag">Imagen por digitalizar</span>';
  return `<article class="bird-card" data-species="${escapeHtml(record.id)}">
    <button class="bird-open" type="button" data-open-species="${escapeHtml(record.id)}" aria-label="Abrir ficha de ${escapeHtml(record.common)}">
      <span class="bird-image">${renderImage(record)}${imageCredit}</span>
      <span class="bird-card-body"><span class="bird-card-top"><span class="bird-card-title">${escapeHtml(record.common)}</span><span class="family-chip">${escapeHtml(record.family)}</span></span>
      <span class="scientific">${escapeHtml(record.scientific)}</span><span class="bird-summary">${escapeHtml(summary)}</span>
      <span class="card-footer"><span>${escapeHtml(status)}</span><strong>Ver ficha <span aria-hidden="true">↗</span></strong></span></span>
    </button>
    <button class="card-favorite" type="button" data-favorite="${escapeHtml(record.id)}" aria-pressed="${favorite}" aria-label="${favorite ? 'Quitar de' : 'Agregar a'} favoritas: ${escapeHtml(record.common)}" title="${favorite ? 'Quitar de favoritas' : 'Agregar a favoritas'}">${favorite ? '♥' : '♡'}</button>
  </article>`;
}
function renderCatalog() {
  const visible = getVisibleRecords();
  grid.innerHTML = visible.map(renderCard).join('');
  grid.hidden = visible.length === 0;
  emptyState.hidden = visible.length !== 0;
  const total = records.length;
  const transcribed = records.filter((record) => record.status === 'transcribed').length;
  resultCount.innerHTML = `<strong>${visible.length}</strong> resultados · ${total} registros de muestra <span class="count-context">· ${transcribed} fichas con descripción transcrita</span>`;
  $('#favorites-only').setAttribute('aria-pressed', String(showFavorites));
}
function resetFilters() {
  searchInput.value = '';
  familyFilter.value = 'all';
  sortSelect.value = 'featured';
  showFavorites = false;
  renderCatalog();
  searchInput.focus();
}
function openSpecies(id, trigger) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  returnFocusTo = trigger || document.activeElement;
  const wikiLink = record.wikiId ? `https://wikiaves.icesi.edu.co/birds/${encodeURIComponent(record.wikiId)}` : null;
  const detailImage = record.image ? `<img class="${(record.credit || '').includes('Ilustración') ? 'illustration' : ''}" src="${escapeHtml(record.image)}" alt="${escapeHtml(record.common)}" />` : `<div class="image-pending"><svg viewBox="0 0 72 72" aria-hidden="true" fill="none"><path d="M12 42c11-2 19-16 31-17 6 0 10 4 10 9 0 2-1 4-2 5 5-1 10-4 14-9-2 12-10 20-23 21-10 1-18-4-26-5l-6 4 2-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></div>`;
  const note = record.editorialNote ? `<p class="detail-note"><strong>Nota editorial.</strong> ${escapeHtml(record.editorialNote)}</p>` : record.status === 'index-only' ? '<p class="detail-note"><strong>Contenido por completar.</strong> Esta especie aparece en el inventario general; su descripción individual aún no se ha transcrito.</p>' : '';
  detailContent.innerHTML = `<div class="detail-art">${detailImage}<span class="detail-meta">${record.credit ? escapeHtml(record.credit) : 'Registro del inventario · imagen pendiente de digitalización'}</span></div>
    <div class="detail-body"><span class="detail-kicker">${escapeHtml(record.order)} · ficha UAO</span><h2 id="detail-name">${escapeHtml(record.common)}</h2><p class="detail-scientific">${escapeHtml(record.scientific)} <span aria-hidden="true">·</span> ${escapeHtml(record.english)}</p><span class="family-chip">Familia ${escapeHtml(record.family)}</span>
    <p class="detail-description">${escapeHtml(record.description)}</p><div class="detail-traits">${(record.traits || []).map((trait) => `<span>${escapeHtml(trait)}</span>`).join('')}</div>${note}
    <div class="detail-actions">${wikiLink ? `<a href="${wikiLink}" target="_blank" rel="noopener noreferrer">Más en Wiki Aves <span aria-hidden="true">↗</span></a>` : '<a class="secondary" href="https://wikiaves.icesi.edu.co/" target="_blank" rel="noopener noreferrer">Visitar Wiki Aves <span aria-hidden="true">↗</span></a>'}<button type="button" class="secondary" disabled aria-disabled="true" title="El audio no está incluido en el material cargado">Canto no disponible</button></div>
    <p class="detail-credit">${record.audioUrl ? 'Audio disponible en la ficha externa; no alojado en esta demostración.' : 'La guía enlaza a recursos de Wiki Aves. El audio no está disponible como archivo en esta versión.'}</p></div>`;
  speciesDialog.showModal();
  document.body.classList.add('dialog-open');
  history.replaceState(null, '', `#especie=${encodeURIComponent(id)}`);
  $('.dialog-close', speciesDialog).focus();
}
function closeSpecies() {
  if (!speciesDialog.open) return;
  speciesDialog.close();
}
function cleanupSpeciesDialog() {
  document.body.classList.remove('dialog-open');
  if (location.hash.startsWith('#especie=')) history.replaceState(null, '', '#explorar');
  returnFocusTo?.focus?.();
  returnFocusTo = null;
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

searchInput.addEventListener('input', renderCatalog);
familyFilter.addEventListener('change', renderCatalog);
sortSelect.addEventListener('change', renderCatalog);
$('#reset-filters').addEventListener('click', resetFilters);
$('#empty-reset').addEventListener('click', resetFilters);
$('#favorites-only').addEventListener('click', () => { showFavorites = !showFavorites; renderCatalog(); });
grid.addEventListener('click', (event) => {
  const favoriteButton = event.target.closest('[data-favorite]');
  if (favoriteButton) {
    event.stopPropagation();
    const favorites = getFavorites();
    const id = favoriteButton.dataset.favorite;
    if (favorites.has(id)) { favorites.delete(id); showToast('Ave retirada de tus favoritas locales.'); }
    else { favorites.add(id); showToast('Ave guardada en tus favoritas locales.'); }
    saveFavorites(favorites);
    renderCatalog();
    return;
  }
  const openButton = event.target.closest('[data-open-species]');
  if (openButton) openSpecies(openButton.dataset.openSpecies, openButton);
});
$('.dialog-close', speciesDialog).addEventListener('click', closeSpecies);
speciesDialog.addEventListener('click', (event) => { if (event.target === speciesDialog) closeSpecies(); });
speciesDialog.addEventListener('close', cleanupSpeciesDialog);
$('#open-ar').addEventListener('click', async () => {
  returnFocusTo = document.activeElement;
  const content = $('#ar-dialog-content');
  // TODO: 8TH WALL — when the project is provisioned, initialize the verified XR8 scene here.
  // Never use a public placeholder key. See README.md for scene, license and deployment setup.
  const configuredScene = window.AVES_UAO_8THWALL_CONFIG?.startScene;
  if (window.XR8 && typeof configuredScene === 'function') {
    try { await configuredScene(); return; }
    catch (error) { console.warn('Falló el inicio de la escena XR8; se mostrará la demo local.', error); }
  }
  content.innerHTML = createArDialog();
  const arDialog = $('#ar-dialog');
  arDialog.showModal();
  document.body.classList.add('dialog-open');
  $('.ar-close', arDialog).focus();
  $('#start-camera').addEventListener('click', async () => {
    const video = $('#ar-camera-video');
    const placeholder = $('.camera-placeholder');
    const status = $('#ar-status');
    try {
      await startCameraPreview(video);
      placeholder.hidden = true;
      status.textContent = 'Vista ilustrativa activa. La cámara no detecta superficies ni coloca un modelo 3D; nada se guarda ni se envía.';
      $('#start-camera').textContent = 'Cámara activa';
      $('#start-camera').disabled = true;
    } catch (error) {
      console.warn(error);
      status.textContent = error.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Puedes continuar con la demostración sin activar la cámara.' : 'No se pudo abrir la cámara. Verifica el permiso o usa un navegador con soporte de video.';
    }
  });
  $('.ar-close', arDialog).addEventListener('click', closeAr);
  $('#ar-finish').addEventListener('click', closeAr);
  arDialog.addEventListener('click', (event) => { if (event.target === arDialog) closeAr(); });
  arDialog.addEventListener('close', closeAr);
});
function closeAr() {
  const arDialog = $('#ar-dialog');
  if (arDialog.open) arDialog.close();
  stopCameraPreview($('#ar-camera-video'));
  document.body.classList.remove('dialog-open');
  returnFocusTo?.focus?.();
}
const menuToggle = $('.menu-toggle');
menuToggle.addEventListener('click', () => {
  const nav = $('#primary-nav');
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  menuToggle.setAttribute('aria-label', expanded ? 'Abrir menú' : 'Cerrar menú');
  nav.classList.toggle('is-open', !expanded);
});
$('#primary-nav').addEventListener('click', (event) => {
  if (event.target.closest('a')) { $('.menu-toggle').setAttribute('aria-expanded', 'false'); $('#primary-nav').classList.remove('is-open'); }
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !speciesDialog.open && !$('#ar-dialog').open) {
    event.preventDefault(); searchInput.focus();
  }
  if (event.key === 'Escape' && $('#ar-dialog').open) closeAr();
});
window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#especie=') && records.length) {
    const id = decodeURIComponent(location.hash.slice('#especie='.length));
    if (!speciesDialog.open) openSpecies(id);
  }
});
loadCatalog().then(() => {
  if (location.hash.startsWith('#especie=')) {
    const id = decodeURIComponent(location.hash.slice('#especie='.length));
    if (records.some((record) => record.id === id) && !speciesDialog.open) openSpecies(id);
  }
});
