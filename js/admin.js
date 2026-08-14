/**
 * admin.js — Panel de administración One Play More
 * VERSIÓN CORREGIDA: Fix banner expansion filter, prev/next carousel
 */

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'oneplaymore2025';
const ADMIN_KEY  = 'opm_admin_session';

let adminProducts    = [];
let adminCategories  = [];
let editingProductId = null;
let adminLoggedIn    = false;
let adminBanners     = [];
let adminCoupons     = [];
let editingBannerIndex = null;
let editingCategoryIndex = null;
let editingSubcategoryIndex = null;
let editingCouponIndex = null;

const BANNER_IMAGE_SIZES = {
  desktop: "1600x600 px recomendado (hasta 1920x720 en pantallas retina)",
  mobile: "Se recorta automático en móvil — no necesitas una segunda versión"
};

const BANNER_FILTER_OPTIONS = [
  { value: '', label: 'Sin filtro (link normal)' },
  { value: 'bestSeller', label: 'Ofertas / Más vendidos' },
  { value: 'new', label: 'Novedades' },
  { value: 'status', label: 'Por estado (preventa, agotado, etc.)' },
  { value: 'categoryId', label: 'Por categoría' },
  { value: 'expansion', label: 'Por expansión (Pokémon)' },
  { value: 'encargo', label: 'Por encargo' },
];

const BANNER_STATUS_OPTIONS = [
  { value: 'preventa', label: 'Preventa' },
  { value: 'agotado', label: 'Agotado' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'proximamente', label: 'Próximamente' },
];

const STATIC_BANNER_CATEGORIES = [
  { id: 'pokemon',  name: 'Pokémon TCG'     },
  { id: 'funko',    name: 'Funko Pop!'       },
  { id: 'figuras',  name: 'Figuras Ichiban'  },
  { id: 'cartas',   name: 'Cartas'           },
  { id: 'accesorios', name: 'Accesorios'     },
];

// Extrae el ID de video de una URL de YouTube (o lo deja igual si ya es un ID)
function extractYoutubeId(input) {
  if (!input) return '';
  input = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : input;
}

function initAdmin() {
  const existing = document.getElementById('adminOverlay');
  if (existing) {
    console.log('[Admin] Panel ya existe, no se re-inyecta.');
    return;
  }
  injectAdminStyles();
  injectAdminHTML();
  bindAdminEvents();
  checkAdminSession();
  console.log('[Admin] ✅ Panel inicializado. Atajo: Ctrl+Shift+A o Ctrl+Shift+M. Botón: escudo morado ↘️');
}

// Atajo: Ctrl+Shift+A o Ctrl+Shift+M (funciona en todos los navegadores)
// Usamos e.code para evitar problemas de layout de teclado
document.addEventListener('keydown', (e) => {
  const isA = e.ctrlKey && e.shiftKey && (e.code === 'KeyA' || e.key === 'A' || e.key === 'a');
  const isM = e.ctrlKey && e.shiftKey && (e.code === 'KeyM' || e.key === 'M' || e.key === 'm');
  if (isA || isM) {
    console.log('[Admin] Atajo detectado:', e.code || e.key);
    e.preventDefault();
    e.stopPropagation();
    if (!document.getElementById('adminOverlay')) {
      console.log('[Admin] Re-inyectando panel...');
      initAdmin();
    }
    toggleAdminPanel();
    return false;
  }
}, true); // capture: true

document.addEventListener('DOMContentLoaded', () => {
  initAdmin();
  const trigger = document.getElementById('adminTrigger');
  if (trigger) trigger.addEventListener('click', toggleAdminPanel);
  console.log('[Admin] DOM listo. Prueba Ctrl+Shift+A o haz click en el escudo morado ↘️');
});

function toggleAdminPanel() {
  let panel = document.getElementById('adminOverlay');
  if (!panel) {
    console.log('[Admin] Panel no encontrado, re-inyectando...');
    initAdmin();
    panel = document.getElementById('adminOverlay');
    if (!panel) {
      console.error('[Admin] ERROR: No se pudo inyectar el panel.');
      return;
    }
  }
  const isOpen = panel.classList.contains('admin-open');
  console.log('[Admin] Toggle panel, isOpen:', isOpen);
  if (isOpen) {
    closeAdminPanel();
  } else {
    openAdminPanel();
  }
}

function openAdminPanel() {
  let panel = document.getElementById('adminOverlay');
  if (!panel) {
    console.log('[Admin] Re-inyectando panel desde openAdminPanel...');
    initAdmin();
    panel = document.getElementById('adminOverlay');
    if (!panel) {
      console.error('[Admin] ERROR: No se pudo crear el panel.');
      return;
    }
  }
  panel.classList.add('admin-open');
  document.body.style.overflow = 'hidden';
  console.log('[Admin] Panel abierto. LoggedIn:', adminLoggedIn);
  if (!adminLoggedIn) {
    showAdminView('loginView');
  } else {
    refreshAdminData();
    showAdminView('dashboardView');
  }
}

function closeAdminPanel() {
  const panel = document.getElementById('adminOverlay');
  if (panel) panel.classList.remove('admin-open');
  document.body.style.overflow = '';
}

function checkAdminSession() {
  const stored = sessionStorage.getItem(ADMIN_KEY);
  if (stored === 'true') {
    adminLoggedIn = true;
  }
}

function loginAdmin() {
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value.trim();
  const err  = document.getElementById('adminLoginError');

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    adminLoggedIn = true;
    sessionStorage.setItem(ADMIN_KEY, 'true');
    refreshAdminData();
    showAdminView('dashboardView');
  } else {
    err.textContent = 'Usuario o contraseña incorrectos.';
    err.style.display = 'block';
    const box = document.getElementById('adminLoginBox');
    box.classList.add('admin-shake');
    setTimeout(() => box.classList.remove('admin-shake'), 500);
  }
}

function logoutAdmin() {
  adminLoggedIn = false;
  sessionStorage.removeItem(ADMIN_KEY);
  showAdminView('loginView');
}

function showAdminView(viewId) {
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.add('active');
  } else {
    console.warn('[Admin] Vista no encontrada:', viewId);
  }
}

function refreshAdminData() {
  adminProducts   = JSON.parse(JSON.stringify(typeof allProducts   !== 'undefined' ? allProducts   : []));
  adminCategories = JSON.parse(JSON.stringify(typeof allCategories !== 'undefined' ? allCategories : []));
  renderAdminProductList();
  renderAdminStats();
  populateCategorySelect();
  refreshAdminBanners();
  refreshAdminCategories();
  refreshAdminCoupons();
  refreshAdminAnnouncement();
}

function renderAdminStats() {
  const total     = adminProducts.length;
  const nuevos    = adminProducts.filter(p => p.new).length;
  const ofertas   = adminProducts.filter(p => p.bestSeller).length;
  const encargos  = adminProducts.filter(p => p.encargo).length;
  const avgPrice  = total > 0
    ? Math.round(adminProducts.reduce((s, p) => s + p.price, 0) / total)
    : 0;

  setStatEl('statTotal',   total);
  setStatEl('statNew',     nuevos);
  setStatEl('statOfertas', ofertas);
  setStatEl('statAvg',     `$${avgPrice.toLocaleString('es-CO')}`);
}

function setStatEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderAdminProductList(filterText = '') {
  const container = document.getElementById('adminProductList');
  if (!container) return;

  let list = adminProducts;
  if (filterText) {
    const q = filterText.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  if (list.length === 0) {
    container.innerHTML = `<div class="admin-empty">No hay productos. ¡Crea el primero!</div>`;
    return;
  }

  container.innerHTML = list.map(p => {
    const img = p.images && p.images[0] ? p.images[0] : 'images/products/placeholder.jpg';
    const badges = [
      p.new        ? '<span class="admin-badge new">Nuevo</span>'      : '',
      p.bestSeller ? '<span class="admin-badge oferta">Oferta</span>'  : '',
      p.encargo    ? '<span class="admin-badge encargo">Encargo</span>': '',
    ].filter(Boolean).join('');

    return `
      <div class="admin-product-row" data-id="${p.id}">
        <img src="${img}" class="admin-product-thumb" onerror="this.src='images/products/placeholder.jpg'">
        <div class="admin-product-info">
          <div class="admin-product-name">${p.name}</div>
          <div class="admin-product-meta">${p.category || '—'} · $${(p.price||0).toLocaleString('es-CO')} ${badges}</div>
        </div>
        <div class="admin-product-actions">
          <button class="admin-btn-icon edit"   onclick="editAdminProduct('${p.id}')" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="admin-btn-icon preview" onclick="previewAdminProduct('${p.id}')" title="Preview"><i class="fas fa-eye"></i></button>
          <button class="admin-btn-icon delete" onclick="deleteAdminProduct('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function populateCategorySelect() {
  const sel = document.getElementById('formCategory');
  const subSel = document.getElementById('formSubcategory');
  if (!sel) return;

  const staticCats = [
    { id: 'pokemon',  name: 'Pokémon TCG'     },
    { id: 'funko',    name: 'Funko Pop!'       },
    { id: 'figuras',  name: 'Figuras Ichiban'  },
    { id: 'cartas',   name: 'Cartas'           },
    { id: 'accesorios', name: 'Accesorios'     },
  ];
  const cats = adminCategories.length > 0 ? adminCategories : staticCats;

  sel.innerHTML = '<option value="">— Categoría —</option>' +
    cats.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('');

  sel.addEventListener('change', () => {
    const cat = cats.find(c => c.id === sel.value);
    const subField = document.getElementById('subcategoryField');
    if (cat && cat.subcategories && cat.subcategories.length > 0) {
      subSel.innerHTML = '<option value="">— Sin subcategoría —</option>' +
        cat.subcategories.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      if (subField) subField.style.display = 'block';
    } else {
      subSel.innerHTML = '<option value="">— Sin subcategoría —</option>';
      if (subField) subField.style.display = 'none';
    }
    updateProductPreview();
  });
}

function openProductForm(product = null) {
  editingProductId = product ? product.id : null;
  const title = document.getElementById('formTitle');
  title.textContent = product ? 'Editar Producto' : 'Nuevo Producto';

  clearProductForm();

  if (product) {
    document.getElementById('formId').value          = product.id          || '';
    document.getElementById('formName').value        = product.name        || '';
    document.getElementById('formPrice').value       = product.price       || '';
    document.getElementById('formOriginalPrice').value = product.originalPrice || '';
    document.getElementById('formDescription').value = product.description || '';
    document.getElementById('formExpansion').value   = product.expansion   || '';
    document.getElementById('formStatus').value      = product.status      || 'disponible';
    document.getElementById('formNew').checked       = !!product.new;
    document.getElementById('formBestSeller').checked = !!product.bestSeller;
    document.getElementById('formEncargo').checked   = !!product.encargo;
    document.getElementById('formEncargoNota').value = product.encargoNota || '';
    document.getElementById('formIncludes').value    = (product.includes || []).join('\n');
    document.getElementById('formImages').value      = (product.images   || []).join('\n');

    const catSel = document.getElementById('formCategory');
    if (catSel && product.categoryId) {
      catSel.value = product.categoryId;
      catSel.dispatchEvent(new Event('change'));
    }

    document.getElementById('formAttributes').value = product.attributes
      ? JSON.stringify(product.attributes, null, 2)
      : '';
  }

  updateProductPreview();
  showAdminView('formView');
}

function clearProductForm() {
  ['formId','formName','formPrice','formOriginalPrice','formDescription',
   'formExpansion','formAttributes','formIncludes','formImages','formEncargoNota'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const status = document.getElementById('formStatus');
  if (status) status.value = 'disponible';
  ['formNew','formBestSeller','formEncargo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  clearPreview();
}

function editAdminProduct(id) {
  const product = adminProducts.find(p => p.id === id);
  if (product) openProductForm(product);
}

function deleteAdminProduct(id) {
  const product = adminProducts.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`¿Eliminar "${product.name}"? Esta acción solo afecta la copia en memoria. Exporta el JSON para que sea permanente.`)) return;
  adminProducts = adminProducts.filter(p => p.id !== id);
  renderAdminProductList();
  renderAdminStats();
  showAdminToast('Producto eliminado de la lista temporal.', 'warning');
}

function saveAdminProduct() {
  const name  = document.getElementById('formName').value.trim();
  const price = parseFloat(document.getElementById('formPrice').value);
  if (!name)         { showAdminToast('El nombre es obligatorio.', 'error'); return; }
  if (isNaN(price))  { showAdminToast('El precio es obligatorio.', 'error'); return; }

  const catSel  = document.getElementById('formCategory');
  const catId   = catSel.value;
  const catName = catSel.selectedOptions[0]?.dataset.name || catId;

  const includes   = document.getElementById('formIncludes').value
    .split("\n").map(s => s.trim()).filter(Boolean);
  const images     = document.getElementById('formImages').value
    .split("\n").map(s => s.trim()).filter(Boolean);
  let attributes   = [];
  const attrsRaw   = document.getElementById('formAttributes').value.trim();
  if (attrsRaw) {
    try { attributes = JSON.parse(attrsRaw); }
    catch { showAdminToast('El JSON de atributos no es válido.', 'error'); return; }
  }

  const id = editingProductId || slugify(name) + '-' + Date.now().toString(36);
  const subSel = document.getElementById('formSubcategory');
  const subcategoryId = subSel && subSel.value ? subSel.value : undefined;

  const product = {
    id,
    name,
    category:      catName,
    categoryId:    catId,
    subcategoryId,
    price,
    originalPrice: parseFloat(document.getElementById('formOriginalPrice').value) || null,
    description:   document.getElementById('formDescription').value.trim(),
    expansion:     document.getElementById('formExpansion').value.trim() || undefined,
    status:        document.getElementById('formStatus').value,
    new:           document.getElementById('formNew').checked,
    bestSeller:    document.getElementById('formBestSeller').checked,
    encargo:       document.getElementById('formEncargo').checked,
    encargoNota:   document.getElementById('formEncargoNota').value.trim() || undefined,
    includes:      includes.length ? includes : undefined,
    images:        images.length   ? images   : ['images/products/placeholder.jpg'],
    attributes:    attributes.length ? attributes : undefined,
  };

  Object.keys(product).forEach(k => {
    if (product[k] === null || product[k] === undefined) delete product[k];
  });

  if (editingProductId) {
    const idx = adminProducts.findIndex(p => p.id === editingProductId);
    if (idx !== -1) adminProducts[idx] = product;
  } else {
    adminProducts.unshift(product);
  }

  renderAdminProductList();
  renderAdminStats();
  showAdminToast(editingProductId ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success');
  showAdminView('dashboardView');
}

function updateProductPreview() {
  const name    = document.getElementById('formName')?.value.trim()  || 'Nombre del producto';
  const price   = parseFloat(document.getElementById('formPrice')?.value) || 0;
  const origP   = parseFloat(document.getElementById('formOriginalPrice')?.value) || null;
  const cat     = document.getElementById('formCategory')?.selectedOptions[0]?.dataset.name || 'Categoría';
  const images  = (document.getElementById('formImages')?.value || '')
    .split("\n").map(s => s.trim()).filter(Boolean);
  const img     = images[0] || 'images/products/placeholder.jpg';
  const isNew   = document.getElementById('formNew')?.checked;
  const isOffer = document.getElementById('formBestSeller')?.checked;
  const isEnc   = document.getElementById('formEncargo')?.checked;

  const preview = document.getElementById('adminPreviewCard');
  if (!preview) return;

  preview.innerHTML = `
    <div class="admin-preview-card">
      <div class="admin-preview-img-wrap">
        ${isNew    ? '<span class="admin-badge-overlay new">Nuevo</span>'      : ''}
        ${isOffer  ? '<span class="admin-badge-overlay oferta">Oferta</span>'  : ''}
        ${isEnc    ? '<span class="admin-badge-overlay encargo">Encargo</span>': ''}
        <img src="${img}" alt="${name}" onerror="this.src='images/products/placeholder.jpg'">
      </div>
      <div class="admin-preview-body">
        <div class="admin-preview-cat">${cat}</div>
        <div class="admin-preview-name">${name}</div>
        <div class="admin-preview-prices">
          ${origP ? `<span class="admin-preview-orig">$${origP.toLocaleString('es-CO')}</span>` : ''}
          <span class="admin-preview-price">$${price.toLocaleString('es-CO')}</span>
        </div>
        <button class="admin-preview-btn">Vista rápida</button>
      </div>
    </div>
  `;
}

function clearPreview() {
  const preview = document.getElementById('adminPreviewCard');
  if (preview) preview.innerHTML = `<div class="admin-preview-placeholder"><i class="fas fa-image"></i><p>El preview aparecerá aquí</p></div>`;
}

function previewAdminProduct(id) {
  const product = adminProducts.find(p => p.id === id);
  if (!product) return;
  if (typeof openProductModal === 'function') {
    closeAdminPanel();
    setTimeout(() => openProductModal(product), 200);
  }
}

function exportAdminJSON() {
  const json = JSON.stringify(adminProducts, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'products.json';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('products.json descargado. Súbelo a /data/ en GitHub.', 'success');
}

function applyAdminChangesLive() {
  if (typeof allProducts !== 'undefined') {
    allProducts.length = 0;
    adminProducts.forEach(p => allProducts.push(p));
    if (typeof renderProducts === 'function') renderProducts(allProducts);
    showAdminToast('Cambios aplicados al sitio (sesión actual).', 'success');
  }
}

function showAdminToast(msg, type = 'success') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `admin-toast admin-toast-${type} show`;
  clearTimeout(adminToastTimer);
  adminToastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
let adminToastTimer;

function slugify(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').toLowerCase();
}


// ─────────────────────────────────────────────
// BANNERS CON FILTROS — CORREGIDO
// ─────────────────────────────────────────────

function refreshAdminBanners() {
  adminBanners = JSON.parse(JSON.stringify(typeof allBanners !== 'undefined' ? allBanners : []));
  renderAdminBannerList();
}

function renderAdminBannerList() {
  const container = document.getElementById('adminBannerList');
  if (!container) return;

  if (adminBanners.length === 0) {
    container.innerHTML = `<div class="admin-empty">No hay banners. ¡Crea el primero!</div>`;
    return;
  }

  container.innerHTML = adminBanners.map((b, idx) => {
    const filterLabel = BANNER_FILTER_OPTIONS.find(f => f.value === b.filterType)?.label || '';
    const mediaIcon = b.mediaType === 'video' ? '🎬' : b.mediaType === 'youtube' ? '▶️' : '🖼️';
    const thumb = (b.mediaType === 'youtube' && b.youtubeId)
      ? `https://img.youtube.com/vi/${b.youtubeId}/mqdefault.jpg`
      : (b.image || 'images/products/placeholder.jpg');
    const scopeBadge = b.scope === 'category'
      ? `<div class="admin-banner-filter"><i class="fas fa-layer-group"></i> Solo en categoría: ${b.targetCategory || '—'}</div>`
      : '';
    return `
    <div class="admin-banner-row" data-index="${idx}">
      <img src="${thumb}" class="admin-banner-thumb" onerror="this.src='images/products/placeholder.jpg'">
      <div class="admin-banner-info">
        <div class="admin-banner-title">${mediaIcon} ${b.title}</div>
        <div class="admin-banner-meta">${b.subtitle || '—'} · ${b.buttonText || '—'}</div>
        <div class="admin-banner-url">${b.link || ''}</div>
        ${b.filterType ? `<div class="admin-banner-filter"><i class="fas fa-filter"></i> ${filterLabel}${b.filterValue ? ': ' + b.filterValue : ''}</div>` : ''}
        ${scopeBadge}
      </div>
      <div class="admin-banner-actions">
        <button class="admin-btn-icon edit" onclick="editAdminBanner(${idx})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="admin-btn-icon delete" onclick="deleteAdminBanner(${idx})" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `}).join('');
}

function openBannerForm(banner = null, index = null) {
  editingBannerIndex = index;
  const title = document.getElementById('bannerFormTitle');
  title.textContent = banner ? 'Editar Banner' : 'Nuevo Banner';

  // Limpiar formulario primero
  document.getElementById('bannerImage').value = '';
  document.getElementById('bannerVideo').value = '';
  document.getElementById('bannerYoutube').value = '';
  document.getElementById('bannerMediaType').value = 'image';
  document.getElementById('bannerTitle').value = '';
  document.getElementById('bannerSubtitle').value = '';
  document.getElementById('bannerButton').value = '';
  document.getElementById('bannerLink').value = '';
  document.getElementById('bannerScope').value = 'global';
  document.getElementById('bannerFilterType').value = '';
  document.getElementById('bannerFilterValue').value = '';
  document.getElementById('bannerFilterValueSelect').innerHTML = '';
  document.getElementById('bannerCategoryId').value = '';

  populateBannerTargetCategorySelect();

  if (banner) {
    document.getElementById('bannerImage').value = banner.image || '';
    document.getElementById('bannerVideo').value = banner.video || '';
    document.getElementById('bannerYoutube').value = banner.youtubeId || '';
    document.getElementById('bannerMediaType').value = banner.mediaType || 'image';
    document.getElementById('bannerTitle').value = banner.title || '';
    document.getElementById('bannerSubtitle').value = banner.subtitle || '';
    document.getElementById('bannerButton').value = banner.buttonText || '';
    document.getElementById('bannerLink').value = banner.link || '';
    document.getElementById('bannerCategoryId').value = banner.categoryId || '';
    document.getElementById('bannerScope').value = banner.scope === 'category' ? 'category' : 'global';
    if (banner.scope === 'category' && banner.targetCategory) {
      document.getElementById('bannerTargetCategory').value = banner.targetCategory;
    }

    // CORRECCIÓN: Establecer filterType PRIMERO, luego actualizar campos
    const filterTypeSel = document.getElementById('bannerFilterType');
    filterTypeSel.value = banner.filterType || '';

    // Actualizar campos visibles según el tipo de filtro
    updateBannerFilterFields();

    // CORRECCIÓN: Ahora que los campos están visibles, establecer los valores
    if (banner.filterType) {
      if (banner.filterType === 'status') {
        const filterValueSelect = document.getElementById('bannerFilterValueSelect');
        if (filterValueSelect) filterValueSelect.value = banner.filterValue || '';
      } else if (banner.filterType !== 'bestSeller' && banner.filterType !== 'new' && banner.filterType !== 'encargo') {
        document.getElementById('bannerFilterValue').value = banner.filterValue || '';
      }
    }
  } else {
    // Para nuevo banner, resetear campos de filtro
    updateBannerFilterFields();
  }

  updateBannerMediaFields();
  updateBannerScopeFields();
  updateBannerPreview();
  updateBannerFilterPreview();
  showAdminView('bannerFormView');
}

// Muestra/oculta los campos de Imagen / Video / YouTube según el tipo elegido
function updateBannerMediaFields() {
  const mediaType = document.getElementById('bannerMediaType').value;
  const imageWrap = document.getElementById('bannerImageWrap');
  const videoWrap = document.getElementById('bannerVideoWrap');
  const youtubeWrap = document.getElementById('bannerYoutubeWrap');
  const imageLabel = document.getElementById('bannerImageLabel');

  imageWrap.style.display = mediaType === 'image' ? 'block' : 'none';
  videoWrap.style.display = mediaType === 'video' ? 'block' : 'none';
  youtubeWrap.style.display = mediaType === 'youtube' ? 'block' : 'none';

  if (mediaType === 'image') {
    imageLabel.innerHTML = `Imagen (URL) * <span class="optional">${BANNER_IMAGE_SIZES.desktop}</span>`;
  }
}

// Muestra/oculta el selector de categoría objetivo según el ámbito elegido
function updateBannerScopeFields() {
  const scope = document.getElementById('bannerScope').value;
  const wrap = document.getElementById('bannerTargetCategoryWrap');
  wrap.style.display = scope === 'category' ? 'block' : 'none';
}

// Llena el selector de "Categoría objetivo" con las categorías (y subcategorías) disponibles
function populateBannerTargetCategorySelect() {
  const sel = document.getElementById('bannerTargetCategory');
  if (!sel) return;
  const cats = adminCategories.length > 0 ? adminCategories : STATIC_BANNER_CATEGORIES;

  let options = [];
  cats.forEach(c => {
    options.push(`<option value="${c.id}">${c.name}</option>`);
    if (c.subcategories && c.subcategories.length > 0) {
      c.subcategories.forEach(s => {
        options.push(`<option value="${c.id}">↳ ${s.name} (dentro de ${c.name})</option>`);
      });
    }
  });
  // "ofertas"/"novedades"/"encargo" también son vistas de categoría válidas
  options.push(`<option value="ofertas">🔥 Ofertas</option>`);
  options.push(`<option value="novedades">✨ Novedades</option>`);
  options.push(`<option value="encargo">📦 Encargo</option>`);

  sel.innerHTML = options.join('');
}

function updateBannerFilterFields() {
  const filterType = document.getElementById('bannerFilterType').value;
  const valueInputWrap = document.getElementById('bannerFilterValueWrap');
  const valueSelectWrap = document.getElementById('bannerFilterValueSelectWrap');
  const categoryWrap = document.getElementById('bannerCategoryIdWrap');
  const valueInput = document.getElementById('bannerFilterValue');
  const valueSelect = document.getElementById('bannerFilterValueSelect');

  valueInputWrap.style.display = 'none';
  valueSelectWrap.style.display = 'none';
  categoryWrap.style.display = 'none';
  valueInput.value = '';
  valueSelect.innerHTML = '';

  if (!filterType) return;

  if (filterType === 'status') {
    valueSelectWrap.style.display = 'block';
    valueSelect.innerHTML = BANNER_STATUS_OPTIONS.map(o => 
      `<option value="${o.value}">${o.label}</option>`
    ).join('');
  } else if (filterType === 'categoryId') {
    valueInputWrap.style.display = 'block';
    valueInput.placeholder = 'Ej: pokemon, funko, figuras, cartas';
  } else if (filterType === 'expansion') {
    valueInputWrap.style.display = 'block';
    categoryWrap.style.display = 'block';
    valueInput.placeholder = 'Ej: Scarlet & Violet, Paldean Fates';
  } else if (filterType === 'bestSeller' || filterType === 'new' || filterType === 'encargo') {
    valueInput.value = 'true';
  } else {
    valueInputWrap.style.display = 'block';
    valueInput.placeholder = 'Valor del filtro';
  }
}

function updateBannerFilterPreview() {
  const filterType = document.getElementById('bannerFilterType').value;
  const preview = document.getElementById('adminBannerFilterPreview');
  if (!preview) return;

  if (!filterType) {
    preview.innerHTML = '<span class="filter-preview-none">Sin filtro — el banner usará el link normal</span>';
    return;
  }

  const filterLabel = BANNER_FILTER_OPTIONS.find(f => f.value === filterType)?.label || filterType;
  let valueText = '';

  if (filterType === 'status') {
    const sel = document.getElementById('bannerFilterValueSelect');
    valueText = sel ? sel.value : '';
  } else if (filterType !== 'bestSeller' && filterType !== 'new' && filterType !== 'encargo') {
    valueText = document.getElementById('bannerFilterValue').value;
  }

  const categoryId = document.getElementById('bannerCategoryId').value;

  preview.innerHTML = `
    <div class="filter-preview-active">
      <i class="fas fa-filter"></i>
      <strong>${filterLabel}</strong>
      ${valueText ? `<span>→ ${valueText}</span>` : ''}
      ${categoryId && filterType === 'expansion' ? `<span>en ${categoryId}</span>` : ''}
      <br><small>Al hacer clic, filtrará productos en vez de seguir el link</small>
    </div>
  `;
}

function editAdminBanner(index) {
  openBannerForm(adminBanners[index], index);
}

function deleteAdminBanner(index) {
  if (!confirm(`¿Eliminar banner #${index + 1}?`)) return;
  adminBanners.splice(index, 1);
  renderAdminBannerList();
  showAdminToast('Banner eliminado.', 'warning');
}

function saveAdminBanner() {
  const mediaType = document.getElementById('bannerMediaType').value || 'image';
  const image = document.getElementById('bannerImage').value.trim();
  const video = document.getElementById('bannerVideo').value.trim();
  const youtubeRaw = document.getElementById('bannerYoutube').value.trim();
  const youtubeId = extractYoutubeId(youtubeRaw);
  const title = document.getElementById('bannerTitle').value.trim();
  const subtitle = document.getElementById('bannerSubtitle').value.trim();
  const buttonText = document.getElementById('bannerButton').value.trim();
  const link = document.getElementById('bannerLink').value.trim();
  const scope = document.getElementById('bannerScope').value || 'global';
  const targetCategory = document.getElementById('bannerTargetCategory').value;

  const filterType = document.getElementById('bannerFilterType').value;
  let filterValue = '';
  let categoryId = '';

  if (filterType) {
    if (filterType === 'status') {
      filterValue = document.getElementById('bannerFilterValueSelect').value;
    } else if (filterType !== 'bestSeller' && filterType !== 'new' && filterType !== 'encargo') {
      filterValue = document.getElementById('bannerFilterValue').value.trim();
    } else {
      filterValue = 'true';
    }
    categoryId = document.getElementById('bannerCategoryId').value.trim();
  }

  if (!title) {
    showAdminToast('El título es obligatorio.', 'error');
    return;
  }
  if (mediaType === 'image' && !image) {
    showAdminToast('La imagen es obligatoria para este tipo de banner.', 'error');
    return;
  }
  if (mediaType === 'video' && !video) {
    showAdminToast('La ruta del video es obligatoria.', 'error');
    return;
  }
  if (mediaType === 'youtube' && !youtubeId) {
    showAdminToast('El link o ID de YouTube es obligatorio.', 'error');
    return;
  }
  if (scope === 'category' && !targetCategory) {
    showAdminToast('Selecciona la categoría objetivo para este banner.', 'error');
    return;
  }

  const banner = { image, title, subtitle, buttonText, link, mediaType };

  if (mediaType === 'video') banner.video = video;
  if (mediaType === 'youtube') banner.youtubeId = youtubeId;

  banner.scope = scope;
  if (scope === 'category') banner.targetCategory = targetCategory;

  if (filterType) {
    banner.filterType = filterType;
    banner.filterValue = filterValue;
    if (categoryId) banner.categoryId = categoryId;
  }

  if (editingBannerIndex !== null) {
    adminBanners[editingBannerIndex] = banner;
  } else {
    adminBanners.push(banner);
  }

  renderAdminBannerList();
  showAdminToast(editingBannerIndex !== null ? 'Banner actualizado ✓' : 'Banner creado ✓', 'success');
  showAdminView('bannerListView');
}

function updateBannerPreview() {
  const mediaType = document.getElementById('bannerMediaType')?.value || 'image';
  const img = document.getElementById('bannerImage')?.value.trim();
  const video = document.getElementById('bannerVideo')?.value.trim();
  const youtubeId = extractYoutubeId(document.getElementById('bannerYoutube')?.value.trim());
  const title = document.getElementById('bannerTitle')?.value.trim() || 'Título del banner';
  const subtitle = document.getElementById('bannerSubtitle')?.value.trim() || 'Subtítulo';
  const btnText = document.getElementById('bannerButton')?.value.trim() || 'Ver más';
  const scope = document.getElementById('bannerScope')?.value || 'global';
  const targetCategory = document.getElementById('bannerTargetCategory')?.value || '';

  const preview = document.getElementById('adminBannerPreview');
  if (!preview) return;

  let mediaHTML = '';
  let bgStyle = '';

  if (mediaType === 'video' && video) {
    mediaHTML = `<video class="admin-banner-preview-media" src="${video}" autoplay muted loop playsinline></video>`;
  } else if (mediaType === 'youtube' && youtubeId) {
    mediaHTML = `<img class="admin-banner-preview-media" src="https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg" alt="Preview de YouTube">`;
  } else {
    bgStyle = `style="background-image:url('${img || 'images/products/placeholder.jpg'}');"`;
  }

  const scopeNote = scope === 'category'
    ? `<div class="admin-banner-sizes"><i class="fas fa-layer-group"></i> Solo se mostrará al entrar a: <strong>${targetCategory || '— selecciona una categoría —'}</strong> (reemplaza carrusel y destacados ahí)</div>`
    : `<div class="admin-banner-sizes"><i class="fas fa-globe"></i> Banner global, rota en el carrusel principal</div>`;

  preview.innerHTML = `
    <div class="admin-banner-preview-card" ${bgStyle}>
      ${mediaHTML}
      <div class="admin-banner-preview-overlay">
        <h4>${title}</h4>
        <p>${subtitle}</p>
        <span class="admin-banner-preview-btn">${btnText}</span>
      </div>
    </div>
    <div class="admin-banner-sizes">
      <i class="fas fa-info-circle"></i> Tamaño fijo del carrusel (${BANNER_IMAGE_SIZES.desktop}); se reescala solo en móvil, sin necesidad de otro archivo.
    </div>
    ${scopeNote}
  `;
}

function clearBannerPreview() {
  const preview = document.getElementById('adminBannerPreview');
  if (preview) preview.innerHTML = `<div class="admin-preview-placeholder"><i class="fas fa-image"></i><p>El preview aparecerá aquí</p></div>`;
}

function exportBannersJSON() {
  const json = JSON.stringify(adminBanners, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'banners.json';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('banners.json descargado.', 'success');
}

function applyBannersChangesLive() {
  if (typeof allBanners !== 'undefined') {
    allBanners.length = 0;
    adminBanners.forEach(b => allBanners.push(b));

    const activeCategory = (typeof currentFilter !== 'undefined' && currentFilter && currentFilter.categoryId) ? currentFilter.categoryId : 'all';

    if (typeof applyCategoryBannerView === 'function') {
      applyCategoryBannerView(activeCategory);
    } else if (typeof renderCarousel === 'function') {
      renderCarousel(allBanners);
      initCarousel();
    }
    showAdminToast('Banners aplicados al sitio.', 'success');
  } else {
    console.warn('allBanners no definido, no se puede aplicar.');
  }
}

// ─────────────────────────────────────────────
// CUPONES / DESCUENTOS FLASH
// ─────────────────────────────────────────────
function refreshAdminCoupons() {
  adminCoupons = JSON.parse(JSON.stringify(typeof allCoupons !== 'undefined' ? allCoupons : []));
  renderAdminCouponList();
}

function renderAdminCouponList() {
  const container = document.getElementById('adminCouponList');
  if (!container) return;

  if (adminCoupons.length === 0) {
    container.innerHTML = `<div class="admin-empty">No hay cupones. ¡Crea el primero para tu próximo descuento flash!</div>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  container.innerHTML = adminCoupons.map((c, idx) => {
    const expired = c.endDate && today > c.endDate;
    const notStarted = c.startDate && today < c.startDate;
    let statusLabel = 'Inactivo';
    let statusClass = 'off';
    if (c.active && !expired && !notStarted) { statusLabel = 'Activo ahora'; statusClass = 'on'; }
    else if (c.active && notStarted) { statusLabel = 'Programado'; statusClass = 'scheduled'; }
    else if (c.active && expired) { statusLabel = 'Vencido'; statusClass = 'off'; }

    const valueLabel = c.type === 'percent' ? `${c.value}%` : `$${Number(c.value).toLocaleString('es-CO')}`;
    const scopeLabel = c.scope === 'category' ? `Solo categoría: ${c.scopeValue}` : 'Todo el carrito';
    const datesLabel = (c.startDate || c.endDate) ? `${c.startDate || '…'} → ${c.endDate || '…'}` : 'Sin fecha límite';

    return `
    <div class="admin-coupon-row" data-index="${idx}">
      <label class="admin-coupon-switch">
        <input type="checkbox" ${c.active ? 'checked' : ''} onchange="toggleAdminCouponActive(${idx})">
        <span class="admin-coupon-slider"></span>
      </label>
      <div class="admin-category-info">
        <div class="admin-category-name">
          <span class="admin-coupon-code">${c.code}</span>
          <span class="admin-coupon-status admin-coupon-status--${statusClass}">${statusLabel}</span>
        </div>
        <div class="admin-category-meta">${valueLabel} de descuento · ${scopeLabel} · ${datesLabel}</div>
        ${c.description ? `<div class="admin-category-meta" style="opacity:0.6;">${c.description}</div>` : ''}
      </div>
      <div class="admin-category-actions">
        <button class="admin-btn-icon edit" onclick="editAdminCoupon(${idx})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="admin-btn-icon delete" onclick="deleteAdminCoupon(${idx})" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// Interruptor rápido de activo/inactivo directo desde la lista (para prender/apagar el flash sale al toque)
function toggleAdminCouponActive(index) {
  adminCoupons[index].active = !adminCoupons[index].active;
  renderAdminCouponList();
  showAdminToast(
    adminCoupons[index].active ? `Cupón "${adminCoupons[index].code}" activado ✓` : `Cupón "${adminCoupons[index].code}" desactivado`,
    adminCoupons[index].active ? 'success' : 'warning'
  );
}

function populateCouponScopeSelect() {
  const sel = document.getElementById('couponScopeValue');
  if (!sel) return;
  const cats = adminCategories.length > 0 ? adminCategories : STATIC_BANNER_CATEGORIES;
  sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function openCouponForm(coupon = null, index = null) {
  editingCouponIndex = index;
  const title = document.getElementById('couponFormTitle');
  title.textContent = coupon ? 'Editar Cupón' : 'Nuevo Cupón';

  populateCouponScopeSelect();

  document.getElementById('couponCode').value = coupon ? coupon.code : '';
  document.getElementById('couponDescription').value = coupon ? (coupon.description || '') : '';
  document.getElementById('couponType').value = coupon ? coupon.type : 'percent';
  document.getElementById('couponValue').value = coupon ? coupon.value : '';
  document.getElementById('couponScope').value = coupon ? (coupon.scope || 'all') : 'all';
  document.getElementById('couponScopeValue').value = coupon ? (coupon.scopeValue || '') : '';
  document.getElementById('couponStartDate').value = coupon ? (coupon.startDate || '') : '';
  document.getElementById('couponEndDate').value = coupon ? (coupon.endDate || '') : '';
  document.getElementById('couponActive').checked = coupon ? !!coupon.active : true;

  updateCouponValueLabel();
  updateCouponScopeFields();
  showAdminView('couponFormView');
}

function editAdminCoupon(index) {
  openCouponForm(adminCoupons[index], index);
}

function updateCouponValueLabel() {
  const type = document.getElementById('couponType').value;
  const label = document.getElementById('couponValueLabel');
  label.textContent = type === 'percent' ? 'Valor del descuento (%) *' : 'Valor del descuento ($) *';
}

function updateCouponScopeFields() {
  const scope = document.getElementById('couponScope').value;
  document.getElementById('couponScopeCategoryWrap').style.display = scope === 'category' ? 'block' : 'none';
}

function saveAdminCoupon() {
  const code = document.getElementById('couponCode').value.trim().toUpperCase();
  const description = document.getElementById('couponDescription').value.trim();
  const type = document.getElementById('couponType').value;
  const value = parseFloat(document.getElementById('couponValue').value);
  const scope = document.getElementById('couponScope').value;
  const scopeValue = document.getElementById('couponScopeValue').value;
  const startDate = document.getElementById('couponStartDate').value;
  const endDate = document.getElementById('couponEndDate').value;
  const active = document.getElementById('couponActive').checked;

  if (!code || isNaN(value) || value <= 0) {
    showAdminToast('Código y valor de descuento son obligatorios.', 'error');
    return;
  }
  if (type === 'percent' && value > 100) {
    showAdminToast('El porcentaje no puede ser mayor a 100.', 'error');
    return;
  }
  if (scope === 'category' && !scopeValue) {
    showAdminToast('Selecciona la categoría para este cupón.', 'error');
    return;
  }

  // Evitar códigos duplicados
  const duplicate = adminCoupons.some((c, i) => c.code === code && i !== editingCouponIndex);
  if (duplicate) {
    showAdminToast('Ya existe un cupón con ese código.', 'error');
    return;
  }

  const coupon = { code, type, value, scope, active };
  if (description) coupon.description = description;
  if (scope === 'category') coupon.scopeValue = scopeValue;
  if (startDate) coupon.startDate = startDate;
  if (endDate) coupon.endDate = endDate;

  if (editingCouponIndex !== null) {
    adminCoupons[editingCouponIndex] = coupon;
  } else {
    adminCoupons.push(coupon);
  }

  renderAdminCouponList();
  showAdminToast(editingCouponIndex !== null ? 'Cupón actualizado ✓' : 'Cupón creado ✓', 'success');
  showAdminView('couponListView');
}

function deleteAdminCoupon(index) {
  const coupon = adminCoupons[index];
  if (!confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;
  adminCoupons.splice(index, 1);
  renderAdminCouponList();
  showAdminToast('Cupón eliminado.', 'warning');
}

function exportCouponsJSON() {
  const json = JSON.stringify(adminCoupons, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'coupons.json';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('coupons.json descargado.', 'success');
}

function applyCouponsChangesLive() {
  if (typeof allCoupons !== 'undefined') {
    allCoupons.length = 0;
    adminCoupons.forEach(c => allCoupons.push(c));
    if (typeof updateCartUI === 'function') updateCartUI();
    showAdminToast('Cupones aplicados. Ya puedes probarlos en el carrito.', 'success');
  } else {
    console.warn('allCoupons no definido, no se puede aplicar.');
  }
}

// ─────────────────────────────────────────────
// BARRA DE ANUNCIOS
// ─────────────────────────────────────────────
let adminAnnouncement = { active: true, messages: [] };

function refreshAdminAnnouncement() {
  const source = (typeof allAnnouncement !== 'undefined' && allAnnouncement) ? allAnnouncement : { active: true, messages: [] };
  adminAnnouncement = JSON.parse(JSON.stringify(source));
  const activeCheckbox = document.getElementById('announcementActive');
  if (activeCheckbox) activeCheckbox.checked = !!adminAnnouncement.active;
  renderAnnouncementMessagesList();
}

function renderAnnouncementMessagesList() {
  const container = document.getElementById('announcementMessagesList');
  if (!container) return;

  if (!adminAnnouncement.messages || adminAnnouncement.messages.length === 0) {
    container.innerHTML = `<div class="admin-empty">Sin mensajes. Agrega el primero.</div>`;
    return;
  }

  container.innerHTML = adminAnnouncement.messages.map((m, i) => `
    <div class="admin-announcement-row" data-index="${i}">
      <input type="text" class="ann-msg-text" data-index="${i}" placeholder="Texto del anuncio, ej: 🔥 Envío gratis en Bogotá" value="${(m.text || '').replace(/"/g, '&quot;')}">
      <input type="text" class="ann-msg-link" data-index="${i}" placeholder="Link (opcional)" value="${(m.link || '').replace(/"/g, '&quot;')}">
      <button class="admin-btn-icon delete" onclick="removeAnnouncementMsg(${i})" title="Eliminar"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

// Lee los valores actuales de los inputs de la lista y los vuelca al estado en memoria
function syncAnnouncementFromDOM() {
  const activeCheckbox = document.getElementById('announcementActive');
  if (activeCheckbox) adminAnnouncement.active = activeCheckbox.checked;

  document.querySelectorAll('.ann-msg-text').forEach(input => {
    const i = parseInt(input.dataset.index, 10);
    if (adminAnnouncement.messages[i]) adminAnnouncement.messages[i].text = input.value.trim();
  });
  document.querySelectorAll('.ann-msg-link').forEach(input => {
    const i = parseInt(input.dataset.index, 10);
    if (adminAnnouncement.messages[i]) adminAnnouncement.messages[i].link = input.value.trim();
  });
}

function addAnnouncementMsg() {
  syncAnnouncementFromDOM();
  adminAnnouncement.messages.push({ text: '', link: '' });
  renderAnnouncementMessagesList();
}

function removeAnnouncementMsg(index) {
  syncAnnouncementFromDOM();
  adminAnnouncement.messages.splice(index, 1);
  renderAnnouncementMessagesList();
}

function saveAdminAnnouncementForm() {
  syncAnnouncementFromDOM();
  showAdminToast('Cambios guardados en el panel. Usa "Aplicar" para verlo en el sitio o "Exportar" para subir el archivo.', 'success');
}

function exportAnnouncementJSON() {
  syncAnnouncementFromDOM();
  const json = JSON.stringify(adminAnnouncement, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'announcement.json';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('announcement.json descargado.', 'success');
}

function applyAnnouncementChangesLive() {
  syncAnnouncementFromDOM();
  if (typeof allAnnouncement !== 'undefined') {
    allAnnouncement.active = adminAnnouncement.active;
    allAnnouncement.messages = JSON.parse(JSON.stringify(adminAnnouncement.messages));

    const container = document.getElementById('announcementBar');
    if (container) {
      if (allAnnouncement.active && allAnnouncement.messages.length > 0) {
        container.style.display = 'flex';
        if (typeof renderAnnouncementBar === 'function') renderAnnouncementBar(allAnnouncement.messages);
      } else {
        container.style.display = 'none';
      }
    }
    showAdminToast('Barra de anuncios aplicada al sitio.', 'success');
  } else {
    console.warn('allAnnouncement no definido, no se puede aplicar.');
  }
}


// ─────────────────────────────────────────────
// CATEGORÍAS
// ─────────────────────────────────────────────

function refreshAdminCategories() {
  adminCategories = JSON.parse(JSON.stringify(typeof allCategories !== 'undefined' ? allCategories : []));
  renderAdminCategoryList();
  populateCategorySelect();
}

function renderAdminCategoryList() {
  const container = document.getElementById('adminCategoryList');
  if (!container) return;

  if (adminCategories.length === 0) {
    container.innerHTML = `<div class="admin-empty">No hay categorías dinámicas.</div>`;
    return;
  }

  container.innerHTML = adminCategories.map((cat, idx) => {
    const subCount = cat.subcategories ? cat.subcategories.length : 0;
    const gridBadge = cat.menuStyle === 'grid' ? ' · <i class="fas fa-th-large"></i> Mega-menú grid' : '';
    return `
      <div class="admin-category-row" data-index="${idx}">
        <div class="admin-reorder-col">
          <button class="admin-btn-icon reorder" onclick="moveCategory(${idx}, -1)" title="Subir" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
          <button class="admin-btn-icon reorder" onclick="moveCategory(${idx}, 1)" title="Bajar" ${idx === adminCategories.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
        </div>
        <div class="admin-category-info">
          <div class="admin-category-name">${cat.name}</div>
          <div class="admin-category-meta">ID: ${cat.id} · ${subCount} subcategoría(s)${gridBadge}</div>
        </div>
        <div class="admin-category-actions">
          <button class="admin-btn-icon edit" onclick="editAdminCategory(${idx})" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="admin-btn-icon preview" onclick="openSubcategoryForm(${idx})" title="Agregar subcategoría"><i class="fas fa-plus"></i></button>
          <button class="admin-btn-icon delete" onclick="deleteAdminCategory(${idx})" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      ${cat.subcategories ? cat.subcategories.map((sub, sidx) => `
        <div class="admin-subcategory-row" data-parent="${idx}" data-index="${sidx}">
          <div class="admin-subcat-indent">└─</div>
          <div class="admin-reorder-col">
            <button class="admin-btn-icon reorder" onclick="moveSubcategory(${idx}, ${sidx}, -1)" title="Subir" ${sidx === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
            <button class="admin-btn-icon reorder" onclick="moveSubcategory(${idx}, ${sidx}, 1)" title="Bajar" ${sidx === cat.subcategories.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
          </div>
          ${sub.image ? `<img src="${sub.image}" class="admin-banner-thumb" style="width:36px;height:36px;" onerror="this.src='images/products/placeholder.jpg'">` : ''}
          <div class="admin-category-info">
            <div class="admin-category-name">${sub.name}${sub.image ? '' : ' <span style="font-size:0.65rem; color:rgba(255,255,255,0.35);">(sin logo)</span>'}</div>
            <div class="admin-category-meta">Filtro: ${sub.filterType} = ${sub.filterValue}</div>
          </div>
          <div class="admin-category-actions">
            <button class="admin-btn-icon edit" onclick="openSubcategoryForm(${idx}, ${sidx})" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="admin-btn-icon delete" onclick="deleteAdminSubcategory(${idx}, ${sidx})" title="Eliminar"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('') : ''}
    `;
  }).join('');
}

// Reordenar categorías (dirección: -1 sube, 1 baja)
function moveCategory(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= adminCategories.length) return;
  const temp = adminCategories[index];
  adminCategories[index] = adminCategories[newIndex];
  adminCategories[newIndex] = temp;
  renderAdminCategoryList();
}

// Reordenar subcategorías dentro de una categoría
function moveSubcategory(parentIndex, subIndex, direction) {
  const subs = adminCategories[parentIndex].subcategories;
  const newIndex = subIndex + direction;
  if (!subs || newIndex < 0 || newIndex >= subs.length) return;
  const temp = subs[subIndex];
  subs[subIndex] = subs[newIndex];
  subs[newIndex] = temp;
  renderAdminCategoryList();
}

function openCategoryForm(category = null, index = null) {
  editingCategoryIndex = index;
  const title = document.getElementById('categoryFormTitle');
  title.textContent = category ? 'Editar Categoría' : 'Nueva Categoría';

  document.getElementById('catId').value = category ? category.id : '';
  document.getElementById('catName').value = category ? category.name : '';
  const hasSubs = category ? !!(category.subcategories && category.subcategories.length) : false;
  document.getElementById('catHasSubs').checked = hasSubs;
  document.getElementById('catMenuGrid').checked = category ? category.menuStyle === 'grid' : false;
  document.getElementById('catMenuStyleWrap').style.display = hasSubs ? 'block' : 'none';

  showAdminView('categoryFormView');
}

function editAdminCategory(index) {
  openCategoryForm(adminCategories[index], index);
}

function deleteAdminCategory(index) {
  const cat = adminCategories[index];
  if (!confirm(`¿Eliminar "${cat.name}"? Se eliminarán también sus subcategorías.`)) return;
  adminCategories.splice(index, 1);
  renderAdminCategoryList();
  populateCategorySelect();
  showAdminToast('Categoría eliminada.', 'warning');
}

function saveAdminCategory() {
  const id = document.getElementById('catId').value.trim();
  const name = document.getElementById('catName').value.trim();

  if (!id || !name) {
    showAdminToast('ID y nombre son obligatorios.', 'error');
    return;
  }

  const category = { id, name };
  if (document.getElementById('catHasSubs').checked) {
    category.subcategories = [];
    if (document.getElementById('catMenuGrid').checked) {
      category.menuStyle = 'grid';
    }
  }

  if (editingCategoryIndex !== null) {
    if (adminCategories[editingCategoryIndex].subcategories) {
      category.subcategories = adminCategories[editingCategoryIndex].subcategories;
    }
    adminCategories[editingCategoryIndex] = category;
  } else {
    adminCategories.push(category);
  }

  renderAdminCategoryList();
  populateCategorySelect();
  showAdminToast(editingCategoryIndex !== null ? 'Categoría actualizada ✓' : 'Categoría creada ✓', 'success');
  showAdminView('categoryListView');
}

function openSubcategoryForm(parentIndex, subIndex = null) {
  editingCategoryIndex = parentIndex;
  editingSubcategoryIndex = subIndex;
  const parentInput = document.getElementById('subcatParentIndex');
  if (parentInput) parentInput.value = parentIndex;

  const title = document.getElementById('subcategoryFormTitle');

  if (subIndex !== null) {
    const sub = adminCategories[parentIndex].subcategories[subIndex];
    if (title) title.textContent = 'Editar Subcategoría';
    document.getElementById('subcatName').value = sub.name || '';
    document.getElementById('subcatFilterType').value = sub.filterType || 'expansion';
    document.getElementById('subcatFilterValue').value = sub.filterValue || '';
    document.getElementById('subcatImage').value = sub.image || '';
  } else {
    if (title) title.textContent = 'Nueva Subcategoría';
    document.getElementById('subcatName').value = '';
    document.getElementById('subcatFilterType').value = 'expansion';
    document.getElementById('subcatFilterValue').value = '';
    document.getElementById('subcatImage').value = '';
  }

  showAdminView('subcategoryFormView');
}

function saveAdminSubcategory() {
  const name = document.getElementById('subcatName').value.trim();
  const filterType = document.getElementById('subcatFilterType').value;
  const filterValue = document.getElementById('subcatFilterValue').value.trim();
  const image = document.getElementById('subcatImage').value.trim();

  if (!name || !filterValue) {
    showAdminToast('Nombre y valor de filtro son obligatorios.', 'error');
    return;
  }

  const sub = {
    id: editingSubcategoryIndex !== null
      ? adminCategories[editingCategoryIndex].subcategories[editingSubcategoryIndex].id
      : slugify(name),
    name,
    filterType,
    filterValue
  };
  if (image) sub.image = image;

  if (!adminCategories[editingCategoryIndex].subcategories) {
    adminCategories[editingCategoryIndex].subcategories = [];
  }

  if (editingSubcategoryIndex !== null) {
    adminCategories[editingCategoryIndex].subcategories[editingSubcategoryIndex] = sub;
  } else {
    adminCategories[editingCategoryIndex].subcategories.push(sub);
  }

  renderAdminCategoryList();
  populateCategorySelect();
  showAdminToast(editingSubcategoryIndex !== null ? 'Subcategoría actualizada ✓' : 'Subcategoría añadida ✓', 'success');
  editingSubcategoryIndex = null;
  showAdminView('categoryListView');
}

function deleteAdminSubcategory(parentIndex, subIndex) {
  if (!confirm('¿Eliminar esta subcategoría?')) return;
  adminCategories[parentIndex].subcategories.splice(subIndex, 1);
  renderAdminCategoryList();
  populateCategorySelect();
  showAdminToast('Subcategoría eliminada.', 'warning');
}

function exportCategoriesJSON() {
  const json = JSON.stringify(adminCategories, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'categories.json';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('categories.json descargado.', 'success');
}

function applyCategoriesChangesLive() {
  if (typeof allCategories !== 'undefined') {
    allCategories.length = 0;
    adminCategories.forEach(c => allCategories.push(c));
    if (typeof renderCategories === 'function') renderCategories(allCategories);
    showAdminToast('Categorías aplicadas al sitio.', 'success');
  }
}


// ─────────────────────────────────────────────
// HTML DEL PANEL
// ─────────────────────────────────────────────
function injectAdminHTML() {
  if (document.getElementById('adminOverlay')) return;

  const html = `
<div id="adminOverlay" class="admin-overlay" role="dialog" aria-label="Panel de Administración">
  <div class="admin-panel">

    <!-- HEADER DEL PANEL -->
    <div class="admin-panel-header">
      <div class="admin-logo">
        <i class="fas fa-shield-alt"></i>
        <span>Admin · One Play More</span>
      </div>
      <button id="adminCloseBtn" class="admin-close-btn" title="Cerrar panel"><i class="fas fa-times"></i></button>
    </div>

    <!-- TOAST INTERNO -->
    <div id="adminToast" class="admin-toast"></div>

    <!-- ── LOGIN VIEW ── -->
    <div id="loginView" class="admin-view active">
      <div class="admin-login-wrap">
        <div id="adminLoginBox" class="admin-login-box">
          <div class="admin-login-icon"><i class="fas fa-lock"></i></div>
          <h2>Acceso Administrador</h2>
          <p>Ingresa tus credenciales para continuar</p>
          <div class="form-field">
            <label>Usuario</label>
            <input id="adminUser" type="text" placeholder="admin" autocomplete="username">
          </div>
          <div class="form-field">
            <label>Contraseña</label>
            <input id="adminPass" type="password" placeholder="••••••••" autocomplete="current-password">
          </div>
          <span id="adminLoginError" class="admin-error"></span>
          <button id="adminLoginBtn" class="admin-btn primary full">Ingresar</button>
        </div>
      </div>
    </div>

    <!-- ── DASHBOARD VIEW ── -->
    <div id="dashboardView" class="admin-view">
      <div class="admin-tabs">
        <button id="adminProductsTab" class="admin-tab active">Productos</button>
        <button id="adminBannersTab" class="admin-tab">Banners</button>
        <button id="adminCategoriesTab" class="admin-tab">Categorías</button>
        <button id="adminCouponsTab" class="admin-tab">Cupones</button>
        <button id="adminAnnouncementTab" class="admin-tab">Anuncios</button>
      </div>
      <div class="admin-topbar">
        <div class="admin-stats-row">
          <div class="admin-stat"><span id="statTotal">0</span><label>Productos</label></div>
          <div class="admin-stat"><span id="statNew">0</span><label>Novedades</label></div>
          <div class="admin-stat"><span id="statOfertas">0</span><label>Ofertas</label></div>
          <div class="admin-stat"><span id="statAvg">$0</span><label>Precio Prom.</label></div>
        </div>
        <div class="admin-topbar-actions">
          <button id="adminNewProductBtn" class="admin-btn primary"><i class="fas fa-plus"></i> Nuevo Producto</button>
          <button id="adminApplyBtn" class="admin-btn success"><i class="fas fa-play"></i> Aplicar</button>
          <button id="adminExportBtn" class="admin-btn accent"><i class="fas fa-download"></i> Exportar JSON</button>
          <button id="adminLogoutBtn" class="admin-btn ghost"><i class="fas fa-sign-out-alt"></i></button>
        </div>
      </div>

      <div class="admin-search-wrap">
        <i class="fas fa-search"></i>
        <input id="adminSearchInput" type="text" placeholder="Buscar producto...">
      </div>

      <div id="adminProductList" class="admin-product-list">
        <div class="admin-empty">Cargando productos...</div>
      </div>
    </div>

    <!-- ── BANNER LIST VIEW ── -->
    <div id="bannerListView" class="admin-view">
      <div class="admin-tabs">
        <button id="adminProductsTabBl" class="admin-tab">Productos</button>
        <button id="adminBannersTabBl" class="admin-tab active">Banners</button>
        <button id="adminCategoriesTabBl" class="admin-tab">Categorías</button>
        <button id="adminCouponsTabBl" class="admin-tab">Cupones</button>
        <button id="adminAnnouncementTabBl" class="admin-tab">Anuncios</button>
      </div>
      <div class="admin-topbar" style="border-bottom:none;">
        <div class="admin-topbar-actions">
          <button id="adminNewBannerBtn" class="admin-btn primary"><i class="fas fa-plus"></i> Nuevo Banner</button>
          <button id="adminApplyBannersBtn" class="admin-btn success"><i class="fas fa-play"></i> Aplicar</button>
          <button id="adminExportBannersBtn" class="admin-btn accent"><i class="fas fa-download"></i> Exportar JSON</button>
        </div>
      </div>
      <div id="adminBannerList" class="admin-product-list">
        <div class="admin-empty">Cargando banners...</div>
      </div>
    </div>

    <!-- ── BANNER FORM VIEW ── -->
    <div id="bannerFormView" class="admin-view">
      <div class="admin-form-layout">
        <div class="admin-form-col">
          <div class="admin-form-header">
            <button class="admin-btn ghost icon" id="adminCancelBannerBtn"><i class="fas fa-arrow-left"></i></button>
            <h3 id="bannerFormTitle">Nuevo Banner</h3>
          </div>
          <div class="admin-form-body">
            <div class="form-field">
              <label>Tipo de contenido</label>
              <select id="bannerMediaType">
                <option value="image">🖼️ Imagen</option>
                <option value="video">🎬 Video (archivo local)</option>
                <option value="youtube">▶️ YouTube</option>
              </select>
            </div>
            <div class="form-field" id="bannerImageWrap">
              <label id="bannerImageLabel">Imagen (URL) * <span class="optional">${BANNER_IMAGE_SIZES.desktop}</span></label>
              <input id="bannerImage" type="text" placeholder="images/banners/mi-banner.jpg">
            </div>
            <div class="form-field" id="bannerVideoWrap" style="display:none;">
              <label>Ruta del video (MP4) * <span class="optional">Súbelo a tu carpeta images/banners/videos/</span></label>
              <input id="bannerVideo" type="text" placeholder="images/banners/videos/mi-video.mp4">
              <div class="admin-field-hint">El video se reproduce en loop, sin sonido y se recorta automáticamente al tamaño fijo del carrusel (igual en PC y en celular).</div>
            </div>
            <div class="form-field" id="bannerYoutubeWrap" style="display:none;">
              <label>URL o ID de YouTube *</label>
              <input id="bannerYoutube" type="text" placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX">
              <div class="admin-field-hint">Puedes pegar el link completo del video o solo el ID.</div>
            </div>
            <div class="form-field">
              <label>Título *</label>
              <input id="bannerTitle" type="text" placeholder="Título del banner">
            </div>
            <div class="form-field">
              <label>Subtítulo</label>
              <input id="bannerSubtitle" type="text" placeholder="Subtítulo opcional">
            </div>
            <div class="form-field">
              <label>Texto del botón</label>
              <input id="bannerButton" type="text" placeholder="Ej: Ver ofertas">
            </div>
            <div class="form-field">
              <label>Link del botón</label>
              <input id="bannerLink" type="text" placeholder="#productos o https://...">
            </div>

            <!-- SECCIÓN DE ÁMBITO / DÓNDE SE MUESTRA -->
            <div class="admin-filter-section" style="margin-top:1.2rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:0.78rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.5); margin-bottom:0.8rem;">
                <i class="fas fa-layer-group"></i> Dónde se muestra
              </div>
              <div style="font-size:0.72rem; color:rgba(255,255,255,0.35); margin-bottom:0.8rem; line-height:1.5;">
                Un banner "Global" rota en el carrusel principal (vista "Todos"). Un banner de "Categoría específica" reemplaza ese carrusel Y los productos destacados solo cuando el cliente entra a esa categoría (ej. Cartas).
              </div>
              <div class="form-field">
                <label>Ámbito</label>
                <select id="bannerScope">
                  <option value="global">🌐 Global (carrusel principal)</option>
                  <option value="category">📁 Categoría específica</option>
                </select>
              </div>
              <div class="form-field" id="bannerTargetCategoryWrap" style="display:none;">
                <label>Categoría objetivo</label>
                <select id="bannerTargetCategory"></select>
              </div>
            </div>

            <!-- SECCIÓN DE FILTROS -->
            <div class="admin-filter-section" style="margin-top:1.2rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:0.78rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.5); margin-bottom:0.8rem;">
                <i class="fas fa-filter"></i> Filtro de productos (opcional)
              </div>
              <div style="font-size:0.72rem; color:rgba(255,255,255,0.35); margin-bottom:0.8rem; line-height:1.5;">
                Si configuras un filtro, al hacer clic en el banner se mostrarán productos filtrados en vez de seguir el link.
              </div>

              <div class="form-field">
                <label>Tipo de filtro</label>
                <select id="bannerFilterType">
                  <option value="">— Sin filtro —</option>
                  <option value="bestSeller">🔥 Ofertas / Más vendidos</option>
                  <option value="new">✨ Novedades</option>
                  <option value="status">📋 Por estado (preventa, agotado...)</option>
                  <option value="categoryId">📁 Por categoría</option>
                  <option value="expansion">🎴 Por expansión (Pokémon)</option>
                  <option value="encargo">📦 Por encargo</option>
                </select>
              </div>

              <div class="form-field" id="bannerFilterValueWrap" style="display:none;">
                <label>Valor del filtro</label>
                <input id="bannerFilterValue" type="text" placeholder="Valor del filtro">
              </div>

              <div class="form-field" id="bannerFilterValueSelectWrap" style="display:none;">
                <label>Estado</label>
                <select id="bannerFilterValueSelect">
                  <option value="preventa">Preventa</option>
                  <option value="agotado">Agotado</option>
                  <option value="disponible">Disponible</option>
                  <option value="proximamente">Próximamente</option>
                </select>
              </div>

              <div class="form-field" id="bannerCategoryIdWrap" style="display:none;">
                <label>ID de categoría (para expansiones)</label>
                <input id="bannerCategoryId" type="text" placeholder="Ej: pokemon">
              </div>

              <div id="adminBannerFilterPreview" style="margin-top:0.8rem;">
                <span class="filter-preview-none">Sin filtro — el banner usará el link normal</span>
              </div>
            </div>

            <div class="admin-banner-sizes-info" style="margin-top:1rem;">
              <i class="fas fa-image"></i>
              <strong>Tamaños recomendados:</strong><br>
              Desktop: 1920×600 px (máx. 500KB, JPG/PNG/WebP)<br>
              Mobile: 768×400 px
            </div>
            <div class="admin-form-actions">
              <button id="adminSaveBannerBtn" class="admin-btn primary full"><i class="fas fa-save"></i> Guardar Banner</button>
            </div>
          </div>
        </div>
        <div class="admin-preview-col">
          <div class="admin-preview-label">Preview del banner</div>
          <div id="adminBannerPreview">
            <div class="admin-preview-placeholder"><i class="fas fa-image"></i><p>El preview aparecerá aquí</p></div>
          </div>
          <div class="admin-preview-hint">
            <i class="fas fa-info-circle"></i>
            Así se verá en el carrusel principal
          </div>
        </div>
      </div>
    </div>

    <!-- ── CATEGORY LIST VIEW ── -->
    <div id="categoryListView" class="admin-view">
      <div class="admin-tabs">
        <button id="adminProductsTabCl" class="admin-tab">Productos</button>
        <button id="adminBannersTabCl" class="admin-tab">Banners</button>
        <button id="adminCategoriesTabCl" class="admin-tab active">Categorías</button>
        <button id="adminCouponsTabCl" class="admin-tab">Cupones</button>
        <button id="adminAnnouncementTabCl" class="admin-tab">Anuncios</button>
      </div>
      <div class="admin-topbar" style="border-bottom:none;">
        <div class="admin-topbar-actions">
          <button id="adminNewCategoryBtn" class="admin-btn primary"><i class="fas fa-plus"></i> Nueva Categoría</button>
          <button id="adminNewSubcategoryBtn" class="admin-btn primary"><i class="fas fa-plus"></i> Nueva Subcategoría</button>
          <button id="adminApplyCategoriesBtn" class="admin-btn success"><i class="fas fa-play"></i> Aplicar</button>
          <button id="adminExportCategoriesBtn" class="admin-btn accent"><i class="fas fa-download"></i> Exportar JSON</button>
        </div>
      </div>
      <div id="adminCategoryList" class="admin-product-list">
        <div class="admin-empty">Cargando categorías...</div>
      </div>
    </div>

    <!-- ── CATEGORY FORM VIEW ── -->
    <div id="categoryFormView" class="admin-view">
      <div class="admin-form-layout" style="grid-template-columns:1fr;">
        <div class="admin-form-col">
          <div class="admin-form-header">
            <button class="admin-btn ghost icon" id="adminCancelCategoryBtn"><i class="fas fa-arrow-left"></i></button>
            <h3 id="categoryFormTitle">Nueva Categoría</h3>
          </div>
          <div class="admin-form-body">
            <div class="form-field">
              <label>ID (slug) * <span class="optional">ej: pokemon, funko</span></label>
              <input id="catId" type="text" placeholder="mi-categoria">
            </div>
            <div class="form-field">
              <label>Nombre *</label>
              <input id="catName" type="text" placeholder="Nombre visible">
            </div>
            <div class="form-field">
              <label class="checkbox-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input id="catHasSubs" type="checkbox"> <span>¿Tiene subcategorías?</span>
              </label>
            </div>
            <div class="form-field" id="catMenuStyleWrap" style="display:none;">
              <label class="checkbox-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input id="catMenuGrid" type="checkbox"> <span>Mostrar subcategorías como mega-menú en grid (ej. logos de expansiones)</span>
              </label>
              <div class="admin-field-hint">Si lo desmarcas, se muestra como lista clásica desplegable.</div>
            </div>
            <div class="admin-form-actions">
              <button id="adminSaveCategoryBtn" class="admin-btn primary full"><i class="fas fa-save"></i> Guardar Categoría</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── SUBCATEGORY FORM VIEW ── -->
    <div id="subcategoryFormView" class="admin-view">
      <div class="admin-form-layout" style="grid-template-columns:1fr;">
        <div class="admin-form-col">
          <div class="admin-form-header">
            <button class="admin-btn ghost icon" id="adminCancelSubcategoryBtn"><i class="fas fa-arrow-left"></i></button>
            <h3 id="subcategoryFormTitle">Nueva Subcategoría</h3>
          </div>
          <div class="admin-form-body">
            <input type="hidden" id="subcatParentIndex" value="0">
            <div class="form-field">
              <label>Nombre *</label>
              <input id="subcatName" type="text" placeholder="Nombre de la subcategoría">
            </div>
            <div class="form-field">
              <label>Tipo de filtro *</label>
              <select id="subcatFilterType">
                <option value="expansion">Expansión</option>
                <option value="cardType">Tipo de carta</option>
                <option value="categoryId">Categoría ID</option>
              </select>
            </div>
            <div class="form-field">
              <label>Valor del filtro *</label>
              <input id="subcatFilterValue" type="text" placeholder="Ej: Scarlet & Violet">
            </div>
            <div class="form-field">
              <label>Logo/imagen de la expansión (opcional) <span class="optional">Solo aplica si la categoría usa menú en grid, ej. Pokémon TCG</span></label>
              <input id="subcatImage" type="text" placeholder="images/expansiones/perfect-order.png">
              <div class="admin-field-hint">Si lo dejas vacío, se mostrará un badge de texto con el nombre.</div>
            </div>
            <div class="admin-form-actions">
              <button id="adminSaveSubcategoryBtn" class="admin-btn primary full"><i class="fas fa-save"></i> Guardar Subcategoría</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── COUPON LIST VIEW ── -->
    <div id="couponListView" class="admin-view">
      <div class="admin-tabs">
        <button id="adminProductsTabCo" class="admin-tab">Productos</button>
        <button id="adminBannersTabCo" class="admin-tab">Banners</button>
        <button id="adminCategoriesTabCo" class="admin-tab">Categorías</button>
        <button id="adminCouponsTabCo" class="admin-tab active">Cupones</button>
        <button id="adminAnnouncementTabCo" class="admin-tab">Anuncios</button>
      </div>
      <div class="admin-topbar" style="border-bottom:none;">
        <div class="admin-topbar-actions">
          <button id="adminNewCouponBtn" class="admin-btn primary"><i class="fas fa-plus"></i> Nuevo Cupón</button>
          <button id="adminApplyCouponsBtn" class="admin-btn success"><i class="fas fa-play"></i> Aplicar</button>
          <button id="adminExportCouponsBtn" class="admin-btn accent"><i class="fas fa-download"></i> Exportar JSON</button>
        </div>
      </div>
      <div style="padding: 0 1.5rem 0.8rem; font-size:0.72rem; color:rgba(255,255,255,0.4); line-height:1.5;">
        <i class="fas fa-info-circle"></i> Úsalos para descuentos flash puntuales: crea el cupón, actívalo solo cuando quieras la promoción, y desactívalo cuando termine. El cliente lo ingresa en el carrito.
      </div>
      <div id="adminCouponList" class="admin-product-list">
        <div class="admin-empty">Cargando cupones...</div>
      </div>
    </div>

    <!-- ── COUPON FORM VIEW ── -->
    <div id="couponFormView" class="admin-view">
      <div class="admin-form-layout" style="grid-template-columns:1fr;">
        <div class="admin-form-col">
          <div class="admin-form-header">
            <button class="admin-btn ghost icon" id="adminCancelCouponBtn"><i class="fas fa-arrow-left"></i></button>
            <h3 id="couponFormTitle">Nuevo Cupón</h3>
          </div>
          <div class="admin-form-body">
            <div class="form-field">
              <label>Código * <span class="optional">Lo que escribe el cliente, ej: FLASH20</span></label>
              <input id="couponCode" type="text" placeholder="FLASH20" style="text-transform:uppercase;">
            </div>
            <div class="form-field">
              <label>Descripción (solo para ti)</label>
              <input id="couponDescription" type="text" placeholder="Ej: Descuento flash fin de semana">
            </div>
            <div class="form-field">
              <label>Tipo de descuento</label>
              <select id="couponType">
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </div>
            <div class="form-field">
              <label id="couponValueLabel">Valor del descuento (%) *</label>
              <input id="couponValue" type="number" min="0" placeholder="20">
            </div>
            <div class="form-field">
              <label>Aplica a</label>
              <select id="couponScope">
                <option value="all">🌐 Todo el carrito</option>
                <option value="category">📁 Solo una categoría</option>
              </select>
            </div>
            <div class="form-field" id="couponScopeCategoryWrap" style="display:none;">
              <label>Categoría</label>
              <select id="couponScopeValue"></select>
            </div>
            <div class="form-field">
              <label>Vigencia (opcional)</label>
              <div style="display:flex; gap:0.6rem;">
                <input id="couponStartDate" type="date" style="flex:1;">
                <input id="couponEndDate" type="date" style="flex:1;">
              </div>
              <div class="admin-field-hint">Déjalo vacío para que no tenga fecha de inicio/fin — solo dependerá del interruptor de activo.</div>
            </div>
            <div class="form-field">
              <label class="checkbox-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input id="couponActive" type="checkbox" checked> <span>Cupón activo (visible para clientes de inmediato)</span>
              </label>
            </div>
            <div class="admin-form-actions">
              <button id="adminSaveCouponBtn" class="admin-btn primary full"><i class="fas fa-save"></i> Guardar Cupón</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── ANNOUNCEMENT (BARRA DE ANUNCIOS) VIEW ── -->
    <div id="announcementView" class="admin-view">
      <div class="admin-tabs">
        <button id="adminProductsTabAn" class="admin-tab">Productos</button>
        <button id="adminBannersTabAn" class="admin-tab">Banners</button>
        <button id="adminCategoriesTabAn" class="admin-tab">Categorías</button>
        <button id="adminCouponsTabAn" class="admin-tab">Cupones</button>
        <button id="adminAnnouncementTabAn" class="admin-tab active">Anuncios</button>
      </div>
      <div style="padding: 1rem 1.5rem 0.5rem; font-size:0.72rem; color:rgba(255,255,255,0.4); line-height:1.5;">
        <i class="fas fa-info-circle"></i> Barra rotativa arriba del header, como "Pre-order X ya disponible →". Se puede apagar por completo o dejar varios mensajes que van rotando.
      </div>
      <div class="admin-form-body" style="padding: 0.5rem 1.5rem 1.5rem;">
        <div class="form-field">
          <label class="checkbox-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
            <input id="announcementActive" type="checkbox" checked> <span>Barra de anuncios activa</span>
          </label>
        </div>
        <div id="announcementMessagesList"></div>
        <button id="adminAddAnnouncementMsgBtn" class="admin-btn ghost" style="margin-top:0.6rem;"><i class="fas fa-plus"></i> Agregar mensaje</button>
        <div class="admin-form-actions" style="margin-top:1.5rem;">
          <button id="adminSaveAnnouncementBtn" class="admin-btn primary full"><i class="fas fa-save"></i> Guardar cambios</button>
        </div>
        <div style="display:flex; gap:0.6rem; margin-top:1rem;">
          <button id="adminApplyAnnouncementBtn" class="admin-btn success" style="flex:1;"><i class="fas fa-play"></i> Aplicar</button>
          <button id="adminExportAnnouncementBtn" class="admin-btn accent" style="flex:1;"><i class="fas fa-download"></i> Exportar JSON</button>
        </div>
      </div>
    </div>

    <!-- ── FORM VIEW ── -->
    <div id="formView" class="admin-view">
      <div class="admin-form-layout">

        <!-- Columna izquierda: formulario -->
        <div class="admin-form-col">
          <div class="admin-form-header">
            <button class="admin-btn ghost icon" id="adminCancelFormBtn"><i class="fas fa-arrow-left"></i></button>
            <h3 id="formTitle">Nuevo Producto</h3>
          </div>

          <div class="admin-form-body">
            <div class="form-row two-col">
              <div class="form-field">
                <label>ID (slug) <span class="optional">auto</span></label>
                <input id="formId" type="text" placeholder="mi-producto-id" disabled>
              </div>
              <div class="form-field">
                <label>Estado</label>
                <select id="formStatus">
                  <option value="disponible">Disponible</option>
                  <option value="preventa">Preventa</option>
                  <option value="agotado">Agotado</option>
                  <option value="proximamente">Próximamente</option>
                </select>
              </div>
            </div>

            <div class="form-field">
              <label>Nombre *</label>
              <input id="formName" type="text" placeholder="Nombre del producto">
            </div>

            <div class="form-row two-col">
              <div class="form-field">
                <label>Categoría *</label>
                <select id="formCategory">
                  <option value="">— Selecciona —</option>
                </select>
              </div>
              <div class="form-field" id="subcategoryField" style="display:none">
                <label>Subcategoría</label>
                <select id="formSubcategory">
                  <option value="">— Sin subcategoría —</option>
                </select>
              </div>
            </div>

            <div class="form-field">
              <label>Expansión <span class="optional">opcional</span></label>
              <input id="formExpansion" type="text" placeholder="Ej: Scarlet & Violet">
            </div>

            <div class="form-row two-col">
              <div class="form-field">
                <label>Precio (COP) *</label>
                <input id="formPrice" type="number" placeholder="85000" min="0">
              </div>
              <div class="form-field">
                <label>Precio original <span class="optional">tachado</span></label>
                <input id="formOriginalPrice" type="number" placeholder="100000" min="0">
              </div>
            </div>

            <div class="form-field">
              <label>Descripción</label>
              <textarea id="formDescription" rows="3" placeholder="Descripción del producto..."></textarea>
            </div>

            <div class="form-field">
              <label>Contenido / Incluye <span class="optional">uno por línea</span></label>
              <textarea id="formIncludes" rows="3" placeholder="1 carta holográfica&#10;4 sobres de mejora"></textarea>
            </div>

            <div class="form-field">
              <label>Imágenes (URLs) <span class="optional">una por línea</span></label>
              <textarea id="formImages" rows="3" placeholder="images/products/mi-imagen.jpg&#10;https://cdn.ejemplo.com/img.png"></textarea>
            </div>

            <div class="form-field">
              <label>Atributos JSON <span class="optional">opcional</span></label>
              <textarea id="formAttributes" rows="4" placeholder='[{"name":"Idioma","options":[{"value":"Español","price":85000}]}]'></textarea>
            </div>

            <div class="form-row three-col checkboxes">
              <label class="checkbox-label"><input id="formNew" type="checkbox"> <span>✨ Novedad</span></label>
              <label class="checkbox-label"><input id="formBestSeller" type="checkbox"> <span>🔥 Oferta</span></label>
              <label class="checkbox-label"><input id="formEncargo" type="checkbox"> <span>📦 Encargo</span></label>
            </div>

            <div class="form-field" id="encargoNotaField" style="display:none">
              <label>Nota de encargo</label>
              <input id="formEncargoNota" type="text" placeholder="Ej: 3-5 días hábiles">
            </div>

            <div class="admin-form-actions">
              <button id="adminSaveProductBtn" class="admin-btn primary full">
                <i class="fas fa-save"></i> Guardar Producto
              </button>
            </div>
          </div>
        </div>

        <!-- Columna derecha: preview -->
        <div class="admin-preview-col">
          <div class="admin-preview-label">Preview de tarjeta</div>
          <div id="adminPreviewCard">
            <div class="admin-preview-placeholder"><i class="fas fa-image"></i><p>El preview aparecerá aquí</p></div>
          </div>
          <div class="admin-preview-hint">
            <i class="fas fa-info-circle"></i>
            Así se verá la tarjeta en el catálogo
          </div>
        </div>

      </div>
    </div>

  </div><!-- end admin-panel -->
</div><!-- end adminOverlay -->
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  // Botón visible de Admin en la esquina inferior derecha
  if (!document.getElementById('adminEmergencyTrigger')) {
    const emergency = document.createElement('button');
    emergency.id = 'adminEmergencyTrigger';
    emergency.title = 'Panel Admin (Ctrl+Shift+A o Ctrl+Shift+M)';
    emergency.innerHTML = '<i class="fas fa-shield-alt"></i>';
    emergency.style.cssText = `
      position:fixed; bottom:12px; right:12px; width:44px; height:44px;
      background:rgba(138,108,184,0.9); border:none; border-radius:50%;
      color:white; font-size:1.1rem; cursor:pointer; z-index:99998;
      box-shadow:0 4px 15px rgba(138,108,184,0.4);
      display:flex; align-items:center; justify-content:center;
      transition:transform 0.2s, background 0.2s;
    `;
    emergency.onmouseenter = () => {
      emergency.style.transform = 'scale(1.1)';
      emergency.style.background = 'rgba(138,108,184,1)';
    };
    emergency.onmouseleave = () => {
      emergency.style.transform = 'scale(1)';
      emergency.style.background = 'rgba(138,108,184,0.9)';
    };
    emergency.onclick = (ev) => { ev.stopPropagation(); toggleAdminPanel(); };
    document.body.appendChild(emergency);
    console.log('[Admin] Botón de emergencia agregado. Haz click en el escudo morado ↘️');
  }
}


// ─────────────────────────────────────────────
// CSS DEL PANEL
// ─────────────────────────────────────────────
function injectAdminStyles() {
  if (document.getElementById('adminStyles')) return;

  const css = `
/* ════════════════════════════════════════════
   ADMIN PANEL — ONE PLAY MORE
   ════════════════════════════════════════════ */
#adminOverlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px);
  z-index: 99999;
  align-items: flex-start;
  justify-content: flex-end;
}
#adminOverlay.admin-open {
  display: flex;
}

.admin-panel {
  width: min(780px, 98vw);
  height: 100dvh;
  background: #0f0f13;
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
  color: #e8e8f0;
  animation: adminSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes adminSlideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* HEADER */
.admin-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #090910;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.admin-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.7);
}
.admin-logo i { color: #8a6cb8; font-size: 1rem; }
.admin-close-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  width: 32px; height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.admin-close-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

/* VIEWS */
.admin-view { display: none; flex: 1; overflow: hidden; flex-direction: column; }
.admin-view.active { display: flex; }

/* ── LOGIN ── */
.admin-login-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.admin-login-box {
  background: #15151e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 360px;
  text-align: center;
}
.admin-login-icon {
  width: 52px; height: 52px;
  background: rgba(138,108,184,0.15);
  border: 1px solid rgba(138,108,184,0.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.2rem;
  font-size: 1.3rem;
  color: #8a6cb8;
}
.admin-login-box h2 { font-size: 1.2rem; margin-bottom: 0.3rem; }
.admin-login-box > p { color: rgba(255,255,255,0.4); font-size: 0.82rem; margin-bottom: 1.5rem; }
.admin-error { display: none; color: #ff6b6b; font-size: 0.8rem; margin-top: -0.5rem; margin-bottom: 0.8rem; }

@keyframes adminShake {
  0%,100% { transform: translateX(0); }
  20%,60%  { transform: translateX(-8px); }
  40%,80%  { transform: translateX(8px); }
}
.admin-shake { animation: adminShake 0.4s ease; }

/* ── DASHBOARD ── */
.admin-topbar {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex-shrink: 0;
}
.admin-stats-row {
  display: flex;
  gap: 1rem;
}
.admin-stat {
  flex: 1;
  background: #15151e;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 0.7rem 1rem;
  text-align: center;
}
.admin-stat span { display: block; font-size: 1.3rem; font-weight: 700; color: #8a6cb8; }
.admin-stat label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.4); }

.admin-topbar-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.admin-search-wrap {
  padding: 0.8rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-shrink: 0;
}
.admin-search-wrap i { color: rgba(255,255,255,0.3); font-size: 0.85rem; }
.admin-search-wrap input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #e8e8f0;
  font-size: 0.9rem;
  font-family: inherit;
}
.admin-search-wrap input::placeholder { color: rgba(255,255,255,0.25); }

.admin-product-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}
.admin-product-list::-webkit-scrollbar { width: 4px; }
.admin-product-list::-webkit-scrollbar-track { background: transparent; }
.admin-product-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.admin-product-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.admin-product-row:hover { background: rgba(255,255,255,0.03); }
.admin-product-thumb {
  width: 44px; height: 44px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.admin-product-info { flex: 1; min-width: 0; }
.admin-product-name { font-size: 0.88rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-product-meta { font-size: 0.75rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.2rem; }
.admin-product-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }

.admin-empty { text-align: center; padding: 3rem; color: rgba(255,255,255,0.3); font-size: 0.9rem; }

/* ── FORM ── */
.admin-form-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  height: 100%;
  overflow: hidden;
}
.admin-form-col {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.06);
}
.admin-form-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.admin-form-header h3 { font-size: 1rem; font-weight: 600; }
.admin-form-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.admin-form-body::-webkit-scrollbar { width: 4px; }
.admin-form-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.admin-form-actions { padding-top: 0.5rem; padding-bottom: 1rem; }

.admin-preview-col {
  background: #0c0c14;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  overflow-y: auto;
}
.admin-preview-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.3);
}
.admin-preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  border: 2px dashed rgba(255,255,255,0.1);
  border-radius: 12px;
  color: rgba(255,255,255,0.2);
}
.admin-preview-placeholder i { font-size: 2rem; }
.admin-preview-placeholder p { font-size: 0.8rem; }
.admin-preview-hint { font-size: 0.72rem; color: rgba(255,255,255,0.25); display: flex; align-items: center; gap: 0.4rem; }

/* Preview card */
.admin-preview-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  color: #1e1e1e;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
.admin-preview-img-wrap {
  position: relative;
  background: #f5f5f5;
  aspect-ratio: 1;
  overflow: hidden;
}
.admin-preview-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.admin-badge-overlay {
  position: absolute;
  top: 8px; left: 8px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  z-index: 2;
}
.admin-preview-body { padding: 0.9rem; }
.admin-preview-cat { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 0.3rem; }
.admin-preview-name { font-size: 0.88rem; font-weight: 600; line-height: 1.3; margin-bottom: 0.5rem; }
.admin-preview-prices { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.7rem; }
.admin-preview-orig { font-size: 0.75rem; color: #aaa; text-decoration: line-through; }
.admin-preview-price { font-size: 1rem; font-weight: 700; color: #6a4c9c; }
.admin-preview-btn {
  width: 100%;
  padding: 0.45rem;
  background: #6a4c9c;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: default;
}

/* ── BADGES ── */
.admin-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.admin-badge.new, .admin-badge-overlay.new { background: #22c55e; color: white; }
.admin-badge.oferta, .admin-badge-overlay.oferta { background: #ef4444; color: white; }
.admin-badge.encargo, .admin-badge-overlay.encargo { background: #f59e0b; color: white; }

/* ── BOTONES ── */
.admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;
}
.admin-btn.primary  { background: #6a4c9c; color: white; }
.admin-btn.primary:hover  { background: #7a5cac; }
.admin-btn.success  { background: #16a34a; color: white; }
.admin-btn.success:hover  { background: #15803d; }
.admin-btn.accent   { background: #d4af37; color: #0a0a0a; }
.admin-btn.accent:hover   { background: #c9a02e; }
.admin-btn.ghost    { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
.admin-btn.ghost:hover    { background: rgba(255,255,255,0.1); color: white; }
.admin-btn.full     { width: 100%; justify-content: center; padding: 0.7rem; font-size: 0.9rem; }
.admin-btn.icon     { padding: 0.4rem; }

.admin-btn-icon {
  width: 30px; height: 30px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem;
  transition: all 0.15s;
}
.admin-btn-icon.edit    { background: rgba(138,108,184,0.15); color: #8a6cb8; }
.admin-btn-icon.edit:hover { background: rgba(138,108,184,0.3); }
.admin-btn-icon.preview { background: rgba(59,130,246,0.15); color: #60a5fa; }
.admin-btn-icon.preview:hover { background: rgba(59,130,246,0.3); }
.admin-btn-icon.delete  { background: rgba(239,68,68,0.15); color: #f87171; }
.admin-btn-icon.delete:hover { background: rgba(239,68,68,0.3); }
.admin-btn-icon.reorder {
  width: 22px; height: 18px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.55);
  font-size: 0.6rem;
}
.admin-btn-icon.reorder:hover { background: rgba(255,255,255,0.14); color: white; }
.admin-btn-icon.reorder:disabled { opacity: 0.25; cursor: not-allowed; }
.admin-reorder-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ── FORM FIELDS ── */
.form-field { display: flex; flex-direction: column; gap: 0.3rem; }
.form-field label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(255,255,255,0.5);
}
.form-field .optional { font-weight: 400; text-transform: none; color: rgba(255,255,255,0.25); letter-spacing: 0; }
.form-field input,
.form-field select,
.form-field textarea {
  background: #15151e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e8e8f0;
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.55rem 0.8rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  resize: vertical;
}
.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: rgba(138,108,184,0.6);
  box-shadow: 0 0 0 3px rgba(106,76,156,0.15);
}
.form-field input:disabled { opacity: 0.4; cursor: not-allowed; }
.form-field select option { background: #15151e; }

.form-row { display: grid; gap: 0.8rem; }
.form-row.two-col { grid-template-columns: 1fr 1fr; }
.form-row.three-col { grid-template-columns: 1fr 1fr 1fr; }
.form-row.checkboxes { margin-top: 0.3rem; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0.8rem;
  background: #15151e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  font-size: 0.83rem;
  transition: border-color 0.2s;
}
.checkbox-label:hover { border-color: rgba(138,108,184,0.4); }
.checkbox-label input[type="checkbox"] { accent-color: #8a6cb8; width: 14px; height: 14px; }

/* ── TOAST ── */
.admin-toast {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%) translateY(-12px);
  background: #1e1e2e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 0.55rem 1.1rem;
  font-size: 0.82rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s, transform 0.25s;
  z-index: 10;
}
.admin-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.admin-toast-success { border-color: rgba(34,197,94,0.4); color: #86efac; }
.admin-toast-error   { border-color: rgba(239,68,68,0.4);  color: #fca5a5; }
.admin-toast-warning { border-color: rgba(245,158,11,0.4); color: #fcd34d; }

/* ── TABS ── */
.admin-tabs {
  display: flex;
  gap: 0.3rem;
  padding: 0.8rem 1.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.admin-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255,255,255,0.45);
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.admin-tab:hover { color: rgba(255,255,255,0.8); }
.admin-tab.active {
  color: var(--primary-light);
  border-bottom-color: var(--primary-light);
}

/* ── BANNERS ── */
.admin-banner-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.admin-banner-row:hover { background: rgba(255,255,255,0.03); }
.admin-banner-thumb {
  width: 80px; height: 50px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.admin-banner-info { flex: 1; min-width: 0; }
.admin-banner-title { font-size: 0.88rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-banner-meta { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 0.15rem; }
.admin-banner-url { font-size: 0.7rem; color: rgba(255,255,255,0.25); margin-top: 0.1rem; }
.admin-banner-filter {
  font-size: 0.7rem;
  color: #8a6cb8;
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.admin-banner-filter i { font-size: 0.65rem; }

.admin-field-hint {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.35);
  margin-top: 0.35rem;
  line-height: 1.4;
}

.admin-banner-preview-card {
  width: 100%;
  aspect-ratio: 16/5;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.admin-banner-preview-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.admin-banner-preview-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.2rem;
  color: white;
}
.admin-banner-preview-overlay h4 { font-size: 1rem; margin-bottom: 0.3rem; }
.admin-banner-preview-overlay p { font-size: 0.75rem; opacity: 0.8; margin-bottom: 0.5rem; }
.admin-banner-preview-btn {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-radius: 3px;
  width: fit-content;
}
.admin-banner-sizes {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.35);
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.admin-banner-sizes-info {
  background: rgba(138,108,184,0.08);
  border: 1px solid rgba(138,108,184,0.2);
  border-radius: 8px;
  padding: 0.8rem 1rem;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.6);
  line-height: 1.6;
}
.admin-banner-sizes-info i { color: var(--primary-light); margin-right: 0.3rem; }

/* Filtro preview en admin */
.filter-preview-none {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.3);
  font-style: italic;
}
.filter-preview-active {
  background: rgba(138,108,184,0.1);
  border: 1px solid rgba(138,108,184,0.3);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.8);
  line-height: 1.5;
}
.filter-preview-active i { color: #8a6cb8; margin-right: 0.3rem; }
.filter-preview-active strong { color: #a78bfa; }
.filter-preview-active small { color: rgba(255,255,255,0.45); font-size: 0.7rem; }

/* ── CATEGORÍAS ── */
.admin-category-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.02);
}
.admin-subcategory-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem 0.5rem 2.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.admin-subcat-indent { color: rgba(255,255,255,0.2); font-size: 0.8rem; }

/* ── CUPONES ── */
.admin-coupon-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.8rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.02);
}

.admin-coupon-code {
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 1px;
  color: white;
  background: rgba(255,255,255,0.08);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  margin-right: 0.6rem;
}

.admin-coupon-status {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
}
.admin-coupon-status--on { background: rgba(74,222,128,0.15); color: #4ade80; }
.admin-coupon-status--off { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
.admin-coupon-status--scheduled { background: rgba(96,165,250,0.15); color: #60a5fa; }

/* Switch de activar/desactivar cupón */
.admin-coupon-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
.admin-coupon-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.admin-coupon-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.15);
  border-radius: 22px;
  transition: 0.2s;
}
.admin-coupon-slider::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}
.admin-coupon-switch input:checked + .admin-coupon-slider {
  background: #4ade80;
}
.admin-coupon-switch input:checked + .admin-coupon-slider::before {
  transform: translateX(18px);
}

.admin-announcement-row {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}
.admin-announcement-row .ann-msg-text {
  flex: 2;
}
.admin-announcement-row .ann-msg-link {
  flex: 1;
}
.admin-announcement-row input {
  padding: 0.6rem 0.8rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
}
.admin-announcement-row input:focus {
  outline: none;
  border-color: var(--primary-light);
}
.admin-category-info { flex: 1; min-width: 0; }
.admin-category-name { font-size: 0.88rem; font-weight: 500; }
.admin-category-meta { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 0.15rem; }

/* ── RESPONSIVE ── */
@media (max-width: 600px) {
  .admin-form-layout { grid-template-columns: 1fr; }
  .admin-preview-col { display: none; }
  .admin-stats-row { gap: 0.5rem; }
  .admin-panel { width: 100vw; }
}

/* Botón de emergencia admin */
#adminEmergencyTrigger {
  animation: adminPulse 2s infinite;
}
@keyframes adminPulse {
  0%, 100% { box-shadow: 0 4px 15px rgba(138,108,184,0.4); }
  50% { box-shadow: 0 4px 25px rgba(138,108,184,0.7); }
}
#adminEmergencyTrigger:hover {
  transform: scale(1.1) !important;
  background: rgba(138,108,184,1) !important;
}
  `;

  const style = document.createElement('style');
  style.id = 'adminStyles';
  style.textContent = css;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────
// EVENTOS
// ─────────────────────────────────────────────
function bindAdminEvents() {
  document.addEventListener('click', e => {
    // Delegación: si el click fue en un icono dentro de un botón, subir al botón
    const target = e.target.closest('[id]') || e.target;
    const id = target.id;
    if (id === 'adminLoginBtn') loginAdmin();
    if (id === 'adminLogoutBtn') logoutAdmin();
    if (id === 'adminCloseBtn')  closeAdminPanel();
    if (id === 'adminNewProductBtn') openProductForm();
    if (id === 'adminSaveProductBtn') saveAdminProduct();
    if (id === 'adminCancelFormBtn')  showAdminView('dashboardView');
    if (id === 'adminExportBtn')  exportAdminJSON();
    if (id === 'adminApplyBtn')   applyAdminChangesLive();
    // Banners
    if (id === 'adminBannersTab') { showAdminView('bannerListView'); }
    if (id === 'adminBannersTabBl') { showAdminView('bannerListView'); }
    if (id === 'adminNewBannerBtn') openBannerForm();
    if (id === 'adminSaveBannerBtn') saveAdminBanner();
    if (id === 'adminCancelBannerBtn') showAdminView('bannerListView');
    if (id === 'adminExportBannersBtn') exportBannersJSON();
    if (id === 'adminApplyBannersBtn') applyBannersChangesLive();
    // Categorías
    if (id === 'adminCategoriesTab') { showAdminView('categoryListView'); }
    if (id === 'adminCategoriesTabCl') { showAdminView('categoryListView'); }
    if (id === 'adminNewCategoryBtn') openCategoryForm();
    if (id === 'adminSaveCategoryBtn') saveAdminCategory();
    if (id === 'adminCancelCategoryBtn') showAdminView('categoryListView');
    if (id === 'adminNewSubcategoryBtn') openSubcategoryForm(parseInt(document.getElementById('subcatParentIndex')?.value || 0));
    if (id === 'adminSaveSubcategoryBtn') saveAdminSubcategory();
    if (id === 'adminCancelSubcategoryBtn') showAdminView('categoryListView');
    if (id === 'adminExportCategoriesBtn') exportCategoriesJSON();
    if (id === 'adminApplyCategoriesBtn') applyCategoriesChangesLive();
    // Cupones
    if (id === 'adminCouponsTab' || id === 'adminCouponsTabBl' || id === 'adminCouponsTabCl' || id === 'adminCouponsTabCo') { showAdminView('couponListView'); }
    if (id === 'adminNewCouponBtn') openCouponForm();
    if (id === 'adminSaveCouponBtn') saveAdminCoupon();
    if (id === 'adminCancelCouponBtn') showAdminView('couponListView');
    if (id === 'adminExportCouponsBtn') exportCouponsJSON();
    if (id === 'adminApplyCouponsBtn') applyCouponsChangesLive();
    // Anuncios
    if (id === 'adminAnnouncementTab' || id === 'adminAnnouncementTabBl' || id === 'adminAnnouncementTabCl' || id === 'adminAnnouncementTabCo' || id === 'adminAnnouncementTabAn') { showAdminView('announcementView'); }
    if (id === 'adminAddAnnouncementMsgBtn') addAnnouncementMsg();
    if (id === 'adminSaveAnnouncementBtn') saveAdminAnnouncementForm();
    if (id === 'adminExportAnnouncementBtn') exportAnnouncementJSON();
    if (id === 'adminApplyAnnouncementBtn') applyAnnouncementChangesLive();
    // Tabs productos
    if (id === 'adminProductsTab') { showAdminView('dashboardView'); }
    if (id === 'adminProductsTabBl') { showAdminView('dashboardView'); }
    if (id === 'adminProductsTabCl') { showAdminView('dashboardView'); }
    if (id === 'adminProductsTabCo') { showAdminView('dashboardView'); }
    if (id === 'adminProductsTabAn') { showAdminView('dashboardView'); }
    if (id === 'adminBannersTabCl') { showAdminView('bannerListView'); }
    if (id === 'adminBannersTabCo') { showAdminView('bannerListView'); }
    if (id === 'adminBannersTabAn') { showAdminView('bannerListView'); }
    if (id === 'adminCategoriesTabCo') { showAdminView('categoryListView'); }
    if (id === 'adminCategoriesTabAn') { showAdminView('categoryListView'); }
    if (id === 'adminCouponsTabAn') { showAdminView('couponListView'); }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('adminLoginBox')?.closest('.admin-view.active')) {
      loginAdmin();
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'adminSearchInput') {
      renderAdminProductList(e.target.value);
    }
    if (['formName','formPrice','formOriginalPrice','formImages','formNew','formBestSeller','formEncargo'].includes(e.target.id)) {
      updateProductPreview();
    }
    if (['bannerImage','bannerVideo','bannerYoutube','bannerTitle','bannerSubtitle','bannerButton','bannerLink'].includes(e.target.id)) {
      updateBannerPreview();
    }
    if (['bannerFilterType','bannerFilterValue'].includes(e.target.id)) {
      updateBannerFilterPreview();
    }
  });

  document.addEventListener('change', e => {
    if (['formCategory','formNew','formBestSeller','formEncargo'].includes(e.target.id)) {
      updateProductPreview();
    }
    if (e.target.id === 'formEncargo') {
      const nota = document.getElementById('encargoNotaField');
      if (nota) nota.style.display = e.target.checked ? 'block' : 'none';
    }
    if (e.target.id === 'bannerFilterType') {
      updateBannerFilterFields();
      updateBannerFilterPreview();
    }
    if (e.target.id === 'bannerFilterValue') {
      updateBannerFilterPreview();
    }
    if (e.target.id === 'bannerFilterValueSelect') {
      updateBannerFilterPreview();
    }
    if (e.target.id === 'bannerMediaType') {
      updateBannerMediaFields();
      updateBannerPreview();
    }
    if (e.target.id === 'bannerScope') {
      updateBannerScopeFields();
      updateBannerPreview();
    }
    if (e.target.id === 'bannerTargetCategory') {
      updateBannerPreview();
    }
    if (e.target.id === 'catHasSubs') {
      document.getElementById('catMenuStyleWrap').style.display = e.target.checked ? 'block' : 'none';
    }
    if (e.target.id === 'couponType') {
      updateCouponValueLabel();
    }
    if (e.target.id === 'couponScope') {
      updateCouponScopeFields();
    }
  });

  document.addEventListener('click', e => {
    const overlay = document.getElementById('adminOverlay');
    if (e.target === overlay) closeAdminPanel();
  });
}