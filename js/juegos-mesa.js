// juegos-mesa.js — Renderiza la página "Cómo Jugar" de juegos de mesa
// a partir de data/juegos-mesa.json. Pensada para ir creciendo: cada vez
// que agregues un juego nuevo al catálogo, solo agregas un bloque más al
// array "games" del JSON (nombre, video, pasos) y aparece automático aquí.

async function loadBoardGames() {
    try {
        const response = await fetch('data/juegos-mesa.json');
        const data = await response.json();
        renderGamesHero(data.hero);
        renderGamesSelector(data.games);
        renderGamesList(data.games);

        // Si llegan con un link directo a un juego (ej. desde la ficha del
        // producto), lo mostramos activo y hacemos scroll hasta él
        const initialId = window.location.hash ? window.location.hash.replace('#', '') : (data.games[0] && data.games[0].id);
        if (initialId) {
            showGame(initialId);
            if (window.location.hash) {
                setTimeout(() => {
                    const target = document.querySelector(window.location.hash);
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        }
    } catch (error) {
        console.error('Error cargando guías de juegos de mesa:', error);
    }
}

function renderGamesHero(hero) {
    if (!hero) return;
    const label = document.getElementById('gamesHeroLabel');
    const title = document.getElementById('gamesHeroTitle');
    const subtitle = document.getElementById('gamesHeroSubtitle');

    if (label) label.textContent = hero.label || '';
    if (title) title.textContent = hero.title || '';
    if (subtitle) subtitle.textContent = hero.subtitle || '';
}

// Selector de juegos: como cada vez habrá más (Polilla Tramposa, Cardia, Virus...)
// esto evita una lista infinita de scroll y deja elegir cuál ver.
function renderGamesSelector(games) {
    const container = document.getElementById('gamesSelector');
    if (!container) return;

    if (!games || games.length <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = games.map((game, i) => `
        <button class="game-selector-pill${i === 0 ? ' active' : ''}" data-game-id="${game.id}">${game.name}</button>
    `).join('');

    container.querySelectorAll('.game-selector-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            showGame(pill.dataset.gameId);
            history.replaceState(null, '', `#${pill.dataset.gameId}`);
        });
    });
}

// Muestra solo el juego seleccionado y resalta su pill correspondiente
function showGame(gameId) {
    document.querySelectorAll('.game-card').forEach(card => {
        card.style.display = (card.id === gameId) ? 'block' : 'none';
    });
    document.querySelectorAll('.game-selector-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.gameId === gameId);
    });
}
window.showGame = showGame;

function renderGamesList(games) {
    const container = document.getElementById('gamesListContainer');
    if (!container) return;

    if (!games || games.length === 0) {
        container.innerHTML = `<div class="games-empty">Muy pronto vamos a subir la primera guía. ¡Vuelve pronto!</div>`;
        return;
    }

    container.innerHTML = games.map(game => `
        <article class="game-card" id="${game.id}">
            <div class="game-card-header">
                <div class="game-card-header-text">
                    <h2>${game.name}</h2>
                    <p class="game-tagline">${game.tagline || ''}</p>
                    <div class="game-badges">
                        ${game.players ? `<span class="game-badge"><i class="fas fa-users"></i> ${game.players}</span>` : ''}
                        ${game.duration ? `<span class="game-badge"><i class="fas fa-clock"></i> ${game.duration}</span>` : ''}
                        ${game.age ? `<span class="game-badge"><i class="fas fa-birthday-cake"></i> ${game.age}</span>` : ''}
                    </div>
                    <p class="game-description">${game.description || ''}</p>
                </div>
                ${game.youtubeId ? `
                <div class="game-card-video">
                    <div class="learn-video-frame">
                        <iframe
                            src="https://www.youtube.com/embed/${game.youtubeId}"
                            title="Cómo jugar ${(game.name || '').replace(/"/g, '&quot;')}"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            loading="lazy"
                            referrerpolicy="strict-origin-when-cross-origin"></iframe>
                    </div>
                </div>` : ''}
            </div>

            ${game.steps && game.steps.length ? `
            <div class="game-steps">
                ${game.steps.map((step, i) => `
                    <div class="game-step">
                        <div class="game-step-number">${i + 1}</div>
                        <div class="game-step-body">
                            <h3>${step.title || ''}</h3>
                            <p>${step.text || ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>` : ''}

            <a href="index.html?category=juegos-mesa#productos" class="btn btn-primary game-card-cta">Ver este y otros juegos de mesa</a>
        </article>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadBoardGames();
    if (typeof loadCart === 'function') loadCart();

    // Menú hamburguesa (mismo patrón que las otras páginas de contenido)
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
