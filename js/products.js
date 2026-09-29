// products.js — VERSIÓN CORREGIDA
// Carga, renderiza y gestiona el catálogo de productos con UX premium

let allProducts = [];

// ─────────────────────────────────────────────
// CARGA DE DATOS
// ─────────────────────────────────────────────
async function loadProducts() {
  try {
    document.getElementById('productsGrid').innerHTML = `
      <div class="pack-loader">
        <div class="pack"><div class="pack-front"></div><div class="pack-back"></div></div>
        <p>Abriendo sobre...</p>
      </div>`;

    const response = await fetch('data/products.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    allProducts = await response.json();
    renderProducts(allProducts);
  } catch (error) {
    console.error('Error cargando productos:', error);
    document.getElementById('productsGrid').innerHTML = `
      <div class="products-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar productos. <button onclick="loadProducts()">Reintentar</button></p>
      </div>`;
  }
}

// ─────────────────────────────────────────────
// HELPER: Verificar si producto está disponible
// ─────────────────────────────────────────────
function isProductAvailable(product) {
  return product.status !== 'agotado' && product.status !== 'proximamente';
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────
function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="products-empty">
        <i class="fas fa-box-open"></i>
        <p>No hay productos en esta categoría.</p>
        <button class="btn-reset-filter" onclick="window.applyFilter && window.applyFilter('all')">Ver todos</button>
      </div>`;
    return;
  }

  // Orden de aparición:
  //   1) Disponibles que NO son cartas (Funko, figuras, accesorios, mazos destacados, etc.)
  //   2) Disponibles que SÍ son cartas (comunes, ilustraciones raras, etc.) — van después
  //   3) Agotados / "próximamente" — siempre al final de todo, sin importar la categoría
  function getSortPriority(product) {
    const isUnavailable = product.status === 'agotado' || product.status === 'proximamente';
    if (isUnavailable) return 2;
    if (product.categoryId === 'cartas') return 1;
    return 0;
  }

  const sortedProducts = [...products].sort((a, b) => getSortPriority(a) - getSortPriority(b));

  grid.innerHTML = sortedProducts.map(product => buildProductCard(product)).join('');

  // Delegación de eventos — SOLO un listener, verificar si ya existe
  if (!grid._listenerAttached) {
    grid.addEventListener('click', handleProductGridClick);
    grid._listenerAttached = true;
  }

  if (typeof initScrollAnimations === 'function') {
    initScrollAnimations();
  }
}

// ─────────────────────────────────────────────
// BUILD CARD
// ─────────────────────────────────────────────
function buildProductCard(product) {
  const img  = product.images?.[0] || 'images/products/placeholder.jpg';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  // Badges
  const badges = [];
  if (product.status === 'agotado')      badges.push(`<span class="product-badge agotado">Agotado</span>`);
  if (product.status === 'preventa')     badges.push(`<span class="product-badge preventa">Preventa</span>`);
  if (product.status === 'proximamente') badges.push(`<span class="product-badge pronto">Pronto</span>`);
  if (product.new && product.status !== 'agotado') badges.push(`<span class="product-badge nuevo">Nuevo</span>`);
  if (hasDiscount && product.status !== 'agotado') badges.push(`<span class="product-badge descuento">-${discountPct}%</span>`);
  if (product.encargo && !badges.length) badges.push(`<span class="product-badge encargo">Encargo</span>`);

  const isUnavailable = product.status === 'agotado' || product.status === 'proximamente';
  // Las cartas TCG tienen proporción vertical (5:7), distinta a Funkos/figuras.
  // Usamos una clase especial para que no se recorten dentro de la tarjeta.
  const isCardProduct = product.categoryId === 'cartas';

  // Si el producto tiene un atributo de Idioma con más de una opción, mostramos
  // insignias (ES/EN/etc.) para que el cliente sepa en qué idiomas existe
  // ANTES de entrar al detalle — las agotadas se ven atenuadas, no se ocultan,
  // para no generar confusión sobre si el producto "no viene" en ese idioma.
  const idiomaAttr = (product.attributes || []).find(a => (a.name || '').trim().toLowerCase() === 'idioma');
  let langBadgesHTML = '';
  if (idiomaAttr && idiomaAttr.options && idiomaAttr.options.length > 0) {
    langBadgesHTML = `<div class="product-lang-badges">${idiomaAttr.options.map(opt => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const available = !(typeof opt === 'object' && opt.available === false);
      const countryCode = getLanguageCountryCode(val);
      return `<span class="product-lang-badge fi fi-${countryCode}${available ? '' : ' product-lang-badge--soldout'}" title="${escapeHtml(val)}${available ? '' : ' (agotado)'}"></span>`;
    }).join('')}</div>`;
  }

  return `
    <article class="product-card${isUnavailable ? ' product-card--unavailable' : ''}" data-product-id="${product.id}" tabindex="0" role="button"
             aria-label="${isUnavailable ? 'Producto no disponible' : 'Ver'} ${product.name}"${isUnavailable ? ' style="cursor:default;"' : ''}>
      <div class="product-img-wrap${isCardProduct ? ' product-img-wrap--card' : ''}">
        ${badges.length ? `<div class="product-badges">${badges.join('')}</div>` : ''}
        <img
          src="${img}"
          alt="${escapeHtml(product.name)}"
          class="product-img${isUnavailable ? ' product-img--dim' : ''}"
          loading="lazy"
          onload="this.classList.add('loaded');"
          onerror="this.src='images/products/placeholder.jpg'; this.onerror=null; this.classList.add('loaded');">
        <div class="product-card-overlay">
          <button class="quick-view-btn" data-product-id="${product.id}" aria-label="Vista rápida de ${escapeHtml(product.name)}" title="Vista rápida">
            <i class="fas fa-box-open"></i>
          </button>
        </div>
        ${langBadgesHTML}
      </div>
      <div class="product-info">
        <div class="product-category-row">
          <p class="product-category">${escapeHtml(product.category || '')}</p>
          ${product.condition ? `<span class="product-condition-badge" title="${escapeHtml(product.condition)}"><span>${getConditionAbbrev(product.condition)}</span></span>` : ''}
        </div>
        <h3 class="product-title" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>
        <div class="product-price-row">
          ${hasDiscount
            ? `<span class="old-price">$${product.originalPrice.toLocaleString('es-CO')}</span>`
            : ''}
          <span class="current-price${isUnavailable ? ' price--dim' : ''}">
            ${isUnavailable && product.status !== 'preventa'
              ? '<span class="price-label">No disponible</span>'
              : `$${product.price.toLocaleString('es-CO')}`}
          </span>
        </div>
        ${product.encargo
          ? `<p class="product-encargo-badge"><i class="fas fa-clock"></i> Por encargo</p>`
          : ''}
      </div>
    </article>
  `;
}

// ─────────────────────────────────────────────
// DELEGACIÓN DE EVENTOS
// ─────────────────────────────────────────────
function handleProductGridClick(e) {
  // Quick view button
  const quickViewBtn = e.target.closest('.quick-view-btn');
  if (quickViewBtn) {
    e.stopPropagation();
    const id = quickViewBtn.dataset.productId;
    const product = allProducts.find(p => p.id === id);
    // No permitir vista rápida si está agotado
    if (product && !isProductAvailable(product)) {
      if (typeof showToast === 'function') showToast('❌ Producto agotado', 2000);
      return;
    }
    if (product && typeof openQuickView === 'function') openQuickView(product);
    return;
  }

  // Card click → modal completo
  const card = e.target.closest('.product-card');
  if (card) {
    const id = card.dataset.productId;
    const product = allProducts.find(p => p.id === id);
    if (product) {
      // Si está agotado, mostrar toast y no abrir modal
      if (!isProductAvailable(product)) {
        if (typeof showToast === 'function') showToast('❌ Producto agotado', 2000);
        return;
      }
      if (typeof openProductModal === 'function') openProductModal(product);
    }
  }
}

// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────
// Devuelve el código ISO de país (para la clase de flag-icons, ej. "fi-es")
// correspondiente al idioma, para mostrar una bandera SVG real como insignia
// circular — no depende de que la fuente del sistema soporte emojis de bandera.
function getLanguageCountryCode(name) {
  const map = {
    'español': 'es', 'espanol': 'es',
    'inglés': 'us', 'ingles': 'us',
    'japonés': 'jp', 'japones': 'jp',
    'coreano': 'kr',
    'francés': 'fr', 'frances': 'fr',
    'alemán': 'de', 'aleman': 'de',
    'italiano': 'it',
    'portugués': 'pt', 'portugues': 'pt',
    'chino': 'cn'
  };
  const key = String(name || '').trim().toLowerCase();
  return map[key] || 'xx';
}

// Abrevia la condición de la carta para la insignia pequeña (ej. "Near Mint" -> "NM")
function getConditionAbbrev(condition) {
  const map = {
    'Mint': 'M',
    'Near Mint': 'NM',
    'Lightly Played': 'LP',
    'Moderately Played': 'MP',
    'Heavily Played': 'HP',
    'Damaged': 'DMG'
  };
  return map[condition] || condition;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getProductById(id) {
  return allProducts.find(p => p.id === id);
}