// announcement.js — Barra de anuncios rotativa arriba del header
// (inspirada en tiendas tipo "Pre-order X now!"). Editable desde el admin,
// vive en data/announcement.json.

let allAnnouncement = { active: true, messages: [] };
let announcementMessages = [];
let announcementIndex = 0;
let announcementInterval = null;

async function loadAnnouncementBar() {
    const container = document.getElementById('announcementBar');
    if (!container) return;

    try {
        const res = await fetch('data/announcement.json');
        allAnnouncement = await res.json();
    } catch (error) {
        console.warn('No se pudo cargar announcement.json:', error);
        container.style.display = 'none';
        return;
    }

    if (!allAnnouncement.active || !allAnnouncement.messages || allAnnouncement.messages.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    renderAnnouncementBar(allAnnouncement.messages);
}

function renderAnnouncementBar(messages) {
    announcementMessages = messages;
    const container = document.getElementById('announcementBar');
    if (!container) return;

    container.innerHTML = `
        <button class="announcement-nav prev" aria-label="Anuncio anterior"><i class="fas fa-chevron-left"></i></button>
        <div class="announcement-text" id="announcementText"></div>
        <button class="announcement-nav next" aria-label="Siguiente anuncio"><i class="fas fa-chevron-right"></i></button>
    `;

    showAnnouncementSlide(0);

    container.querySelector('.prev').addEventListener('click', () => {
        showAnnouncementSlide(announcementIndex - 1);
        resetAnnouncementInterval();
    });
    container.querySelector('.next').addEventListener('click', () => {
        showAnnouncementSlide(announcementIndex + 1);
        resetAnnouncementInterval();
    });

    resetAnnouncementInterval();
}

function showAnnouncementSlide(i) {
    if (!announcementMessages.length) return;
    if (i < 0) i = announcementMessages.length - 1;
    if (i >= announcementMessages.length) i = 0;
    announcementIndex = i;

    const msg = announcementMessages[i];
    const textEl = document.getElementById('announcementText');
    if (!textEl) return;

    if (msg.link) {
        textEl.innerHTML = `<a href="${msg.link}">${msg.text} <i class="fas fa-arrow-right"></i></a>`;
    } else {
        textEl.textContent = msg.text;
    }
}

function resetAnnouncementInterval() {
    clearInterval(announcementInterval);
    if (announcementMessages.length > 1) {
        announcementInterval = setInterval(() => showAnnouncementSlide(announcementIndex + 1), 5000);
    }
}

document.addEventListener('DOMContentLoaded', loadAnnouncementBar);
