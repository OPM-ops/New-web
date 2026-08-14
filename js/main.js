let allBanners = [];
let currentCarouselBanners = []; // banners realmente renderizados en este momento (globales o de categoría)
let currentSlide = 0;
let slideInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    renderRandomRecommendations(4);
    renderHeroSection();
    await loadCategories();     
    await loadCarousel();
    loadCart();
    setupFooterLinks();
    setupSearch();
    applyDeepLinkFromURL();

    // ========== MENÚ HAMBURGUESA ==========
    const hamburger = document.getElementById('hamburgerBtn');
    const mainNav = document.querySelector('.main-nav');

    if (!hamburger) {
        console.error('❌ Botón hamburguesa no encontrado');
        return;
    }
    if (!mainNav) {
        console.error('❌ Navegación .main-nav no encontrada');
        return;
    }

    // Crear overlay si no existe
    let overlay = document.querySelector('.nav-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);
    }

    function closeMenu() {
        hamburger.classList.remove('open');
        mainNav.classList.remove('open');
        overlay.classList.remove('open');
    }

    function openMenu() {
        hamburger.classList.add('open');
        mainNav.classList.add('open');
        overlay.classList.add('open');
    }

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mainNav.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Cerrar al hacer clic en overlay
    overlay.addEventListener('click', closeMenu);

    // Al redimensionar, si se pasa a escritorio, cerrar menú
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mainNav.classList.contains('open')) {
            closeMenu();
        }
    });
});

// ========== FUNCIONES ==========

// Mostrar productos aleatorios en la sección de recomendaciones
function renderRandomRecommendations(count = 4) {
    const container = document.getElementById('recommendationsGrid');
    if (!container) {
        console.warn('No se encontró el contenedor #recommendationsGrid');
        return;
    }
    if (!allProducts || allProducts.length === 0) return;

    // Copiar y mezclar el array de productos
    let shuffled = [...allProducts];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, count);

    // Generar HTML
    container.innerHTML = selected.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            <img src="${product.images && product.images[0] ? product.images[0] : 'images/products/placeholder.jpg'}" 
                 alt="${product.name}" 
                 class="product-img" 
                 loading="lazy"
                 onerror="this.src='images/products/placeholder.jpg';">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-category">${product.category}</p>
                <p class="product-price">
                    ${product.originalPrice ? `<span class="old-price">$${product.originalPrice.toLocaleString('es-CO')}</span>` : ''}
                    <span class="current-price">$${product.price.toLocaleString('es-CO')}</span>
                </p>
                <button class="quick-view-btn" data-product-id="${product.id}">Vista rápida</button>
            </div>
        </div>
    `).join('');

    // Reutilizar eventos de apertura de modal y vista rápida
    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-view-btn')) return;
            const productId = card.dataset.productId;
            const product = allProducts.find(p => p.id === productId);
            if (product) openProductModal(product);
        });
    });
    container.querySelectorAll('.quick-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.dataset.productId;
            const product = allProducts.find(p => p.id === productId);
            if (product) openQuickView(product);
        });
    });
}

// Cargar banners del carrusel
async function loadCarousel() {
    try {
        const response = await fetch('data/banners.json');
        const banners = await response.json();
        allBanners = banners;
        // Pintado inicial: vista "all" (banners globales + destacados)
        applyCategoryBannerView('all');
    } catch (error) {
        console.error('Error cargando banners:', error);
    }
}

// Construye el HTML del medio (video/YouTube) de una slide.
// Si el banner es tipo "image" (o no tiene mediaType), no devuelve nada
// porque la imagen se pone como background-image en la propia slide.
function buildBannerMediaHTML(banner) {
    if (banner.mediaType === 'video' && banner.video) {
        return `<video class="carousel-media" autoplay muted loop playsinline preload="metadata">
            <source src="${banner.video}" type="video/mp4">
        </video>`;
    }
    if (banner.mediaType === 'youtube' && banner.youtubeId) {
        const yid = banner.youtubeId;
        return `<div class="carousel-media carousel-media--youtube">
            <iframe src="https://www.youtube.com/embed/${yid}?autoplay=1&mute=1&loop=1&playlist=${yid}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0"
                    title="${(banner.title || '').replace(/"/g, '&quot;')}"
                    allow="autoplay; encrypted-media"
                    referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>`;
    }
    return '';
}

// Renderiza el carrusel principal con un set de banners dado.
// Soporta imagen, video local y YouTube, todos con el mismo tamaño
// fijo del carrusel (definido en CSS), así se ve igual en PC y en móvil.
function renderCarousel(banners) {
    const container = document.getElementById('carouselContainer');
    const dotsContainer = document.getElementById('carouselDots');
    if (!container || !dotsContainer) return;

    if (!banners || banners.length === 0) {
        container.innerHTML = '';
        dotsContainer.innerHTML = '';
        return;
    }

    container.innerHTML = banners.map((banner, index) => {
        const isMedia = banner.mediaType === 'video' || banner.mediaType === 'youtube';

        if (isMedia) {
            // Layout dividido: texto a la izquierda, video contenido en su propio
            // marco 16:9 a la derecha. Así evitamos las franjas negras que salen
            // cuando se intenta estirar un video 16:9 a lo ancho de todo el banner.
            return `
            <div class="carousel-slide carousel-slide--split"
                 data-index="${index}"
                 data-filter-type="${banner.filterType || ''}" 
                 data-filter-value="${banner.filterValue !== undefined ? banner.filterValue : ''}"
                 data-category-id="${banner.categoryId || ''}">
                <div class="carousel-split-text">
                    <h3>${banner.title || ''}</h3>
                    <p>${banner.subtitle || ''}</p>
                    ${banner.link ? `<a href="${banner.link}" class="btn-carousel" 
                       ${banner.link.startsWith('http') ? 'target="_blank"' : ''}
                       onclick="handleBannerClick(event, ${index})">
                       ${banner.buttonText || 'Ver más'}
                    </a>` : ''}
                </div>
                <div class="carousel-split-media">
                    <div class="carousel-video-frame">
                        ${buildBannerMediaHTML(banner)}
                    </div>
                </div>
            </div>`;
        }

        return `
        <div class="carousel-slide" style="background-image: url('${banner.image || ''}');"
             data-index="${index}"
             data-filter-type="${banner.filterType || ''}" 
             data-filter-value="${banner.filterValue !== undefined ? banner.filterValue : ''}"
             data-category-id="${banner.categoryId || ''}">
            <div class="carousel-content">
                <h3>${banner.title || ''}</h3>
                <p>${banner.subtitle || ''}</p>
                ${banner.link ? `<a href="${banner.link}" class="btn-carousel" 
                   ${banner.link.startsWith('http') ? 'target="_blank"' : ''}
                   onclick="handleBannerClick(event, ${index})">
                   ${banner.buttonText || 'Ver más'}
                </a>` : ''}
            </div>
        </div>
    `;
    }).join('');

    dotsContainer.innerHTML = banners.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');

    // Añadir event listener a toda la slide (no solo al botón)
    document.querySelectorAll('.carousel-slide').forEach((slide, index) => {
        slide.addEventListener('click', (e) => {
            // Si el click fue en el botón, ya se maneja con el onclick
            if (e.target.closest('.btn-carousel')) return;
            handleBannerClick(e, index);
        });
    });
}

// Nueva función para manejar clicks en banners
function handleBannerClick(e, index) {
    const banner = currentCarouselBanners[index];
    if (!banner) return;

    // Si tiene filtro definido, aplicarlo
    if (banner.filterType && banner.filterValue !== undefined && banner.filterValue !== '') {
        e.preventDefault();
        applyBannerFilter(banner);
    }
    // Si no tiene filtro, dejar que el link funcione normalmente
}

// ─────────────────────────────────────────────
// BANNERS/VIDEOS POR CATEGORÍA
// ─────────────────────────────────────────────
// Cuando el usuario entra a una categoría (ej. "cartas") que tiene banners
// configurados como "scope: category" con "targetCategory" igual a esa
// categoría, se muestran ESOS banners/videos en vez del carrusel global
// y del carrusel de productos destacados (hero.js). Si la categoría no
// tiene banners propios, se restaura el comportamiento normal.
function applyCategoryBannerView(categoryId) {
    if (!allBanners) return;

    const heroContainer = document.querySelector('.hero-carousel-container');
    const carouselSection = document.querySelector('.carousel-section');

    const categoryBanners = allBanners.filter(b => b.scope === 'category' && b.targetCategory === categoryId);

    if (categoryBanners.length > 0) {
        // Vista específica de categoría: se ocultan destacados, se muestran solo estos banners/videos
        currentCarouselBanners = categoryBanners;
        if (heroContainer) heroContainer.style.display = 'none';
    } else {
        // Vista por defecto: banners globales + destacados
        currentCarouselBanners = allBanners.filter(b => !b.scope || b.scope === 'global');
        if (heroContainer) heroContainer.style.display = '';
    }

    if (carouselSection) {
        carouselSection.style.display = currentCarouselBanners.length > 0 ? '' : 'none';
    }

    if (currentCarouselBanners.length > 0) {
        renderCarousel(currentCarouselBanners);
        initCarousel();
    } else {
        renderCarousel([]);
    }
}
window.applyCategoryBannerView = applyCategoryBannerView;

function applyBannerFilter(banner) {
    // Scroll a productos
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Aplicar filtro según el tipo
    switch(banner.filterType) {
        case 'bestSeller':
            window.applyFilter('ofertas');
            highlightNavButton('ofertas');
            break;

        case 'new':
            window.applyFilter('novedades');
            highlightNavButton('novedades');
            break;

        case 'status':
            if (banner.filterValue === 'preventa') {
                filterByStatus('preventa');
            } else if (banner.filterValue === 'agotado') {
                filterByStatus('agotado');
            } else if (banner.filterValue === 'disponible') {
                filterByStatus('disponible');
            } else if (banner.filterValue === 'proximamente') {
                filterByStatus('proximamente');
            }
            break;

        case 'categoryId':
            window.applyFilter(banner.filterValue);
            highlightNavButton(banner.filterValue);
            break;

        case 'expansion':
            filterByExpansion(banner.filterValue, banner.categoryId || 'pokemon');
            break;

        case 'encargo':
            window.applyFilter('encargo');
            highlightNavButton('encargo');
            break;

        default:
            console.warn('Tipo de filtro no reconocido:', banner.filterType);
    }
}

// Función auxiliar para resaltar botón en navegación
function highlightNavButton(categoryId) {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === categoryId) {
            btn.classList.add('active');
        }
    });
}

// Filtrar por estado (preventa, agotado, etc.)
function filterByStatus(status) {
    let filtered = allProducts.filter(p => p.status === status);
    renderProducts(filtered);

    // Actualizar UI de navegación
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));

    // Mostrar toast con info
    const statusLabels = {
        'preventa': 'Preventas',
        'agotado': 'Productos agotados',
        'disponible': 'Disponibles',
        'proximamente': 'Próximamente'
    };
    if (typeof showToast === 'function') {
        showToast(`Mostrando: ${statusLabels[status] || status}`);
    }
}

// Filtrar por expansión (para subcategorías de Pokémon)
function filterByExpansion(expansionName, categoryId = 'pokemon') {
    let filtered = allProducts.filter(p => 
        p.categoryId === categoryId && p.expansion === expansionName
    );
    renderProducts(filtered);

    // Resaltar categoría padre
    highlightNavButton(categoryId);

    // Abrir dropdown si existe
    const dropdown = document.querySelector(`.dropdown .category-btn[data-category="${categoryId}"]`)?.closest('.dropdown');
    if (dropdown) {
        dropdown.classList.add('open');
        // Resaltar subcategoría activa
        dropdown.querySelectorAll('.subcategory-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filterValue === expansionName) {
                btn.classList.add('active');
            }
        });
    }

    if (typeof showToast === 'function') {
        showToast(`Mostrando: ${expansionName}`);
    }
}

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const container = document.querySelector('.carousel-container');

    if (!slides.length || !container) return;

    // CORRECCIÓN: Resetear currentSlide a 0 al inicializar
    currentSlide = 0;

    // CORRECCIÓN: Asegurar que el transform esté en la posición inicial
    container.style.transform = 'translateX(0%)';

    // Resetear dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === 0);
    });

    function showSlide(index) {
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;
        currentSlide = index;
        container.style.transform = `translateX(-${currentSlide * 100}%)`;
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    }

    // CORRECCIÓN: Remover listeners anteriores para evitar duplicados
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

    newPrevBtn.addEventListener('click', () => {
        showSlide(currentSlide - 1);
        resetInterval();
    });

    newNextBtn.addEventListener('click', () => {
        showSlide(currentSlide + 1);
        resetInterval();
    });

    // CORRECCIÓN: Clonar y reemplazar dots para evitar listeners duplicados
    const dotsContainer = document.getElementById('carouselDots');
    const newDotsContainer = dotsContainer.cloneNode(true);
    dotsContainer.parentNode.replaceChild(newDotsContainer, dotsContainer);

    newDotsContainer.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', function() {
            showSlide(parseInt(this.dataset.index));
            resetInterval();
        });
    });

    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(() => showSlide(currentSlide + 1), 5000);

    function resetInterval() {
        if (slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(() => showSlide(currentSlide + 1), 5000);
    }
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');
    if (!input) return;

    function doSearch() {
        const query = input.value.trim().toLowerCase();
        if (!query) {
            renderProducts(allProducts);
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            const allBtn = document.querySelector('.category-btn[data-category="all"]');
            if (allBtn) allBtn.classList.add('active');
            return;
        }
        const results = allProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.category && p.category.toLowerCase().includes(query)) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        renderProducts(results);
        const productsSection = document.querySelector('.products-section');
        if (productsSection) productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
    });
    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(doSearch, 300);
    });
}

// ─────────────────────────────────────────────
// DEEP LINKING: permite que otras páginas (ej. aprende.html) manden
// al usuario directo a la tienda con un filtro o búsqueda ya aplicada.
// Ejemplos de URL:
//   index.html?search=deck#productos
//   index.html?category=cartas#productos
//   index.html?category=cartas&filterType=cardType&filterValue=ilustracion_raras#productos
//   index.html?category=pokemon#productos
// ─────────────────────────────────────────────
function applyDeepLinkFromURL() {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    const category = params.get('category');
    const filterType = params.get('filterType');
    const filterValue = params.get('filterValue');

    if (search) {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = search;
            input.dispatchEvent(new Event('input'));
        }
        return;
    }

    if (category) {
        if (typeof applyFilter === 'function') {
            applyFilter(category, filterType || null, filterValue || null);
        }
        if (typeof highlightActiveCategory === 'function') {
            highlightActiveCategory(category);
        }
    }
}

function setupFooterLinks() {
    const productosLink = document.getElementById('footer-productos-link');
    if (productosLink) {
        productosLink.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = document.querySelector('.main-nav');
            if (nav) {
                nav.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.category === 'all') {
                        btn.classList.add('active');
                    }
                });
            }
            if (typeof window.applyFilter === 'function') {
                window.applyFilter('all');
            }
        });
    }
    const ofertasLink = document.getElementById('footer-ofertas-link');
    if (ofertasLink) {
        ofertasLink.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = document.querySelector('.main-nav');
            if (nav) {
                nav.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.category === 'ofertas') {
                        btn.classList.add('active');
                    }
                });
            }
            if (typeof window.applyFilter === 'function') {
                window.applyFilter('ofertas');
            }
        });
    }
    const novedadesLink = document.getElementById('footer-novedades-link');
    if (novedadesLink) {
        novedadesLink.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = document.querySelector('.main-nav');
            if (nav) {
                nav.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.category === 'novedades') {
                        btn.classList.add('active');
                    }
                });
            }
            if (typeof window.applyFilter === 'function') {
                window.applyFilter('novedades');
            }
        });
    }
    const contactoLink = document.getElementById('footer-contacto-link');
    if (contactoLink) {
        contactoLink.addEventListener('click', (e) => {
            e.preventDefault();
            const footer = document.querySelector('.site-footer');
            if (footer) {
                footer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}