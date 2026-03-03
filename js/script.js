// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
    // ===== Cursor Glow + Dot =====
    const cursorGlow = document.getElementById('cursorGlow');
    const cursorDot = document.getElementById('cursorDot');
    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (cursorGlow) {
            cursorGlow.style.left = mouseX + 'px';
            cursorGlow.style.top = mouseY + 'px';
        }
    });

    // Smooth trailing animation for the dot
    function animateDot() {
        dotX += (mouseX - dotX) * 0.15;
        dotY += (mouseY - dotY) * 0.15;
        if (cursorDot) {
            cursorDot.style.left = dotX + 'px';
            cursorDot.style.top = dotY + 'px';
        }
        requestAnimationFrame(animateDot);
    }
    animateDot();

    // Enlarge dot on hovering interactive elements
    const hoverTargets = document.querySelectorAll('a, button, .btn, input, textarea, .collage-photo, .preview-card, .skill-tag, .chatbot-bubble');
    hoverTargets.forEach(el => {
        el.addEventListener('mouseenter', () => cursorDot && cursorDot.classList.add('hovering'));
        el.addEventListener('mouseleave', () => cursorDot && cursorDot.classList.remove('hovering'));
    });

    // ===== Appearance Toggle (Color / B&W) =====
    const appearanceToggle = document.getElementById('appearanceToggle');
    if (appearanceToggle) {
        // Restore saved preference
        if (localStorage.getItem('bwMode') === 'true') {
            document.body.classList.add('bw-mode');
            appearanceToggle.classList.add('bw-active');
        }

        appearanceToggle.addEventListener('click', () => {
            document.body.classList.toggle('bw-mode');
            appearanceToggle.classList.toggle('bw-active');
            const isActive = document.body.classList.contains('bw-mode');
            localStorage.setItem('bwMode', isActive);
        });
    }

    // ===== Navbar Scroll Effect =====
    const navbar = document.getElementById('navbar');
    const handleNavScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleNavScroll);
    handleNavScroll();

    // ===== Hamburger Menu =====
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // ===== Scroll Reveal Animations =====
    const revealElements = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ===== Counter Animation =====
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'));
                animateCounter(el, target);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => counterObserver.observe(el));

    function animateCounter(el, target) {
        let current = 0;
        const increment = target / 40;
        const duration = 1500;
        const stepTime = duration / 40;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = Math.floor(current);
        }, stepTime);
    }

    // ===== Active Nav Link Highlighting =====
    const sections = document.querySelectorAll('section[id]');

    const navHighlightObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}` ||
                        (id === 'home' && link.getAttribute('href') === 'index.html')) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-80px 0px -50% 0px'
    });

    sections.forEach(section => navHighlightObserver.observe(section));

    // ===== Smooth Scroll for Anchor Links =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ===== Tilt Effect on Hero Image =====
    const imageWrapper = document.querySelector('.image-wrapper');
    if (imageWrapper) {
        const heroImage = document.querySelector('.hero-image');
        heroImage.addEventListener('mousemove', (e) => {
            const rect = heroImage.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            imageWrapper.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        heroImage.addEventListener('mouseleave', () => {
            imageWrapper.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            imageWrapper.style.transition = 'transform 0.5s ease';
        });

        heroImage.addEventListener('mouseenter', () => {
            imageWrapper.style.transition = 'none';
        });
    }

    // ===== Page Transition Effect =====
    document.querySelectorAll('a:not([href^="#"]):not([href^="mailto"])').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            });
        }
    });

    // Page load fade in
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    });

    // ===== Stagger animation for project cards =====
    const projectCards = document.querySelectorAll('.project-card');
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    projectCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        cardObserver.observe(card);
    });

    // ===== Skill tags hover ripple =====
    document.querySelectorAll('.skill-tag').forEach(tag => {
        tag.addEventListener('mouseenter', function () {
            this.style.transform = 'scale(1.05)';
        });
        tag.addEventListener('mouseleave', function () {
            this.style.transform = 'scale(1)';
        });
    });

    // ===== Timeline animation =====
    const timelineItems = document.querySelectorAll('.timeline-item');
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
                timelineObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    timelineItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-30px)';
        item.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        timelineObserver.observe(item);
    });
});
