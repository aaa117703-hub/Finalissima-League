/* =========================================================
   main.js — FINALISSIMA LEAGUE CHAT (v4)
   Anti-Flash Fix: render بعد القفل + النتائج
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

    /* ====== 2. Round dropdown فقط (بدون render) ====== */
    if (typeof initRoundDropdown === 'function') initRoundDropdown();
    /* ⭐ v=4: حذفنا renderFixtures() + renderStandings() من هنا */

    /* ====== 3. Eruda ====== */
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
        window.customMatchweeks = {};  /* ⭐ fallback */
        if (typeof renderFixtures === 'function') renderFixtures();
        if (typeof renderStandings === 'function') renderStandings();
        return;
    }

    /* ⭐ 6a. أول شي — تحميل القفل */
    if (typeof loadCustomMatchweeksIntoMemory === 'function') {
        try {
            await loadCustomMatchweeksIntoMemory();
            console.log('[Main] customMatchweeks ready');
        } catch (e) {
            console.warn('[Main] Custom MW load failed:', e.message);
            window.customMatchweeks = {};  /* ⭐ fallback */
        }
    } else {
        window.customMatchweeks = {};  /* ⭐ fallback */
    }

    /* ⭐ 6b. بعدها — تحميل النتائج */
    if (typeof loadScoresFromSupabase !== 'function') {
        console.warn('[Main] loadScoresFromSupabase not available');
        if (typeof renderFixtures === 'function') renderFixtures();
        if (typeof renderStandings === 'function') renderStandings();
        return;
    }

    if (typeof window.matchweeks === 'undefined') {
        console.warn('[Main] matchweeks not loaded');
        if (typeof renderFixtures === 'function') renderFixtures();
        if (typeof renderStandings === 'function') renderStandings();
        return;
    }

    try {
        const { error: testError } = await window.sbClient
            .from('match_results')
            .select('id')
            .limit(1);

        if (testError) {
            console.warn('[Main] DB Connection:', testError.message);
            if (typeof renderFixtures === 'function') renderFixtures();
            if (typeof renderStandings === 'function') renderStandings();
            return;
        }
    } catch (connErr) {
        console.warn('[Main] Network:', connErr.message);
        if (typeof renderFixtures === 'function') renderFixtures();
        if (typeof renderStandings === 'function') renderStandings();
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
        }
    } catch (e) {
        console.warn('[Main] Load failed:', e.message);
    }

    /* ⭐ 6c. الرندر النهائي — بعد القفل + النتائج */
    if (typeof renderFixtures === 'function')  renderFixtures();
    if (typeof renderStandings === 'function') renderStandings();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
