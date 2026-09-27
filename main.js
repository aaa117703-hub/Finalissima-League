/* =========================================================
   main.js — FINALISSIMA LEAGUE CHAT
========================================================= */

async function init() {

    /* ====== 1. Carousel ====== */
    if (typeof buildCarousel === 'function') {
        buildCarousel();
        setupCarouselTouch();
        if (window.__carouselAutoStart !== false) {
            startCarousel();
        }
    }

    /* ====== 2. Round dropdown + Render ====== */
    if (typeof initRoundDropdown === 'function') initRoundDropdown();
    if (typeof renderFixtures === 'function')   renderFixtures();
    if (typeof renderStandings === 'function')  renderStandings();

    /* ====== 3. Eruda (اختياري) ====== */
    if (typeof setupEruda === 'function') {
        try { setupEruda(); } catch (e) { console.warn('[Eruda]', e); }
    }

    /* ====== 4. Lock system ====== */
    if (typeof initLockSystem === 'function') {
        initLockSystem().catch(function(e) {
            console.warn('[LockSystem]', e);
        });
    }

    /* ====== 5. app-ready event ====== */
    try {
        window.dispatchEvent(new CustomEvent('app-ready', {
            detail: { timestamp: Date.now() }
        }));
    } catch (e) {
        console.warn('[Main] app-ready dispatch failed:', e);
    }

    /* ====== 6. Supabase ====== */
    if (!window.sbClient) {
        console.warn('[Main] Supabase client not available — working offline');
        return;
    }

    /* ⭐ جديد: تحميل الجولات المخصصة من Supabase */
    if (typeof loadCustomMatchweeksIntoMemory === 'function') {
        try {
            await loadCustomMatchweeksIntoMemory();
            if (typeof renderFixtures === 'function') renderFixtures();
        } catch (e) {
            console.warn('[Main] Custom matchweeks load failed:', e.message);
        }
    }

    if (typeof loadScoresFromSupabase !== 'function') {
        console.warn('[Main] loadScoresFromSupabase not available');
        return;
    }

    if (typeof window.matchweeks === 'undefined') {
        console.warn('[Main] matchweeks not loaded');
        return;
    }

    try {
        const { error: testError } = await window.sbClient
            .from('match_results')
            .select('id')
            .limit(1);

        if (testError) {
            console.warn('[Main] DB Connection:', testError.message);
            return;
        }
    } catch (connErr) {
        console.warn('[Main] Network:', connErr.message);
        return;
    }

    try {
        const remoteScores = await loadScoresFromSupabase(window.matchweeks);

        if (remoteScores && Object.keys(remoteScores).length > 0) {
            scoresStorage = remoteScores;

            try {
                localStorage.setItem('fin_scores', JSON.stringify(scoresStorage));
            } catch (lsErr) {
                console.warn('[Main] localStorage full:', lsErr.message);
            }

            if (typeof renderFixtures === 'function')  renderFixtures();
            if (typeof renderStandings === 'function') renderStandings();
        }
    } catch (e) {
        console.warn('[Main] Load failed:', e.message);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
