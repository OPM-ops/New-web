// animations.js - Animaciones al hacer scroll (VERSIÓN FINAL)
function initScrollAnimations() {
  const cards = document.querySelectorAll('.product-card');
  if (cards.length === 0) return;

  console.log('initScrollAnimations: se encontraron', cards.length, 'tarjetas');

  // 1. Añadir clase animate-in a todas las tarjetas
  cards.forEach(card => {
    card.classList.add('animate-in');
  });

  // 2. Configurar Intersection Observer (más permisivo)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        console.log('Tarjeta visible:', entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 }); // SIN rootMargin – más fiable

  // 3. Observar todas las tarjetas
  cards.forEach(card => observer.observe(card));
}

// Reiniciar animaciones después de filtrar
function refreshAnimations() {
  setTimeout(() => {
    // Eliminar clases viejas y reiniciar
    document.querySelectorAll('.product-card').forEach(card => {
      card.classList.remove('animate-in', 'visible');
    });
    initScrollAnimations();
  }, 150); // tiempo suficiente para que el DOM se actualice
}