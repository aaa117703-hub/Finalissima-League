/* =========================================================
   text-carousel.js
   كاروسيل نصوص يتحرك كل 3 ثواني
========================================================= */

let currentTextSlide = 0;
let textCarouselTimer = null;
const TEXT_CAROUSEL_INTERVAL = 3000;

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

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopTextCarousel();
    } else {
        startTextCarousel();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        startTextCarousel();
    }, 500);
});

window.goToTextSlide = goToTextSlide;
window.nextTextSlide = nextTextSlide;
window.startTextCarousel = startTextCarousel;
window.stopTextCarousel = stopTextCarousel;
window.resetTextTimer = resetTextTimer;
