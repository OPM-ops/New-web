// categories.js - VERSIÓN CORREGIDA Y FUNCIONAL
let allCategories = [];
let currentFilter = { categoryId: 'all', filterType: null, filterValue: null };

// ¿Existe al menos un producto que haga match con esta subcategoría/expansión?
// Si los productos aún no cargaron, no ocultamos nada (mejor de más que de menos).
function hasProductsFor(sub, categoryId) {
  if (typeof allProducts === 'undefined' || !allProducts.length) return true;
  // Algunas entradas (ej. dentro de "TCG": Magic, Yu-Gi-Oh!, Accesorios) no
  // filtran por un atributo específico — simplemente enlazan a OTRA
  // categoría completa mediante "categoryId", sin filterType/filterValue
  // propios. En ese caso basta con que existan productos en esa categoría
  // destino; si además se intentara comparar por filterType/filterValue
  // (ambos undefined), la comparación nunca sería confiable.
  if (sub.categoryId && !sub.filterType) {
    return allProducts.some(p => p.categoryId === sub.categoryId);
  }
  return allProducts.some(p => p.categoryId === categoryId && p[sub.filterType] === sub.filterValue);
}

// Genera el grid de badges de expansión (con logo o texto de respaldo).
// Solo muestra las que ya tienen al menos 1 producto cargado — así el
// cliente nunca entra a una expansión vacía sin nada para comprar, y el
// día que agregues el primer producto de una, aparece sola sin que tengas
// que tocar el menú a mano.
function buildExpansionBadgesHTML(expansions, categoryId) {
  const visibleExpansions = (expansions || []).filter(sub => hasProductsFor(sub, categoryId));

  if (!visibleExpansions || visibleExpansions.length === 0) {
    return `<div class="mega-menu-empty">Muy pronto agregamos expansiones de esta era.</div>`;
  }
  return visibleExpansions.map(sub => `
    <button class="mega-menu-badge" data-filter-type="${sub.filterType || ''}" data-filter-value="${sub.filterValue || ''}" data-category-id="${sub.categoryId || categoryId}">
      ${sub.image ? `<img src="${sub.image}" alt="${sub.name}" class="mega-menu-badge-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
      <span class="mega-menu-badge-fallback" style="display:none;">${sub.name}</span>` : `<span class="mega-menu-badge-fallback">${sub.name}</span>`}
    </button>
  `).join('');
}

// Cambia la era activa dentro del mega-menú de dos niveles (Cartas) y repinta
// el grid de expansiones correspondiente
function switchMegaMenuEra(contentDiv, cat, eraIndex) {
  contentDiv.querySelectorAll('.mega-menu-era-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === eraIndex);
  });
  const era = groupExpansionsByEra(cat.expansions, cat.id)[eraIndex];
  const grid = contentDiv.querySelector('.mega-menu-grid');
  if (grid) grid.innerHTML = buildExpansionBadgesHTML(era ? era.expansions : [], cat.id);
}

// Agrupa las expansiones propias de "Cartas" (cat.expansions) por su campo
// "era" (ej. "Scarlet & Violet"), para armar las pestañas del mega-menú.
// Esta lista es independiente de las subcategorías de "Pokémon TCG": una
// misma expansión puede existir en un menú, en el otro, en ambos o en
// ninguno — se gestionan por separado a propósito (a veces hay cartas
// sueltas disponibles de una expansión, pero no producto sellado, o
// viceversa).
function groupExpansionsByEra(expansions, categoryId) {
  const eraOrder = [];
  const eraMap = {};

  (expansions || []).forEach(exp => {
    if (!exp.era) return; // sin era asignada = no se agrupa (no aparece en el mega-menú por eras)
    if (!hasProductsFor(exp, categoryId)) return; // sin productos = no se muestra (ni la expansión ni, si queda vacía, su era)
    if (!eraMap[exp.era]) {
      eraMap[exp.era] = [];
      eraOrder.push(exp.era);
    }
    eraMap[exp.era].push(exp);
  });

  // Los datos vienen cargados cronológicamente (de más antigua a más nueva),
  // pero queremos mostrar primero lo más reciente — invertimos tanto el
  // orden de las eras (pestañas) como el de las expansiones dentro de cada una.
  return eraOrder.reverse().map(eraName => ({ name: eraName, expansions: [...eraMap[eraName]].reverse() }));
}

async function loadCategories() {
  try {
    const response = await fetch('data/categories.json');
    allCategories = await response.json();
    renderCategories(allCategories);
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

// ─────────────────────────────────────────────
// BLOQUEO DE SCROLL DE PÁGINA MIENTRAS UN MEGA-MENÚ ESTÁ ABIERTO
// Los mega-menús (Cartas, Pokémon TCG) tienen su PROPIO scroll interno
// (ver .mega-menu { overflow-y: auto } en el CSS) porque pueden tener
// decenas de expansiones. Si al mismo tiempo la página de fondo también
// puede hacer scroll, aparecen dos scrollbars muy pegadas (una del menú,
// otra de la página) y al mover la rueda del mouse a veces se mueven las
// dos a la vez — confuso. La solución es bloquear el scroll de la página
// (solo el de la página; el del menú se mantiene intacto) mientras el
// mega-menú está siendo hover/abierto, y restaurarlo al salir.
// ─────────────────────────────────────────────
function updatePageScrollLock() {
  // ":hover" en un selector CSS refleja el estado real del cursor en este
  // momento, así que esto detecta tanto los mega-menús abiertos por hover
  // (escritorio) como por la clase "open" (móvil / clic en la flecha).
  const anyMegaMenuActive = document.querySelector('.dropdown--mega:hover, .dropdown--mega.open');
  if (anyMegaMenuActive) {
    if (document.body.dataset.scrollLocked !== '1') {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) document.body.style.paddingRight = scrollBarWidth + 'px';
      document.body.dataset.scrollLocked = '1';
    }
  } else if (document.body.dataset.scrollLocked === '1') {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    delete document.body.dataset.scrollLocked;
  }
}

function renderCategories(categories) {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  // 1. Limpiar y agregar botones fijos (versión minimalista: solo ícono + tooltip)
  nav.innerHTML = `
    <button class="category-btn nav-icon-btn active" data-category="inicio" title="Inicio"><i class="fas fa-home"></i></button>
    <button class="category-btn nav-icon-btn" data-category="all" title="Todos"><i class="fas fa-th-large"></i></button>
    <button class="category-btn nav-icon-btn" data-category="ofertas" title="Ofertas"><i class="fas fa-fire"></i></button>
    <button class="category-btn nav-icon-btn" data-category="novedades" title="Novedades"><i class="fas fa-star"></i></button>
    <button class="category-btn nav-icon-btn" data-category="encargo" title="Encargo"><i class="fas fa-box"></i></button>
    <div class="dropdown" id="aprendeDropdown">
      <div class="dropdown-main">
        <a href="aprende.html" class="category-btn nav-link-static">🎓 Aprende</a>
        <span class="dropdown-toggle"><i class="fas fa-chevron-down"></i></span>
      </div>
      <div class="dropdown-content">
        <a href="aprende.html" class="subcategory-btn">🎓 Cómo Jugar TCG</a>
        <a href="coleccionar.html" class="subcategory-btn">📦 Cómo Coleccionar</a>
        <a href="juegos-mesa.html" class="subcategory-btn">🎲 Juegos de Mesa</a>
      </div>
    </div>
  `;

  // Botón "Inicio": vuelve a la vista curada (banners + colecciones + recomendados),
  // en vez de pasar por applyFilter como las demás categorías.
  const inicioBtn = nav.querySelector('[data-category="inicio"]');
  if (inicioBtn) {
    inicioBtn.addEventListener('click', () => {
      if (typeof showHomeView === 'function') showHomeView();
      highlightActiveCategory('inicio');
    });
  }

  // Wiring del dropdown estático "Aprende" (no depende de datos de categorías)
  const aprendeDropdown = document.getElementById('aprendeDropdown');
  if (aprendeDropdown) {
    const toggle = aprendeDropdown.querySelector('.dropdown-toggle');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown').forEach(d => {
        if (d !== aprendeDropdown) d.classList.remove('open');
      });
      aprendeDropdown.classList.toggle('open');
    });
  }

  // 2. Agregar categorías dinámicas (con o sin subcategorías)
  categories.forEach(cat => {
    if (cat.hideFromNav) return; // ej. Funko Pop! y Accesorios: viven dentro de otro menú, no como botón propio

    if (cat.subcategories && cat.subcategories.length > 0) {
      // Crear dropdown
      const dropdownDiv = document.createElement('div');
      dropdownDiv.className = 'dropdown';
      if (cat.menuStyle === 'grid') dropdownDiv.classList.add('dropdown--mega');
      if (cat.menuStyle === 'grid-tiered') dropdownDiv.classList.add('dropdown--mega');

      const mainDiv = document.createElement('div');
      mainDiv.className = 'dropdown-main';

      const mainBtn = document.createElement('button');
      mainBtn.className = 'category-btn';
      mainBtn.dataset.category = cat.id;
      mainBtn.textContent = cat.name;

      const toggleSpan = document.createElement('span');
      toggleSpan.className = 'dropdown-toggle';
      toggleSpan.innerHTML = '<i class="fas fa-chevron-down"></i>';

      mainDiv.appendChild(mainBtn);
      mainDiv.appendChild(toggleSpan);

      const contentDiv = document.createElement('div');

      if (cat.menuStyle === 'grid-tiered') {
        // ── MEGA-MENÚ DE DOS NIVELES: primero eras (Scarlet & Violet, Sword & Shield...),
        // luego las expansiones de la era seleccionada. Evita un menú larguísimo
        // cuando hay cartas de muchas eras distintas. ──
        contentDiv.className = 'mega-menu';
        const quickRowHTML = (cat.subcategories && cat.subcategories.length) ? `
          <div class="mega-menu-quick-row">
            ${cat.subcategories.map(sub => `
              <button class="mega-menu-badge mega-menu-badge--pill" data-filter-type="${sub.filterType || ''}" data-filter-value="${sub.filterValue || ''}" data-category-id="${sub.categoryId || cat.id}"><span class="mega-menu-badge-fallback">${sub.name}</span></button>
            `).join('')}
          </div>` : '';

        const eras = groupExpansionsByEra(cat.expansions, cat.id);
        contentDiv.innerHTML = `
          <div class="mega-menu-inner">
            <div class="mega-menu-title">${cat.menuTitle || 'Explora Cartas'}</div>
            <div class="mega-menu-subtitle">${cat.menuSubtitle || 'Encuentra las cartas de tu colección favorita'}</div>
            ${quickRowHTML}
            ${eras.length > 1 ? `
            <div class="mega-menu-era-tabs">
              ${eras.map((era, i) => `<button class="mega-menu-era-tab${i === 0 ? ' active' : ''}" data-era-index="${i}"><span>${era.name}</span></button>`).join('')}
            </div>` : (eras[0] ? `<div class="mega-menu-era-label">${eras[0].name}</div>` : '')}
            <div class="mega-menu-grid">
              ${buildExpansionBadgesHTML(eras[0] ? eras[0].expansions : [], cat.id)}
            </div>
          </div>
        `;
      } else if (cat.menuStyle === 'grid') {
        // ── MEGA-MENÚ EN GRID (ej. expansiones de Pokémon TCG) ──
        contentDiv.className = 'mega-menu';
        contentDiv.innerHTML = `
          <div class="mega-menu-inner">
            <div class="mega-menu-title">${cat.menuTitle || 'Explora por expansión'}</div>
            <div class="mega-menu-subtitle">${cat.menuSubtitle || 'Encuentra las cartas de tu colección favorita'}</div>
            <div class="mega-menu-grid">
              ${buildExpansionBadgesHTML(cat.subcategories, cat.id)}
            </div>
          </div>
        `;
      } else {
        // ── DROPDOWN CLÁSICO EN LISTA ──
        contentDiv.className = 'dropdown-content';
        cat.subcategories.forEach(sub => {
          const subBtn = document.createElement('button');
          subBtn.className = 'subcategory-btn';
          subBtn.dataset.filterType = sub.filterType || '';
          subBtn.dataset.filterValue = sub.filterValue || '';
          subBtn.dataset.categoryId = sub.categoryId || cat.id;
          subBtn.textContent = sub.name;
          contentDiv.appendChild(subBtn);
        });
      }

      dropdownDiv.appendChild(mainDiv);
      dropdownDiv.appendChild(contentDiv);
      nav.appendChild(dropdownDiv);

      // El mega-menú se abre por CSS ":hover" en escritorio, así que el bloqueo
      // de scroll de página se engancha aquí (no hay otro punto JS para detectarlo).
      if (dropdownDiv.classList.contains('dropdown--mega')) {
        dropdownDiv.addEventListener('mouseenter', updatePageScrollLock);
        dropdownDiv.addEventListener('mouseleave', updatePageScrollLock);
      }

      // Eventos para este dropdown
      const closeOtherDropdowns = () => {
        document.querySelectorAll('.dropdown').forEach(d => {
          if (d !== dropdownDiv) d.classList.remove('open');
        });
        updatePageScrollLock();
      };

      // Clic en botón principal: en móvil abre/cierra, en desktop filtra
      mainBtn.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.stopPropagation();
          closeOtherDropdowns();
          dropdownDiv.classList.toggle('open');
          updatePageScrollLock();
        } else {
          applyFilter(cat.id);
          highlightActiveCategory(cat.id);
        }
      });

      // Clic en flecha: siempre abre/cierra (tanto móvil como escritorio)
      toggleSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOtherDropdowns();
        dropdownDiv.classList.toggle('open');
        updatePageScrollLock();
      });

      // Clic en cada opción (subcategoría clásica, badge del mega-menú, o pestaña de era):
      // delegado en el contenedor para que también funcione con contenido que
      // cambia dinámicamente (ej. al cambiar de era en el mega-menú de Cartas).
      contentDiv.addEventListener('click', (e) => {
        const eraTab = e.target.closest('.mega-menu-era-tab');
        if (eraTab) {
          e.stopPropagation();
          const eraIndex = parseInt(eraTab.dataset.eraIndex, 10);
          switchMegaMenuEra(contentDiv, cat, eraIndex);
          return;
        }

        const btn = e.target.closest('.subcategory-btn, .mega-menu-badge');
        if (btn) {
          e.stopPropagation();
          const filterType = btn.dataset.filterType;
          const filterValue = btn.dataset.filterValue;
          // El botón puede apuntar a una categoría distinta a la del menú donde
          // vive (ej. "Accesorios" dentro de TCG, "Funko Pop!" dentro de Figuras)
          const targetCategoryId = btn.dataset.categoryId || cat.id;
          applyFilter(targetCategoryId, filterType, filterValue);
          highlightActiveCategory(cat.id); // resalta el menú que abriste, no el destino
          dropdownDiv.classList.remove('open');
          updatePageScrollLock();
        }
      });
    } else {
      // Categoría SIN subcategorías: botón simple
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.dataset.category = cat.id;
      btn.textContent = cat.name;
      nav.appendChild(btn);

      btn.addEventListener('click', () => {
        applyFilter(cat.id);
        highlightActiveCategory(cat.id);
      });
    }
  });

  // 3. Eventos para los botones fijos (Todos, Ofertas, Novedades)
document.querySelectorAll('.category-btn[data-category="all"], .category-btn[data-category="ofertas"], .category-btn[data-category="novedades"], .category-btn[data-category="encargo"]').forEach(btn => {
    btn.addEventListener('click', () => {
        const categoryId = btn.dataset.category;
        applyFilter(categoryId);
        highlightActiveCategory(categoryId);
    });
});

  // 4. Cerrar dropdowns al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
      updatePageScrollLock();
    }
  });
}

function highlightActiveCategory(categoryId) {
  document.querySelectorAll('.category-btn').forEach(btn => {
    if (btn.dataset.category === categoryId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function applyFilter(categoryId, filterType = null, filterValue = null) {
  currentFilter = { categoryId, filterType, filterValue };

  // Cualquier filtro (Todos, categoría, subcategoría) es "navegar el catálogo":
  // se oculta la vista de inicio y se muestra la grilla de productos.
  if (typeof showCatalogView === 'function') showCatalogView();

  // Si esta categoría tiene banners/videos propios configurados en el admin,
  // reemplazan el carrusel global y el carrusel de destacados.
  if (typeof window.applyCategoryBannerView === 'function') {
    window.applyCategoryBannerView(categoryId);
  }

  let filteredProducts = [...allProducts];

  if (categoryId === 'all') {
  } else if (categoryId === 'encargo') {
    filteredProducts = filteredProducts.filter(p => p.encargo === true);
  } else if (categoryId === 'ofertas') {
    filteredProducts = filteredProducts.filter(p => p.bestSeller === true);
  } else if (categoryId === 'novedades') {
    filteredProducts = filteredProducts.filter(p => p.new === true);
  } else {
    // Categorías "enlace" (ej. Funko Pop! dentro de Figuras, Accesorios
    // dentro de TCG) tienen su PROPIO categoryId, distinto al de la
    // categoría padre donde viven en el menú — así que un producto de Funko
    // nunca tiene categoryId:"figuras", sino categoryId:"funko". Al entrar
    // al tab principal "Figuras" (sin elegir subcategoría) el cliente
    // espera ver TODO lo que vive bajo ese menú, Funko incluido — así que
    // sumamos también los categoryId de esas subcategorías enlazadas.
    const catDef = (typeof allCategories !== 'undefined')
      ? allCategories.find(c => c.id === categoryId)
      : null;
    const linkedCategoryIds = (catDef?.subcategories || [])
      .filter(sub => sub.categoryId)
      .map(sub => sub.categoryId);
    const allowedCategoryIds = [categoryId, ...linkedCategoryIds];
    filteredProducts = filteredProducts.filter(p => allowedCategoryIds.includes(p.categoryId));
  }

  if (filterType && filterValue) {
    filteredProducts = filteredProducts.filter(p => p[filterType] === filterValue);
  }

  renderProducts(filteredProducts);
  scrollToProducts();
  if (typeof refreshAnimations === 'function') refreshAnimations();
}

function scrollToProducts() {
  const productsSection = document.querySelector('.products-section');
  if (productsSection) {
    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

window.filterByStatus = filterByStatus;
window.filterByExpansion = filterByExpansion;
window.highlightNavButton = highlightNavButton;