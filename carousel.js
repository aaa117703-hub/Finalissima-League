/* =========================================================
   carousel.js — FINALISSIMA LEAGUE CHAT
========================================================= */

const carouselSlides = [
    { text: 'المواجهات',   sub: 'FIXTURES',       icon: '⚽', tab: 'fixtures'  },
    { text: 'الترتيب',     sub: 'STANDINGS',      icon: '📊', tab: 'standings' },
    { text: 'التشكيلة',    sub: 'TEAM OF THE WEEK', icon: '👥', tab: 'totw'      },
    { text: 'الإحصائيات',  sub: 'STATISTICS',     icon: '📈', tab: 'stats'     }
];

let carouselIndex = 0;
let carouselTimer = null;
let touchStartX = 0;
let touchEndX = 0;
let carouselReady = false;

const CAROUSEL_INTERVAL = 5000;
const SWIPE_THRESHOLD = 50;

function buildCarousel() {
    const carousel = document.getElementById('carousel');
    const track = document.getElementById('carouselTrack');
    const dots = document.getElementById('carouselDots');

    if (!carousel || !track || !dots) return;

    track.innerHTML = '';
    dots.innerHTML = '';

    carouselSlides.forEach(function(slide, index) {
        const item = document.createElement('div');
        item.className = 'carousel-slide' + (index === 0 ? ' active' : '');

        const content = document.createElement('div');
        content.className = 'carousel-slide-content';
        content.innerHTML =
            '<span class="carousel-slide-icon">' + slide.icon + '</span>' +
            '<span class="carousel-slide-title">' + slide.text + '</span>' +
            '<span class="carousel-slide-sub">' + slide.sub + '</span>';

        item.appendChild(content);

        item.addEventListener('click', function() {
            if (typeof switchTab === 'function') {
                switchTab(slide.tab);
            }
        });

        track.appendChild(item);

        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');

        dot.addEventListener('click', function(event) {
            event.stopPropagation();
            goToCarousel(index);
            startCarousel();
        });

        dots.appendChild(dot);
    });

    carouselReady = true;
}

function goToCarousel(index) {
    if (!carouselSlides.length) return;

    carouselIndex = (index + carouselSlides.length) % carouselSlides.length;

    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');

    slides.forEach(function(slide, i) {
        slide.classList.toggle('active', i === carouselIndex);
    });

    dots.forEach(function(dot, i) {
        dot.classList.toggle('active', i === carouselIndex);
    });
}

function nextCarousel() {
    if (!carouselReady) return;
    goToCarousel(carouselIndex + 1);
}

function startCarousel() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(nextCarousel, CAROUSEL_INTERVAL);
}

function stopCarousel() {
    if (carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
    }
}

function setupCarouselTouch() {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;

    carousel.addEventListener('touchstart', function(event) {
        if (event.changedTouches && event.changedTouches.length) {
            touchStartX = event.changedTouches[0].screenX;
        }
        stopCarousel();
    }, { passive: true });

    carousel.addEventListener('touchend', function(event) {
        if (event.changedTouches && event.changedTouches.length) {
            touchEndX = event.changedTouches[0].screenX;
        }

        const difference = touchEndX - touchStartX;

        if (Math.abs(difference) > SWIPE_THRESHOLD) {
            if (difference < 0) {
                nextCarousel();
            } else {
                goToCarousel(carouselIndex - 1);
            }
        }

        startCarousel();
    }, { passive: true });
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopCarousel();
    } else if (carouselReady) {
        startCarousel();
    }
});

if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.__carouselAutoStart = false;
} else {
    window.__carouselAutoStart = true;
}
