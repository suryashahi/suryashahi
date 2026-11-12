// ===== Particles Background (Optimized) =====
const canvas = document.getElementById('particlesCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };
let isMobile = window.innerWidth < 768;
let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Respect user's motion preference
if (prefersReducedMotion) {
    // Still init canvas but don't animate
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    // Draw a single static frame
    const staticCount = Math.min(30, Math.floor((canvas.width * canvas.height) / 20000));
    for (let i = 0; i < staticCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2 + 0.5;
        const opacity = Math.random() * 0.3 + 0.05;
        ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
} else {
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        isMobile = window.innerWidth < 768;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * (isMobile ? 0.3 : 0.5);
            this.speedY = (Math.random() - 0.5) * (isMobile ? 0.3 : 0.5);
            this.opacity = Math.random() * 0.5 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Wrap around edges
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;

            // Mouse interaction (disabled on mobile for performance)
            if (!isMobile && mouse.x !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    this.x -= dx * 0.01;
                    this.y -= dy * 0.01;
                }
            }
        }

        draw() {
            ctx.fillStyle = `rgba(16, 185, 129, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        // Fewer particles on mobile, no connection lines
        const baseCount = Math.floor((canvas.width * canvas.height) / 15000);
        const count = isMobile ? Math.min(30, baseCount) : Math.min(80, baseCount);
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        // Skip connection lines entirely on mobile (O(n²) cost)
        if (isMobile) return;

        const len = particles.length;
        for (let i = 0; i < len; i++) {
            const pi = particles[i];
            for (let j = i + 1; j < len; j++) {
                const pj = particles[j];
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 22500) { // 150^2 = 22500 (avoid sqrt)
                    const dist = Math.sqrt(distSq);
                    const opacity = (1 - dist / 150) * 0.15;
                    ctx.strokeStyle = `rgba(16, 185, 129, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(pi.x, pi.y);
                    ctx.lineTo(pj.x, pj.y);
                    ctx.stroke();
                }
            }
        }
    }

    let lastFrame = 0;
    const targetFPS = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFPS;

    function animateParticles(timestamp) {
        // Throttle frame rate on mobile
        if (timestamp - lastFrame < frameInterval) {
            requestAnimationFrame(animateParticles);
            return;
        }
        lastFrame = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        connectParticles();
        requestAnimationFrame(animateParticles);
    }

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Re-init on resize (debounced)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const wasMobile = isMobile;
            resizeCanvas();
            if (wasMobile !== isMobile) {
                initParticles(); // Recreate particles if mobile/desktop switched
            }
        }, 100);
    });

    initParticles();
    requestAnimationFrame(animateParticles);
}