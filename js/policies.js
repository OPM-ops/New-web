// policies.js — Renderiza la página de Políticas a partir de data/policies.json.
// Todo el contenido es editable ahí (texto base para que lo ajustes cuando quieras,
// no reemplaza asesoría legal).

async function loadPolicies() {
    try {
        const response = await fetch('data/policies.json');
        const data = await response.json();
        renderPoliciesHeader(data);
        renderPoliciesNav(data.sections);
        renderPoliciesSections(data.sections);
        setupPoliciesScrollSpy(data.sections);

        if (window.location.hash) {
            const target = document.querySelector(window.location.hash);
            if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        }
    } catch (error) {
        console.error('Error cargando políticas:', error);
    }
}

function renderPoliciesHeader(data) {
    const title = document.getElementById('policiesTitle');
    const subtitle = document.getElementById('policiesSubtitle');
    const updated = document.getElementById('policiesUpdated');

    if (title) title.textContent = data.title || 'Políticas de la Tienda';
    if (subtitle) subtitle.textContent = data.subtitle || '';
    if (updated) updated.textContent = data.lastUpdated ? `Última actualización: ${data.lastUpdated}` : '';

    // Animación de entrada del título (fade + línea que se dibuja debajo)
    if (title) {
        requestAnimationFrame(() => title.classList.add('policies-title-in'));
    }
}

function renderPoliciesNav(sections) {
    const nav = document.getElementById('policiesNav');
    if (!nav || !sections) return;

    nav.innerHTML = sections.map((s, i) => `<a href="#${s.id}" class="policies-nav-link${i === 0 ? ' active' : ''}">${s.title}</a>`).join('');

    nav.querySelectorAll('.policies-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// Resalta en el menú lateral la sección que se está leyendo en este momento:
// la activa queda en negrita/negro, las demás se atenúan en gris.
function setupPoliciesScrollSpy(sections) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            document.querySelectorAll('.policies-nav-link').forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
            });
        });
    }, { rootMargin: '-140px 0px -60% 0px', threshold: 0 });

    sections.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) observer.observe(el);
    });
}

function renderPoliciesSections(sections) {
    const container = document.getElementById('policiesSectionsContainer');
    if (!container || !sections) return;

    container.innerHTML = sections.map(s => `
        <section class="policy-section" id="${s.id}">
            <h2>${s.title}</h2>
            ${(s.paragraphs || []).map(p => `<p>${p}</p>`).join('')}
        </section>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadPolicies();
    if (typeof loadCart === 'function') loadCart();

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
            if (mainNav.classList.contains('open')) closeMenu(); else openMenu();
        });
        overlay.addEventListener('click', closeMenu);
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && mainNav.classList.contains('open')) closeMenu();
        });
    }
});
