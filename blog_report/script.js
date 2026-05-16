// ======================== SCROLL REVEAL ========================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.addEventListener('DOMContentLoaded', () => {
    // Reveal items on scroll
    document.querySelectorAll('.reveal-item').forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.08}s`;
        revealObserver.observe(el);
    });

    // Animated counters
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = el.getAttribute('data-count');
        const isNumber = !isNaN(parseFloat(target));
        if (isNumber) {
            const end = parseFloat(target);
            const duration = 2000;
            const start = 0;
            const startTime = performance.now();
            const suffix = el.getAttribute('data-suffix') || '';
            const prefix = el.getAttribute('data-prefix') || '';

            const countObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const animate = (now) => {
                            const elapsed = now - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            const current = Math.floor(start + (end - start) * eased);
                            el.textContent = prefix + current.toLocaleString() + suffix;
                            if (progress < 1) requestAnimationFrame(animate);
                        };
                        requestAnimationFrame(animate);
                        countObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            countObserver.observe(el);
        }
    });
});

// ======================== PARALLAX ========================
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            const scrolled = window.scrollY;
            const orbs = document.querySelectorAll('.orb');
            orbs.forEach((orb, i) => {
                const speed = (i + 1) * 0.03;
                orb.style.transform = `translateY(${scrolled * speed}px)`;
            });
            ticking = false;
        });
        ticking = true;
    }
});

// ======================== SMOOTH NAV ========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
