// categories.js - VERSIÓN CORREGIDA Y FUNCIONAL
let allCategories = [];
let currentFilter = { categoryId: 'all', filterType: null, filterValue: null };

async function loadCategories() {
  try {
    const response = await fetch('data/categories.json');
    allCategories = await response.json();
    renderCategories(allCategories);
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

function renderCategories(categories) {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  // 1. Limpiar y agregar botones fijos
  nav.innerHTML = `
    <button class="category-btn active" data-category="all">Todos</button>
    <button class="category-btn" data-category="ofertas">🔥 Ofertas</button>
    <button class="category-btn" data-category="novedades">✨ Novedades</button>
    <button class="category-btn" data-category="encargo">📦 ENCARGO</button>
    <div class="dropdown" id="aprendeDropdown">
      <div class="dropdown-main">
        <a href="aprende.html" class="category-btn nav-link-static">🎓 Aprende</a>
        <span class="dropdown-toggle"><i class="fas fa-chevron-down"></i></span>
      </div>
      <div class="dropdown-content">
        <a href="aprende.html" class="subcategory-btn">🎓 Cómo Jugar</a>
        <a href="coleccionar.html" class="subcategory-btn">📦 Cómo Coleccionar</a>
      </div>
    </div>
  `;

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
    if (cat.subcategories && cat.subcategories.length > 0) {
      // Crear dropdown
      const dropdownDiv = document.createElement('div');
      dropdownDiv.className = 'dropdown';
      if (cat.menuStyle === 'grid') dropdownDiv.classList.add('dropdown--mega');

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

      if (cat.menuStyle === 'grid') {
        // ── MEGA-MENÚ EN GRID (ej. expansiones de Pokémon TCG) ──
        contentDiv.className = 'mega-menu';
        contentDiv.innerHTML = `
          <div class="mega-menu-inner">
            <div class="mega-menu-title">Explora por expansión</div>
            <div class="mega-menu-subtitle">Encuentra las cartas de tu colección favorita</div>
            <div class="mega-menu-grid">
              ${cat.subcategories.map(sub => `
                <button class="mega-menu-badge" data-filter-type="${sub.filterType}" data-filter-value="${sub.filterValue}" data-category-id="${cat.id}">
                  ${sub.image ? `<img src="${sub.image}" alt="${sub.name}" class="mega-menu-badge-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <span class="mega-menu-badge-fallback" style="display:none;">${sub.name}</span>` : `<span class="mega-menu-badge-fallback">${sub.name}</span>`}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        // ── DROPDOWN CLÁSICO EN LISTA ──
        contentDiv.className = 'dropdown-content';
        cat.subcategories.forEach(sub => {
          const subBtn = document.createElement('button');
          subBtn.className = 'subcategory-btn';
          subBtn.dataset.filterType = sub.filterType;
          subBtn.dataset.filterValue = sub.filterValue;
          subBtn.dataset.categoryId = cat.id;
          subBtn.textContent = sub.name;
          contentDiv.appendChild(subBtn);
        });
      }

      dropdownDiv.appendChild(mainDiv);
      dropdownDiv.appendChild(contentDiv);
      nav.appendChild(dropdownDiv);

      // Eventos para este dropdown
      const closeOtherDropdowns = () => {
        document.querySelectorAll('.dropdown').forEach(d => {
          if (d !== dropdownDiv) d.classList.remove('open');
        });
      };

      // Clic en botón principal: en móvil abre/cierra, en desktop filtra
      mainBtn.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.stopPropagation();
          closeOtherDropdowns();
          dropdownDiv.classList.toggle('open');
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
      });

      // Clic en cada opción (subcategoría clásica o badge del mega-menú): aplica filtro y cierra
      contentDiv.querySelectorAll('.subcategory-btn, .mega-menu-badge').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const filterType = btn.dataset.filterType;
          const filterValue = btn.dataset.filterValue;
          applyFilter(cat.id, filterType, filterValue);
          highlightActiveCategory(cat.id);
          dropdownDiv.classList.remove('open');
        });
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
    filteredProducts = filteredProducts.filter(p => p.categoryId === categoryId);
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