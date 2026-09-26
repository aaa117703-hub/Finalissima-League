// =========================================================
// main.js — Finalissima League
// مدير الموقع الرئيسي
// =========================================================

// =========================================================
// 1. تهيئة الموقع
// =========================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Main] Finalissima League starting...');

    initRoundSelector();
    initTabs();
    initStatsTabs();
    initRoundNav();
    initSettings();

    // فعّل التاب الأول
    switchTab(activeTab || 'fixtures');

    // تحديث عنوان الجولة
    updateRoundTitle();

    console.log('[Main] Ready. Round:', currentRound, '| Tab:', activeTab);
});

// =========================================================
// 2. Round Selector (اختيار الجولة)
// =========================================================

function initRoundSelector() {
    const selector = document.getElementById('roundSelector');
    if (!selector) return;

    // املأ الخيارات 1-38
    selector.innerHTML = '';
    for (let i = 1; i <= 38; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = 'Round ' + i;
        selector.appendChild(opt);
    }

    // حدّد الجولة الحالية
    selector.value = currentRound;

    // عند التغيير
    selector.addEventListener('change', function() {
        const newRound = parseInt(this.value, 10);
        if (isNaN(newRound) || newRound < 1 || newRound > 38) return;
        currentRound = newRound;
        localStorage.setItem('fin_last_round', String(currentRound));
        updateRoundTitle();
        reloadActiveTab();
    });
}

// =========================================================
// 3. Tabs (التبويبات الرئيسية)
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
    // أزل active من كل التابات
    document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });

    // أخف كل الأقسام
    document.querySelectorAll('.tab-pane').forEach(function(p) {
        p.classList.remove('active');
    });

    // أظهر القسم المطلوب
    const target = document.getElementById('tab-' + tabName);
    if (target) target.classList.add('active');

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
// 4. Stats Tabs (التبويبات الفرعية داخل Stats)
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
// 5. Round Navigation (Prev/Next)
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
    updateRoundTitle();
    reloadActiveTab();
}

function updateRoundTitle() {
    const title = document.getElementById('roundTitle');
    if (title) title.textContent = 'MATCHWEEK ' + currentRound;
}

// =========================================================
// 6. Settings Modal
// =========================================================

function initSettings() {
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettings');
    const openBtn = document.getElementById('btnSettings');

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (modal) modal.classList.remove('show');
        });
    }

    if (openBtn) {
        openBtn.addEventListener('click', function() {
            if (modal) modal.classList.add('show');
        });
    }

    // إغلاق عند النقر خارج الصندوق
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
}

// =========================================================
// 7. Helper: تحويل كود المنتخب لاسم
// =========================================================

function getTeamName(code) {
    if (typeof teamsMap !== 'undefined' && teamsMap[code]) {
        return teamsMap[code].name;
    }
    return code;
}

function getTeamFlag(code) {
    if (typeof teamsMap !== 'undefined' && teamsMap[code]) {
        return teamsMap[code].flag || '';
    }
    return '';
}

// =========================================================
// 8. Helper: جلب مباريات الجولة
// =========================================================

function getCurrentRoundMatches() {
    if (typeof matchweeks === 'undefined') return [];
    return matchweeks[currentRound] || [];
}

// =========================================================
// 9. Expose Globals
// =========================================================

window.switchTab = switchTab;
window.reloadActiveTab = reloadActiveTab;
window.syncRoundUI = syncRoundUI;
window.getTeamName = getTeamName;
window.getTeamFlag = getTeamFlag;
window.getCurrentRoundMatches = getCurrentRoundMatches;
