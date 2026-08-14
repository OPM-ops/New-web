// particles.js - Fondo animado con partículas (circuitos/estrellas)
let particlesCanvas, ctx, particles = [];
let mouseX = 0, mouseY = 0;

function initParticles() {
  particlesCanvas = document.createElement('canvas');
  particlesCanvas.id = 'particles-canvas';
  particlesCanvas.style.position = 'fixed';
  particlesCanvas.style.top = '0';
  particlesCanvas.style.left = '0';
  particlesCanvas.style.width = '100%';
  particlesCanvas.style.height = '100%';
  particlesCanvas.style.pointerEvents = 'none';
  particlesCanvas.style.zIndex = '-1';
  particlesCanvas.style.opacity = '0.5'; // Muy sutil
  document.body.prepend(particlesCanvas);

  ctx = particlesCanvas.getContext('2d');
  
  // Escuchar movimiento del mouse (opcional, para interactividad)
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  createParticles(80); // número de partículas
  animateParticles();
}

function resizeCanvas() {
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}

function createParticles(count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * particlesCanvas.width,
      y: Math.random() * particlesCanvas.height,
      radius: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: (Math.random() - 0.5) * 0.2,
      color: `rgba(95, 61, 199, ${Math.random() * 0.3 + 0.1})`, // tono morado
    });
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
  
  particles.forEach(p => {
    // Movimiento
    p.x += p.speedX;
    p.y += p.speedY;
    
    // Rebote en bordes
    if (p.x < 0 || p.x > particlesCanvas.width) p.speedX *= -1;
    if (p.y < 0 || p.y > particlesCanvas.height) p.speedY *= -1;
    
    // Dibujar
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    // Pequeño brillo
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(95,61,199,0.5)';
  });
  
  requestAnimationFrame(animateParticles);
}

// Iniciar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', initParticles);