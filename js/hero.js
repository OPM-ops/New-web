// hero.js - Carrusel de productos aleatorios
let heroCarouselInterval;
let currentHeroSlide = 0;
let heroProducts = [];

function renderHeroSection() {
    // Se inserta después de "Descubre más universos" (colecciones), no después
    // del banner principal — el orden pedido es: banner -> colecciones -> este.
    const anchor = document.querySelector('.collections-section');
    if (!anchor) return;

    // Solo productos disponibles: nunca destacar algo agotado o "próximamente"
    if (!allProducts || allProducts.length === 0) return;
    const availableProducts = allProducts.filter(p => p.status !== 'agotado' && p.status !== 'proximamente');
    if (availableProducts.length === 0) return;

    // Seleccionar hasta 3 productos aleatorios disponibles (sin repetir)
    const shuffled = [...availableProducts];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    heroProducts = shuffled.slice(0, 3);

    // Generar HTML del carrusel hero
    const heroHTML = `
        <div class="hero-carousel-container">
            <div class="hero-carousel-slides" id="heroCarouselSlides">
                ${heroProducts.map(product => `
                    <div class="hero-carousel-slide">
                        <div class="hero-grid">
                            <div class="hero-image">
                                <img src="${product.images[0]}" 
                                     alt="${product.name}" 
                                     onerror="this.src='images/products/placeholder.jpg';">
                            </div>
                            <div class="hero-content">
                                <span class="hero-label">✨ PRODUCTO DESTACADO</span>
                                <h2 class="hero-title">${product.name}</h2>
                                <p class="hero-description">${product.description.substring(0, 120)}...</p>
                                <p class="hero-price">$${product.price.toLocaleString('es-CO')}</p>
                                <button class="hero-btn btn-primary" data-product-id="${product.id}">
                                    Ver producto
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="hero-prev" id="heroPrevBtn"><i class="fas fa-chevron-left"></i></button>
            <button class="hero-next" id="heroNextBtn"><i class="fas fa-chevron-right"></i></button>
            <div class="hero-dots" id="heroDots"></div>
        </div>
    `;

    // Insertar después del carrusel principal (puedes cambiarlo a la posición que quieras)
    anchor.insertAdjacentHTML('afterend', heroHTML);

    // Generar los dots
    const dotsContainer = document.getElementById('heroDots');
    dotsContainer.innerHTML = heroProducts.map((_, i) => `<span class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');

    // Inicializar eventos del carrusel
    initHeroCarousel();

    // Eventos de los botones "Ver producto"
    document.querySelectorAll('.hero-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.dataset.productId;
            const product = allProducts.find(p => p.id === productId);
            if (product) openProductModal(product);
        });
    });
}

function initHeroCarousel() {
    const slides = document.querySelectorAll('.hero-carousel-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('heroPrevBtn');
    const nextBtn = document.getElementById('heroNextBtn');
    if (!slides.length) return;

    function showSlide(index) {
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;
        currentHeroSlide = index;
        const slidesContainer = document.getElementById('heroCarouselSlides');
        slidesContainer.style.transform = `translateX(-${currentHeroSlide * 100}%)`;
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentHeroSlide);
        });
    }

    prevBtn.addEventListener('click', () => {
        showSlide(currentHeroSlide - 1);
        resetHeroInterval();
    });
    nextBtn.addEventListener('click', () => {
        showSlide(currentHeroSlide + 1);
        resetHeroInterval();
    });
    dots.forEach(dot => {
        dot.addEventListener('click', function() {
            showSlide(parseInt(this.dataset.index));
            resetHeroInterval();
        });
    });

    heroCarouselInterval = setInterval(() => showSlide(currentHeroSlide + 1), 6000);
    function resetHeroInterval() {
        clearInterval(heroCarouselInterval);
        heroCarouselInterval = setInterval(() => showSlide(currentHeroSlide + 1), 6000);
    }
}