// =========================================================
// main.js — Finalissima League (Landing + SPA)
// =========================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Main] Finalissima starting...');

    initLandingCards();
    initRoundSelector();
    initTabs();
    initStatsTabs();
    initRoundNav();
    initSettings();
    initBackButton();

    console.log('[Main] Ready. Round:', currentRound);
});

// =========================================================
// 1. LANDING — البطاقات الرئيسية
// =========================================================

function initLandingCards() {
    const cards = document.querySelectorAll('[data-goto]');
    cards.forEach(function(card) {
        card.addEventListener('click', function() {
            const tab = this.getAttribute('data-goto');
            if (!tab) return;
            openSPA(tab);
        });
    });
}

function openSPA(tabName) {
    // أخف Landing
    const landing = document.getElementById('landingView');
    if (landing) landing.classList.remove('show');

    // أظهر SPA
    const spa = document.getElementById('spaView');
    if (spa) spa.classList.add('show');

    // فعّل التاب المطلوب
    if (tabName) switchTab(tabName);
}

function closeSPA() {
    const landing = document.getElementById('landingView');
    if (landing) landing.classList.add('show');

    const spa = document.getElementById('spaView');
    if (spa) spa.classList.remove('show');
}

// =========================================================
// 2. ROUND SELECTOR
// =========================================================

function initRoundSelector() {
    const selector = document.getElementById('roundSelector');
    if (!selector) return;

    selector.innerHTML = '';
    for (let i = 1; i <= 38; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = 'Round ' + i;
        selector.appendChild(opt);
    }

    selector.value = currentRound;

    selector.addEventListener('change', function() {
        const newRound = parseInt(this.value, 10);
        if (isNaN(newRound) || newRound < 1 || newRound > 38) return;
        currentRound = newRound;
        localStorage.setItem('fin_last_round', String(currentRound));
        reloadActiveTab();
    });
}

// =========================================================
// 3. TABS
// =========================================================

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach(function(p) {
        p.classList.remove('active');
    });

    const target = document.getElementById('tab-' + tabName);
    if (target) target.classList.add('active');

    // إخفاء Round Bar في تابات لا تحتاجها
    const roundBar = document.getElementById('roundBar');
    if (roundBar) {
        if (tabName === 'fixtures' || tabName === 'totw') {
            roundBar.style.display = 'flex';
        } else {
            roundBar.style.display = 'none';
        }
    }

    activeTab = tabName;
    reloadActiveTab();
}

function reloadActiveTab() {
    switch (activeTab) {
        case 'fixtures':
            if (typeof renderFixtures === 'function') renderFixtures();
            break;
        case 'standings':
            if (typeof renderStandings === 'function') renderStandings();
            break;
        case 'totw':
            if (typeof renderTOTW === 'function') renderTOTW();
            break;
        case 'stats':
            if (typeof renderStats === 'function') renderStats();
            break;
    }
}

// =========================================================
// 4. STATS TABS
// =========================================================

function initStatsTabs() {
    const tabs = document.querySelectorAll('.stats-tab');
    tabs.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const stat = this.getAttribute('data-stats');
            if (!stat) return;

            document.querySelectorAll('.stats-tab').forEach(function(b) {
                b.classList.toggle('active', b.getAttribute('data-stats') === stat);
            });

            if (typeof renderStatsSection === 'function') {
                renderStatsSection(stat);
            }
        });
    });
}

// =========================================================
// 5. ROUND NAVIGATION
// =========================================================

function initRoundNav() {
    const prev = document.getElementById('prevRound');
    const next = document.getElementById('nextRound');

    if (prev) {
        prev.addEventListener('click', function() {
            if (currentRound > 1) {
                currentRound--;
                localStorage.setItem('fin_last_round', String(currentRound));
                syncRoundUI();
            }
        });
    }

    if (next) {
        next.addEventListener('click', function() {
            if (currentRound < 38) {
                currentRound++;
                localStorage.setItem('fin_last_round', String(currentRound));
                syncRoundUI();
            }
        });
    }
}

function syncRoundUI() {
    const selector = document.getElementById('roundSelector');
    if (selector) selector.value = currentRound;
    reloadActiveTab();
}

// =========================================================
// 6. SETTINGS MODAL
// =========================================================

function initSettings() {
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettings');

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (modal) modal.classList.remove('show');
        });
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
}

// =========================================================
// 7. BACK BUTTON
// =========================================================

function initBackButton() {
    const btn = document.getElementById('backBtn');
    if (btn) {
        btn.addEventListener('click', closeSPA);
    }
}

// =========================================================
// 8. Helper
// =========================================================

function getCurrentRoundMatches() {
    if (typeof matchweeks === 'undefined') return [];
    return matchweeks[currentRound] || [];
}

window.openSPA = openSPA;
window.closeSPA = closeSPA;
window.switchTab = switchTab;
window.reloadActiveTab = reloadActiveTab;
window.getCurrentRoundMatches = getCurrentRoundMatches;
