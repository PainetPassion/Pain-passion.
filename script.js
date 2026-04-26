/**
 * Pain & Passion — script.js
 * Artisan Boulanger · Trois-Rivières, Guadeloupe
 *
 * Modules :
 *  1. Loader
 *  2. Header scroll (shadow + compact)
 *  3. Menu burger (mobile)
 *  4. Scroll smooth (fallback CSS)
 *  5. Reveal animations (IntersectionObserver)
 *  6. Hero parallax
 *  7. Image carousel
 *  8. Formulaire de contact
 *  9. Back-to-top
 * 10. Footer – année courante
 */

/* =====================================================
   HELPERS
   ===================================================== */

/**
 * Sélectionne un élément (raccourci querySelector)
 * @param {string} sel - Sélecteur CSS
 * @param {Element|Document} [ctx=document]
 * @returns {Element|null}
 */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);

/**
 * Sélectionne plusieurs éléments (raccourci querySelectorAll → Array)
 * @param {string} sel - Sélecteur CSS
 * @param {Element|Document} [ctx=document]
 * @returns {Element[]}
 */
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];


/* =====================================================
   1. LOADER
   — Se cache après ~2.2 s (correspondant à l'animation CSS)
   ===================================================== */
(function initLoader() {
    const loader = qs('#loader');
    if (!loader) return;

    // Durée synchronisée avec l'animation loaderBar dans style.css
    const HIDE_DELAY = 2200; // ms

    setTimeout(() => {
        loader.classList.add('hidden');

        // Retire du DOM après la transition pour libérer la mémoire
        loader.addEventListener('transitionend', () => {
            loader.remove();
        }, { once: true });
    }, HIDE_DELAY);
})();


/* =====================================================
   2. HEADER — SCROLL SHADOW
   — Ajoute la classe `.scrolled` dès que l'utilisateur
     scrolle pour renforcer l'ombre
   ===================================================== */
(function initHeaderScroll() {
    const header = qs('#site-header');
    if (!header) return;

    const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 40);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
})();


/* =====================================================
   3. MENU BURGER (MOBILE)
   — Toggle du menu overlay + aria-expanded + fermeture
     au clic sur un lien
   ===================================================== */
(function initBurger() {
    const burgerBtn  = qs('#burger-btn');
    const mobileMenu = qs('#mobile-menu');
    if (!burgerBtn || !mobileMenu) return;

    /** Ouvre / ferme le menu */
    const toggle = () => {
        const isOpen = mobileMenu.classList.toggle('open');
        burgerBtn.classList.toggle('active', isOpen);
        burgerBtn.setAttribute('aria-expanded', String(isOpen));
        // Empêche le scroll du fond quand le menu est ouvert
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    /** Ferme le menu */
    const close = () => {
        mobileMenu.classList.remove('open');
        burgerBtn.classList.remove('active');
        burgerBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    burgerBtn.addEventListener('click', toggle);

    // Ferme au clic sur les liens du menu
    qsa('[data-close-menu]', mobileMenu).forEach(link => {
        link.addEventListener('click', close);
    });

    // Ferme avec Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('open')) close();
    });
})();


/* =====================================================
   4. SMOOTH SCROLL — Fallback
   — Le scroll fluide est géré par `scroll-behavior: smooth`
     dans le CSS. Ce module ne fait rien de plus, mais
     pourrait être utilisé pour polyfiller si besoin.
   ===================================================== */


/* =====================================================
   5. REVEAL ANIMATIONS — IntersectionObserver
   — Les éléments avec .reveal-up / .reveal-left /
     .reveal-right / .reveal-scale reçoivent la classe
     .visible quand ils entrent dans le viewport.
   ===================================================== */
(function initReveal() {
    const revealSelectors = '.reveal-up, .reveal-left, .reveal-right, .reveal-scale';
    const elements = qsa(revealSelectors);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // On observe une seule fois
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.12,   // déclenche quand 12% visible
            rootMargin: '0px 0px -60px 0px',
        }
    );

    elements.forEach(el => observer.observe(el));
})();


/* =====================================================
   6. HERO 3D SEQUENCE ANIMATION (Canvas / Scrubbing)
   — Charge une séquence de 192 images et les anime
     en fonction du scroll (Scrubbing) + 3D Tilt
   ===================================================== */
(function initHeroSequence() {
    const section = qs('.hero-scrub');
    const canvas  = qs('#hero-canvas');
    const content = qs('#hero-content');
    if (!section || !canvas || !content) return;

    const ctx = canvas.getContext('2d');
    const frameCount = 192;
    const currentFrame = index => (
        `assets/sequence/sequence_${index.toString().padStart(3, '0')}.jpg`
    );

    const images = [];
    const sequenceState = { frame: 0 };
    let isInitialRender = true;

    // Pré-chargement des images
    let loadedCount = 0;
    const preloadImages = () => {
        for (let i = 0; i < frameCount; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                loadedCount++;
                if (loadedCount === frameCount) {
                    onScroll(); // Premier rendu basé sur le scroll actuel
                }
            };
            images.push(img);
        }
    };

    const render = () => {
        const img = images[sequenceState.frame];
        if (!img) return;

        // Ajuste la taille du canvas au viewport
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;

        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let dWidth, dHeight, dx, dy;

        if (imgRatio > canvasRatio) {
            dHeight = canvas.height;
            dWidth = dHeight * imgRatio;
            dx = (canvas.width - dWidth) / 2;
            dy = 0;
        } else {
            dWidth = canvas.width;
            dHeight = dWidth / imgRatio;
            dx = 0;
            dy = (canvas.height - dHeight) / 2;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, dx, dy, dWidth, dHeight);
        updateTransforms();
    };

    // Animation au scroll (Scrubbing)
    const onScroll = () => {
        const rect = section.getBoundingClientRect();
        // Le scroll progress va de 0 (haut de la section) à 1 (bas de la section)
        // Comme la section fait 300vh, on calcule la progression relative
        const scrollRange = rect.height - window.innerHeight;
        const scrollFraction = Math.max(0, Math.min(1, -rect.top / scrollRange));
        
        const frameIndex = Math.min(
            frameCount - 1,
            Math.floor(scrollFraction * frameCount)
        );
        
        sequenceState.frame = frameIndex;

        // Animation d'opacité et de position du contenu (fondu au scroll)
        const contentOpacity = 1 - (scrollFraction * 4); // Disparaît vite
        content.style.opacity = Math.max(0, contentOpacity);
        content.style.pointerEvents = contentOpacity < 0.1 ? 'none' : 'auto';

        render();
    };

    // 3D TILT EFFECT (Mouse)
    let mouseX = 0;
    let mouseY = 0;
    const BREAKPOINT = 768;

    const onMouseMove = (e) => {
        if (window.innerWidth < BREAKPOINT) return;
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        updateTransforms();
    };

    const updateTransforms = () => {
        const tiltX = mouseY * 12;
        const tiltY = mouseX * 12;
        
        canvas.style.transform = `rotateX(${-tiltX}deg) rotateY(${tiltY}deg) scale(1.05)`;
        content.style.transform = `translate3d(${mouseX * -25}px, ${mouseY * -25}px, 60px) rotateX(${tiltX * 0.4}deg) rotateY(${-tiltY * 0.4}deg)`;
    };

    window.addEventListener('resize', render);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    preloadImages();
})();


/* =====================================================
   6b. 3D TILT EFFECT (CARDS)
   — Applique un effet de bascule 3D sur les cartes
     au survol de la souris
   ===================================================== */
(function initCardTilt() {
    const cards = qsa('.universe-card, .value-card, .info-card');
    if (window.innerWidth < 768) return;

    cards.forEach(card => {
        card.style.transition = 'transform 0.15s ease-out, box-shadow 0.15s ease-out';
        card.parentElement.style.perspective = '1000px';

        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 8;
            const rotateY = (centerX - x) / 8;
            
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'rotateX(0) rotateY(0) translateY(0) scale(1)';
        });
    });
})();


/* =====================================================
   7. IMAGE CAROUSEL
   — Carousel manuel avec boutons prev/next + dots
   ===================================================== */
(function initCarousel() {
    const track   = qs('#carousel-track');
    const prevBtn = qs('#carousel-prev');
    const nextBtn = qs('#carousel-next');
    const dotsWrap = qs('#carousel-dots');

    if (!track || !prevBtn || !nextBtn || !dotsWrap) return;

    const slides   = qsa('.carousel__slide', track);
    const total    = slides.length;
    let   current  = 0;

    /* --- Génère les dots --- */
    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className    = 'carousel__dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', String(i === 0));
        dot.setAttribute('aria-label', `Aller à l'image ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
    });

    const getDots = () => qsa('.carousel__dot', dotsWrap);

    /**
     * Navigue vers un slide donné
     * @param {number} index
     */
    const goTo = (index) => {
        current = (index + total) % total; // wrap-around
        track.style.transform = `translateX(-${current * 100}%)`;

        // Met à jour les dots
        getDots().forEach((dot, i) => {
            dot.classList.toggle('active', i === current);
            dot.setAttribute('aria-selected', String(i === current));
        });

        // Met à jour les aria-labels des slides
        slides.forEach((slide, i) => {
            slide.setAttribute('aria-label', `${i + 1} de ${total}`);
            slide.setAttribute('aria-hidden', String(i !== current));
        });
    };

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));

    /* --- Swipe tactile --- */
    let startX = 0;
    let isDragging = false;

    track.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        isDragging = true;
    }, { passive: true });

    track.addEventListener('touchend', e => {
        if (!isDragging) return;
        isDragging = false;
        const delta = e.changedTouches[0].clientX - startX;
        if (Math.abs(delta) > 50) {
            goTo(delta < 0 ? current + 1 : current - 1);
        }
    });

    /* --- Auto-play (toutes les 5 s) --- */
    let autoplayTimer = setInterval(() => goTo(current + 1), 5000);

    // Pause l'auto-play quand l'utilisateur interagit
    [prevBtn, nextBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            clearInterval(autoplayTimer);
            autoplayTimer = setInterval(() => goTo(current + 1), 5000);
        });
    });

    // Pause si le carousel n'est pas visible
    const carouselEl = qs('.carousel');
    if (carouselEl) {
        const visibilityObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    autoplayTimer = setInterval(() => goTo(current + 1), 5000);
                } else {
                    clearInterval(autoplayTimer);
                }
            },
            { threshold: 0.3 }
        );
        visibilityObserver.observe(carouselEl);
    }

    /* --- Accessibilité clavier --- */
    document.addEventListener('keydown', e => {
        // N'agit que si un élément du carousel est focusé ou proche
        const focused = document.activeElement;
        if (!carouselEl || !carouselEl.contains(focused)) return;
        if (e.key === 'ArrowLeft')  goTo(current - 1);
        if (e.key === 'ArrowRight') goTo(current + 1);
    });

    // Init
    goTo(0);
})();


/* =====================================================
   8. FORMULAIRE DE CONTACT
   — Validation front, puis ouverture mailto:
   ===================================================== */
(function initContactForm() {
    const form    = qs('#contact-form');
    const toast   = qs('#form-toast');
    if (!form || !toast) return;

    /**
     * Affiche un message toast
     * @param {string} message
     * @param {'success'|'error'} type
     */
    const showToast = (message, type = 'success') => {
        toast.textContent = message;
        toast.className   = `form-toast ${type === 'error' ? 'error-msg' : 'success'}`;
        // Auto-effacement après 5 s
        setTimeout(() => { toast.className = 'form-toast'; toast.textContent = ''; }, 5000);
    };

    /**
     * Affiche/efface une erreur sur un champ
     * @param {string} inputId
     * @param {string} [message=''] vide = pas d'erreur
     */
    const setError = (inputId, message = '') => {
        const input = qs(`#${inputId}`);
        const error = qs(`#error-${inputId.replace('input-', '')}`);
        if (!input) return;
        if (message) {
            input.classList.add('error');
            if (error) error.textContent = message;
        } else {
            input.classList.remove('error');
            if (error) error.textContent = '';
        }
    };

    /**
     * Valide le formulaire
     * @returns {{ valid: boolean, data: Object }}
     */
    const validate = () => {
        let valid = true;
        const name    = qs('#input-name').value.trim();
        const email   = qs('#input-email').value.trim();
        const message = qs('#input-message').value.trim();

        // Réinitialise
        ['input-name', 'input-email', 'input-message'].forEach(id => setError(id));

        if (!name) {
            setError('input-name', 'Veuillez indiquer votre nom.');
            valid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setError('input-email', 'Veuillez indiquer votre adresse email.');
            valid = false;
        } else if (!emailRegex.test(email)) {
            setError('input-email', 'Veuillez entrer une adresse email valide.');
            valid = false;
        }

        if (!message) {
            setError('input-message', 'Veuillez écrire votre message.');
            valid = false;
        } else if (message.length < 10) {
            setError('input-message', 'Votre message est trop court (min. 10 caractères).');
            valid = false;
        }

        return { valid, data: { name, email, message } };
    };

    form.addEventListener('submit', e => {
        e.preventDefault();
        const { valid, data } = validate();
        if (!valid) return;

        const subject = qs('#input-subject').value.trim() || 'Message depuis le site Pain & Passion';

        // Ouvre le client mail avec les données pré-remplies
        const mailtoUrl = [
            'mailto:boulangeriepainsetpassion@gmail.com',
            '?subject=', encodeURIComponent(subject),
            '&body=',    encodeURIComponent(
                `Nom : ${data.name}\nEmail : ${data.email}\n\n${data.message}`
            ),
        ].join('');

        window.location.href = mailtoUrl;

        // Feedback utilisateur
        showToast('✅ Votre application mail va s\'ouvrir. Merci !', 'success');

        // Réinitialise le formulaire
        form.reset();
    });

    // Validation en temps réel (au blur)
    [
        { id: 'input-name',    check: v => v.trim() ? '' : 'Veuillez indiquer votre nom.' },
        { id: 'input-email',   check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Email invalide.' },
        { id: 'input-message', check: v => v.trim().length >= 10 ? '' : 'Message trop court.' },
    ].forEach(({ id, check }) => {
        const input = qs(`#${id}`);
        if (!input) return;
        input.addEventListener('blur', () => setError(id, check(input.value)));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) setError(id, check(input.value));
        });
    });
})();


/* =====================================================
   9. BACK TO TOP
   — Apparaît après > 400px de scroll
   ===================================================== */
(function initBackToTop() {
    const btn = qs('#back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();


/* =====================================================
   10. FOOTER — ANNÉE COURANTE
   ===================================================== */
(function initFooterYear() {
    const yearEl = qs('#footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
