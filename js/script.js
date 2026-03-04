// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {

    // ===== Preloader =====
    const preloader = document.getElementById('preloader');

    // Typing animation for preloader
    const typedEl = document.getElementById('preloader-typed');
    if (typedEl) {
        const name = 'Surya';
        let i = 0;
        const typeInterval = setInterval(() => {
            typedEl.textContent += name[i];
            i++;
            if (i >= name.length) clearInterval(typeInterval);
        }, 200);
    }
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (preloader) preloader.classList.add('hidden');
        }, 2000);
    });
    // Fallback: hide preloader after 4s even if load event doesn't fire
    setTimeout(() => {
        if (preloader && !preloader.classList.contains('hidden')) {
            preloader.classList.add('hidden');
        }
    }, 4000);

    // ===== Scroll Progress Bar =====
    const scrollProgress = document.getElementById('scrollProgress');
    window.addEventListener('scroll', () => {
        if (scrollProgress) {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            scrollProgress.style.width = scrollPercent + '%';
        }
    });

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
    const hoverTargets = document.querySelectorAll('a, button, .btn, input, textarea, .collage-photo, .preview-card, .skill-tag, .chatbot-bubble, .blog-card, .testimonial-btn');
    hoverTargets.forEach(el => {
        el.addEventListener('mouseenter', () => cursorDot && cursorDot.classList.add('hovering'));
        el.addEventListener('mouseleave', () => cursorDot && cursorDot.classList.remove('hovering'));
    });

    // ===== Cursor Trail Canvas =====
    const cursorTrailCanvas = document.getElementById('cursorTrail');
    if (cursorTrailCanvas && window.innerWidth > 768) {
        const ctx = cursorTrailCanvas.getContext('2d');
        cursorTrailCanvas.width = window.innerWidth;
        cursorTrailCanvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            cursorTrailCanvas.width = window.innerWidth;
            cursorTrailCanvas.height = window.innerHeight;
        });

        const particles = [];
        const maxParticles = 30;

        document.addEventListener('mousemove', (e) => {
            for (let i = 0; i < 2; i++) {
                particles.push({
                    x: e.clientX,
                    y: e.clientY,
                    size: Math.random() * 4 + 2,
                    speedX: (Math.random() - 0.5) * 1.5,
                    speedY: (Math.random() - 0.5) * 1.5,
                    life: 1,
                    color: `hsla(${260 + Math.random() * 40}, 80%, 70%, `
                });
            }
            if (particles.length > maxParticles) {
                particles.splice(0, particles.length - maxParticles);
            }
        });

        function animateTrail() {
            ctx.clearRect(0, 0, cursorTrailCanvas.width, cursorTrailCanvas.height);
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.speedX;
                p.y += p.speedY;
                p.life -= 0.025;
                p.size *= 0.98;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.life + ')';
                ctx.fill();
            }
            requestAnimationFrame(animateTrail);
        }
        animateTrail();
    }

    // ===== Light/Dark Mode Toggle (replacing B&W) =====
    const appearanceToggle = document.getElementById('appearanceToggle');
    if (appearanceToggle) {
        const toggleIcon = appearanceToggle.querySelector('i');

        // Restore saved preference
        if (localStorage.getItem('lightMode') === 'true') {
            document.body.classList.add('light-mode');
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-moon');
                toggleIcon.classList.add('fa-sun');
            }
        }

        appearanceToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            // Remove old B&W mode if present
            document.body.classList.remove('bw-mode');

            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('lightMode', isLight);
            localStorage.removeItem('bwMode');

            if (toggleIcon) {
                if (isLight) {
                    toggleIcon.classList.remove('fa-moon');
                    toggleIcon.classList.add('fa-sun');
                } else {
                    toggleIcon.classList.remove('fa-sun');
                    toggleIcon.classList.add('fa-moon');
                }
            }
        });
    }

    // ===== Navbar Scroll Effect =====
    const navbar = document.getElementById('navbar');
    const toggleBtn = document.getElementById('appearanceToggle');
    const handleNavScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
            if (toggleBtn) toggleBtn.style.top = '14px';
        } else {
            navbar.classList.remove('scrolled');
            if (toggleBtn) toggleBtn.style.top = '18px';
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

    // ===== Typewriter Effect =====
    const typewriterEl = document.getElementById('typewriter');
    if (typewriterEl) {
        const roles = ['Full Stack Developer', 'AI Enthusiast', 'Problem Solver', 'Creative Coder', 'Tech Explorer'];
        let roleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingSpeed = 100;

        function typeWriter() {
            const currentRole = roles[roleIndex];

            if (isDeleting) {
                typewriterEl.textContent = currentRole.substring(0, charIndex - 1);
                charIndex--;
                typingSpeed = 50;
            } else {
                typewriterEl.textContent = currentRole.substring(0, charIndex + 1);
                charIndex++;
                typingSpeed = 100;
            }

            if (!isDeleting && charIndex === currentRole.length) {
                typingSpeed = 2000; // Pause at end
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                typingSpeed = 500; // Pause before next word
            }

            setTimeout(typeWriter, typingSpeed);
        }
        typeWriter();
    }

    // ===== GSAP ScrollTrigger Animations =====
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Animate reveal-up elements with GSAP (skip testimonials & blog — they use CSS visibility)
        gsap.utils.toArray('.reveal-up').forEach(el => {
            if (el.closest('.testimonials') || el.closest('.blog')) return;
            gsap.from(el, {
                y: 60,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    end: 'top 50%',
                    toggleActions: 'play none none none'
                }
            });
        });

        // Animate reveal-left
        gsap.utils.toArray('.reveal-left').forEach(el => {
            gsap.from(el, {
                x: -80,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        });

        // Animate reveal-right
        gsap.utils.toArray('.reveal-right').forEach(el => {
            gsap.from(el, {
                x: 80,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        });

        // Stagger animate preview cards
        gsap.utils.toArray('.preview-card, .blog-card').forEach((card, i) => {
            gsap.from(card, {
                y: 50,
                opacity: 0,
                duration: 0.8,
                delay: i * 0.15,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 88%',
                    toggleActions: 'play none none none'
                }
            });
        });

        // Hero section entrance
        const heroTitle = document.querySelector('.hero-title');
        const heroTagline = document.querySelector('.hero-tagline');
        const heroCta = document.querySelector('.hero-cta');
        const heroImage = document.querySelector('.hero-image');

        if (heroTitle) {
            gsap.from(heroTitle, { y: 40, opacity: 0, duration: 1, delay: 2.2, ease: 'power3.out' });
        }
        if (heroTagline) {
            gsap.from(heroTagline, { y: 30, opacity: 0, duration: 1, delay: 2.5, ease: 'power3.out' });
        }
        if (heroCta) {
            gsap.from(heroCta, { y: 30, opacity: 0, duration: 1, delay: 2.8, ease: 'power3.out' });
        }
        if (heroImage) {
            gsap.from(heroImage, { scale: 0.8, opacity: 0, duration: 1.2, delay: 2.4, ease: 'back.out(1.5)' });
        }

        // Section titles parallax
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.from(title, {
                y: 30,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: title,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        });
    }

    // ===== Scroll Reveal Animations (CSS fallback) =====
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
    const navDots = document.querySelectorAll('.section-nav-dots .dot-link');

    const navHighlightObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                // Update nav links
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}` ||
                        (id === 'home' && link.getAttribute('href') === 'index.html')) {
                        link.classList.add('active');
                    }
                });

                // Update nav dots
                navDots.forEach(dot => {
                    dot.classList.remove('active');
                    if (dot.getAttribute('data-section') === id) {
                        dot.classList.add('active');
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

    // ===== 3D Tilt Effect on Cards =====
    const tiltCards = document.querySelectorAll('.tilt-card, .preview-card, .about-image-card');
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            card.style.transition = 'transform 0.5s ease';
        });

        card.addEventListener('mouseenter', () => {
            card.style.transition = 'none';
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

    // ===== Button Ripple Effect =====
    document.querySelectorAll('.btn, .cta-btn, .ripple-btn, .testimonial-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // ===== Magnetic Buttons =====
    if (window.innerWidth > 768) {
        document.querySelectorAll('.magnetic-btn, .cta-btn').forEach(btn => {
            btn.addEventListener('mousemove', function (e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                this.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });

            btn.addEventListener('mouseleave', function () {
                this.style.transform = 'translate(0, 0)';
            });
        });
    }

    // ===== Testimonials Slider =====
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const tDots = document.querySelectorAll('.t-dot');
    const prevBtn = document.getElementById('prevTestimonial');
    const nextBtn = document.getElementById('nextTestimonial');
    let currentTestimonial = 0;

    function showTestimonial(index) {
        testimonialCards.forEach((card, i) => {
            card.classList.remove('active', 'exit-left');
            if (i === index) {
                card.classList.add('active');
            }
        });
        tDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentTestimonial = index;
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const prev = (currentTestimonial - 1 + testimonialCards.length) % testimonialCards.length;
            showTestimonial(prev);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const next = (currentTestimonial + 1) % testimonialCards.length;
            showTestimonial(next);
        });
    }
    tDots.forEach((dot, i) => {
        dot.addEventListener('click', () => showTestimonial(i));
    });

    // Auto-rotate testimonials
    if (testimonialCards.length > 0) {
        setInterval(() => {
            const next = (currentTestimonial + 1) % testimonialCards.length;
            showTestimonial(next);
        }, 6000);
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

    // ===== Fullpage Section In-View Observer =====
    const fullpageSections = document.querySelectorAll('.fullpage-section');

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px'
    });

    fullpageSections.forEach(section => {
        sectionObserver.observe(section);
    });

    // Mark the first section as in-view immediately
    const firstSection = document.querySelector('.fullpage-section');
    if (firstSection) {
        firstSection.classList.add('in-view');
    }

    // ===== Smooth scroll for nav dots =====
    document.querySelectorAll('.dot-link').forEach(dot => {
        dot.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ===== Scroll to section on page load if URL has a hash =====
    if (window.location.hash) {
        const targetSection = document.querySelector(window.location.hash);
        if (targetSection) {
            // Small delay to let the page fully render before scrolling
            setTimeout(() => {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 400);
        }
    }
});
