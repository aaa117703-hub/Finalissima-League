/* =========================================================
   text-carousel.js — Banner Carousel + Swipe Support
========================================================= */

let currentTextSlide = 0;
let textCarouselTimer = null;
const TEXT_CAROUSEL_INTERVAL = 3000;

/* Swipe state */
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isSwiping = false;
let swipeThreshold = 50;

function goToTextSlide(index) {
    const slides = document.querySelectorAll('.text-slide');
    const dots = document.querySelectorAll('.text-dot');
    if (!slides.length) return;
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentTextSlide = index;
    slides.forEach(function(slide, i) {
        slide.classList.toggle('active', i === index);
    });
    dots.forEach(function(dot, i) {
        dot.classList.toggle('active', i === index);
    });
}

function nextTextSlide() {
    goToTextSlide(currentTextSlide + 1);
}

function prevTextSlide() {
    goToTextSlide(currentTextSlide - 1);
}

function startTextCarousel() {
    stopTextCarousel();
    textCarouselTimer = setInterval(nextTextSlide, TEXT_CAROUSEL_INTERVAL);
}

function stopTextCarousel() {
    if (textCarouselTimer) {
        clearInterval(textCarouselTimer);
        textCarouselTimer = null;
    }
}

function resetTextTimer() {
    stopTextCarousel();
    startTextCarousel();
}

/* =========================================================
   SWIPE SUPPORT
========================================================= */

function setupSwipe() {
    const carousel = document.getElementById('textCarousel');
    if (!carousel) {
        console.warn('[Carousel] element not found for swipe');
        return;
    }

    /* Touch Events */
    carousel.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
        isSwiping = false;
        stopTextCarousel();
    }, { passive: true });

    carousel.addEventListener('touchmove', function(e) {
        if (e.touches.length !== 1) return;
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;

        const diffX = Math.abs(touchEndX - touchStartX);
        const diffY = Math.abs(touchEndY - touchStartY);

        /* إذا الحركة أفقية أكثر من عمودية → Swipe */
        if (diffX > diffY && diffX > 10) {
            isSwiping = true;
        }
    }, { passive: true });

    carousel.addEventListener('touchend', function(e) {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        /* ما نعمل شي إذا الحركة عمودية */
        if (Math.abs(diffY) > Math.abs(diffX)) {
            startTextCarousel();
            return;
        }

        /* Swipe كافٍ؟ */
        if (Math.abs(diffX) > swipeThreshold) {
            if (diffX < 0) {
                /* Swipe يسار → التالي */
                nextTextSlide();
            } else {
                /* Swipe يمين → السابق */
                prevTextSlide();
            }
        }

        isSwiping = false;
        resetTextTimer();
    }, { passive: true });

    /* Mouse Events (للديسكتوب) */
    let mouseDown = false;
    let mouseStartX = 0;

    carousel.addEventListener('mousedown', function(e) {
        mouseDown = true;
        mouseStartX = e.clientX;
        stopTextCarousel();
    });

    carousel.addEventListener('mousemove', function(e) {
        if (!mouseDown) return;
        /* ما نعمل شي — بس نتتبع */
    });

    carousel.addEventListener('mouseup', function(e) {
        if (!mouseDown) return;
        mouseDown = false;

        const diffX = e.clientX - mouseStartX;

        if (Math.abs(diffX) > swipeThreshold) {
            if (diffX < 0) {
                nextTextSlide();
            } else {
                prevTextSlide();
            }
        }

        resetTextTimer();
    });

    carousel.addEventListener('mouseleave', function() {
        if (mouseDown) {
            mouseDown = false;
            startTextCarousel();
        }
    });

    console.log('[Carousel] Swipe enabled');
}

/* =========================================================
   INIT
========================================================= */

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopTextCarousel();
    } else {
        startTextCarousel();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        setupSwipe();
        startTextCarousel();
    }, 500);
});

window.goToTextSlide = goToTextSlide;
window.nextTextSlide = nextTextSlide;
window.prevTextSlide = prevTextSlide;
window.startTextCarousel = startTextCarousel;
window.stopTextCarousel = stopTextCarousel;
window.resetTextTimer = resetTextTimer;
