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

    // ===== Resume Viewer Modal (PDF.js) =====
    const resumeModal = document.getElementById('resumeModal');
    const resumeModalClose = document.getElementById('resumeModalClose');
    const viewResumeBtn = document.getElementById('viewResumeBtn');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const pdfLoading = document.getElementById('pdfLoading');
    const pdfError = document.getElementById('pdfError');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomInBtn = document.getElementById('zoomIn');
    const pageInfo = document.getElementById('pageInfo');
    const zoomLevel = document.getElementById('zoomLevel');

    let pdfDoc = null;
    let currentPage = 1;
    let currentScale = 1.0;
    let isLoading = false;

    // Load PDF.js from CDN
    function loadPDFJS() {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
            script.type = 'module';
            script.onload = () => {
                // pdfjsLib is available as global
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.head.appendChild(script);
        });
    }

    async function openResumeModal() {
        if (isLoading) return;
        if (!resumeModal) return;

        resumeModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        pdfLoading.style.display = 'flex';
        pdfError.style.display = 'none';
        pdfCanvas.style.display = 'none';

        try {
            await loadPDFJS();
            const pdfUrl = 'surya-shahi-resume-20260529.pdf';
            pdfDoc = await window.pdfjsLib.getDocument(pdfUrl).promise;
            currentPage = 1;
            currentScale = 1.0;
            await renderPage(currentPage);
        } catch (err) {
            console.error('PDF load error:', err);
            pdfLoading.style.display = 'none';
            pdfError.style.display = 'block';
        }
    }

    async function renderPage(pageNum) {
        if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return;

        isLoading = true;
        pdfLoading.style.display = 'flex';
        pdfCanvas.style.display = 'none';

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale });

            const canvas = pdfCanvas;
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            currentPage = pageNum;
            updateToolbar();
            pdfLoading.style.display = 'none';
            pdfCanvas.style.display = 'block';
        } catch (err) {
            console.error('Page render error:', err);
            pdfLoading.style.display = 'none';
            pdfError.style.display = 'block';
        } finally {
            isLoading = false;
        }
    }

    function updateToolbar() {
        if (!pdfDoc) return;
        pageInfo.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
        zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= pdfDoc.numPages;
        zoomOutBtn.disabled = currentScale <= 0.5;
        zoomInBtn.disabled = currentScale >= 3.0;
    }

    function closeResumeModal() {
        if (!resumeModal) return;
        resumeModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Event listeners
    if (viewResumeBtn) {
        viewResumeBtn.addEventListener('click', openResumeModal);
    }
    if (resumeModalClose) {
        resumeModalClose.addEventListener('click', closeResumeModal);
    }
    if (resumeModal) {
        // Close on overlay click
        resumeModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('resume-modal-overlay')) {
                closeResumeModal();
            }
        });
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && resumeModal.classList.contains('active')) {
                closeResumeModal();
            }
        });
    }
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => renderPage(currentPage - 1));
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => renderPage(currentPage + 1));
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            currentScale = Math.max(0.5, currentScale - 0.25);
            renderPage(currentPage);
        });
    }
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            currentScale = Math.min(3.0, currentScale + 0.25);
            renderPage(currentPage);
        });
    }
});
