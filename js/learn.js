// learn.js — Renderiza páginas de aprendizaje (Jugar / Coleccionar) a partir de un JSON.
// Cada página define window.LEARN_DATA_SOURCE antes de cargar este script
// (por defecto usa data/learn.json). Así Jimmy puede editar títulos, textos
// y videos sin tocar código: solo el JSON correspondiente.

async function loadLearnPage() {
    const dataSource = window.LEARN_DATA_SOURCE || 'data/learn.json';
    try {
        const response = await fetch(dataSource);
        const data = await response.json();
        renderLearnHero(data.hero);
        renderLearnLessons(data.lessons);
        renderLearnClosingCta(data.closingCta);
    } catch (error) {
        console.error('Error cargando contenido de aprendizaje:', error);
    }
}

function renderLearnHero(hero) {
    if (!hero) return;
    const label = document.getElementById('learnHeroLabel');
    const title = document.getElementById('learnHeroTitle');
    const subtitle = document.getElementById('learnHeroSubtitle');
    const cta = document.getElementById('learnHeroCta');
    const img1 = document.getElementById('learnHeroImg1');
    const img2 = document.getElementById('learnHeroImg2');

    if (label) label.textContent = hero.label || '';
    if (title) title.textContent = hero.title || '';
    if (subtitle) subtitle.textContent = hero.subtitle || '';
    if (cta) cta.textContent = hero.ctaText || 'Empieza a aprender';
    if (img1 && hero.image1) img1.src = hero.image1;
    if (img2 && hero.image2) img2.src = hero.image2;
}

function renderLearnLessons(lessons) {
    const container = document.getElementById('learnLessonsContainer');
    if (!container || !lessons) return;

    container.innerHTML = lessons.map((lesson, index) => {
        const reversed = index % 2 === 1; // alterna texto/video en zig-zag
        return `
        <article class="learn-lesson${reversed ? ' learn-lesson--reverse' : ''}" id="${lesson.id || ''}">
            <div class="learn-lesson-text">
                <span class="learn-lesson-number">Lección ${index + 1}</span>
                <h2>${lesson.title || ''}</h2>
                <div class="learn-lesson-body">${lesson.text || ''}</div>
                ${lesson.ctaLink ? `<a href="${lesson.ctaLink}" class="btn btn-primary learn-lesson-btn">${lesson.ctaText || 'Ver más'}</a>` : ''}
            </div>
            <div class="learn-lesson-video">
                ${lesson.youtubeId ? `
                <div class="learn-video-frame">
                    <iframe
                        src="https://www.youtube.com/embed/${lesson.youtubeId}"
                        title="${(lesson.title || '').replace(/"/g, '&quot;')}"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                        loading="lazy"
                        referrerpolicy="strict-origin-when-cross-origin"></iframe>
                </div>` : ''}
            </div>
        </article>`;
    }).join('');
}

function renderLearnClosingCta(cta) {
    if (!cta) return;
    const title = document.getElementById('learnClosingTitle');
    const subtitle = document.getElementById('learnClosingSubtitle');
    const btn = document.getElementById('learnClosingBtn');

    if (title) title.textContent = cta.title || '';
    if (subtitle) subtitle.textContent = cta.subtitle || '';
    if (btn) {
        btn.textContent = cta.buttonText || 'Ver catálogo';
        btn.href = cta.link || 'index.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadLearnPage();

    // Carrito: cargar estado guardado (main.js no se incluye en esta página)
    if (typeof loadCart === 'function') loadCart();

    // Menú hamburguesa (mismo patrón que main.js, para que se vea y funcione igual)
    const hamburger = document.getElementById('hamburgerBtn');
    const mainNav = document.querySelector('.main-nav');
    if (hamburger && mainNav) {
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
        overlay.addEventListener('click', closeMenu);
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && mainNav.classList.contains('open')) {
                closeMenu();
            }
        });
    }
});
