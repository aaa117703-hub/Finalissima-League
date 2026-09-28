/* =========================================================
   fixtures.js — FINALISSIMA LEAGUE CHAT
========================================================= */

/* ===== ذاكرة مؤقتة للجولات المخصصة ===== */
window.customMatchweeks = null;

/* ===== هل الجولة مخفية؟ ===== */
function isRoundHidden(round) {
    if (!window.customMatchweeks) return false;
    const custom = window.customMatchweeks[round];
    if (!custom) return false;
    return custom.is_hidden === true;
}

/* ===== هل نعرض الجولة للمستخدم؟ ===== */
function canUserSeeRound(round) {
    if (editMode || (typeof isAdmin === 'function' && isAdmin())) return true;
    if (isRoundHidden(round)) return false;
    return true;
}

/* ===== تحميل الجولات المخصصة من Supabase ===== */
async function loadCustomMatchweeksIntoMemory() {
    try {
        if (typeof loadCustomMatchweeks !== 'function') {
            console.warn('[Custom MW] loadCustomMatchweeks not available');
            return;
        }

        const data = await loadCustomMatchweeks();
        if (data) {
            window.customMatchweeks = data;

            /* ندمجها مع window.matchweeks */
            Object.keys(data).forEach(function(rStr) {
                const r = parseInt(rStr, 10);
                const custom = data[r];
                if (custom && Array.isArray(custom.matches) && custom.matches.length > 0) {
                    window.matchweeks[r] = custom.matches;
                }
            });

            console.log('[Custom MW] loaded:', Object.keys(data).length, 'rounds');
        } else {
            window.customMatchweeks = {};
            console.log('[Custom MW] no custom data, using defaults');
        }
    } catch (e) {
        console.warn('[Custom MW] load failed:', e);
        window.customMatchweeks = {};
    }
}

/* ⭐ editMode موجود في config.js — ما نعرّفه هنا */

function initRoundDropdown() {
    const select = document.getElementById('roundSelect');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 1; i <= 38; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = 'Round ' + i;
        if (i === currentRound) opt.selected = true;
        select.appendChild(opt);
    }
}

function selectRound(value) {
    currentRound = parseInt(value, 10);
    localStorage.setItem('fin_last_round', currentRound);
    renderFixtures();
    if (activeTab === 'standings') renderStandings();
}

function changeRound(step) {
    currentRound += step;
    if (currentRound < 1) currentRound = 1;
    if (currentRound > 38) currentRound = 38;
    localStorage.setItem('fin_last_round', currentRound);
    renderFixtures();
    if (activeTab === 'standings') renderStandings();
}

function switchTab(tabName) {
    if (
        typeof isLocked === 'function' &&
        typeof isAdmin === 'function' &&
        !isAdmin()
    ) {
        if (tabName === 'fixtures' && isLocked('fixtures')) {
            showSectionMaintenance('المواجهات');
            return;
        }
        if (tabName === 'standings' && isLocked('standings')) {
            showSectionMaintenance('الترتيب');
            return;
        }
        if (tabName === 'totw' && isLocked('totw')) {
            showSectionMaintenance('تشكيلة الأسبوع');
            return;
        }
    }

    if (typeof hideSectionMaintenance === 'function') {
        hideSectionMaintenance();
    }

    activeTab = tabName;

    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(function(el) { el.classList.remove('active'); });

    if (tabName === 'standings') {
        const el = document.getElementById('standingsTab');
        if (el) el.classList.add('active');
        if (typeof renderStandings === 'function') renderStandings();
    } else if (tabName === 'totw') {
        const el = document.getElementById('totwTab');
        if (el) el.classList.add('active');
        if (typeof loadTOTW === 'function') loadTOTW();
    } else if (tabName === 'stats') {
        const el = document.getElementById('statsTab');
        if (el) el.classList.add('active');
        if (typeof loadStats === 'function') loadStats();
    } else {
        const el = document.getElementById('fixturesTab');
        if (el) el.classList.add('active');
    }
}

function unlockSecretPanel() {
    const pass = prompt('Enter password:');
    if (pass === null) return;

    if (pass === '1999') {
        editMode = true;
        localStorage.setItem('tg_admin', 'true');
        const panel = document.getElementById('editPanel');
        if (panel) panel.style.display = 'flex';
        renderFixtures();
        if (typeof showToast === 'function') showToast('Edit mode enabled', true);
        return;
    }

    if (pass === '024680') {
        if (typeof activateLockControl === 'function') {
            activateLockControl();
        }
        return;
    }

    alert('Incorrect password!');
}

function unlockEditWithPassword() {
    unlockSecretPanel();
}

function exitEditMode() {
    editMode = false;
    const panel = document.getElementById('editPanel');
    if (panel) panel.style.display = 'none';
    renderFixtures();
    if (typeof renderStandings === 'function') renderStandings();
}

function updateScore(round, idx, type, val) {
    scoresStorage['r' + round + '_m' + idx + '_' + type] = val;
}

function renderFixtures() {
    try {
        const list = document.getElementById('fixturesList');
        const title = document.getElementById('currentRoundTitle');
        const selectEl = document.getElementById('roundSelect');
        const fixturesTitle = document.getElementById('fixturesBannerTitle');

        if (!list) return;

        if (title) title.innerText = 'MATCHWEEK ' + currentRound;
        if (selectEl) selectEl.value = currentRound;
        if (fixturesTitle) fixturesTitle.innerText = 'MATCHWEEK ' + currentRound;

        list.innerHTML = '';

        /* ===== هل الجولة مخفية للمستخدم؟ ===== */
        if (!canUserSeeRound(currentRound)) {
            list.innerHTML =
                '<div class="round-hidden-msg">' +
                    '<div class="round-hidden-icon">🔒</div>' +
                    '<div class="round-hidden-title">المواجهات غير متاحة حالياً</div>' +
                    '<div class="round-hidden-sub">سيتم الإعلان عن مباريات هذه الجولة قريباً</div>' +
                '</div>';
            return;
        }

        const matches = (window.matchweeks && window.matchweeks[currentRound]) || [];

        matches.forEach(function(match, idx) {
            const home = teamsMap[match[0]] || { name: match[0], logo: '' };
            const away = teamsMap[match[1]] || { name: match[1], logo: '' };

            const homeScore = scoresStorage['r' + currentRound + '_m' + idx + '_home'];
            const awayScore = scoresStorage['r' + currentRound + '_m' + idx + '_away'];

            const homeScoreStr = (homeScore === undefined || homeScore === null) ? '' : homeScore;
            const awayScoreStr = (awayScore === undefined || awayScore === null) ? '' : awayScore;

            let scoreContent = '';

            if (editMode) {
                scoreContent =
                    '<input type="number" class="score-input" id="home_r' + currentRound + '_m' + idx + '" value="' + homeScoreStr + '" placeholder="0" oninput="updateScore(' + currentRound + ',' + idx + ',\'home\',this.value)">' +
                    '<span class="vs-text">-</span>' +
                    '<input type="number" class="score-input" id="away_r' + currentRound + '_m' + idx + '" value="' + awayScoreStr + '" placeholder="0" oninput="updateScore(' + currentRound + ',' + idx + ',\'away\',this.value)">';
            } else {
                const hDisplay = homeScoreStr !== '' ? homeScoreStr : '-';
                const aDisplay = awayScoreStr !== '' ? awayScoreStr : '-';
                scoreContent =
                    '<span class="score-display">' + hDisplay + '</span>' +
                    '<span class="vs-text">-</span>' +
                    '<span class="score-display">' + aDisplay + '</span>';
            }

            const imgOnError = 'this.style.display=\'none\'';

            list.innerHTML +=
                '<div class="fixture-row">' +
                    '<div class="team-box home">' +
                        '<span>' + home.name + '</span>' +
                        '<span class="logo-24">' +
                            '<img src="./' + home.logo + '" alt="' + home.name + '" onerror="' + imgOnError + '">' +
                        '</span>' +
                    '</div>' +
                    '<div class="match-score-center">' + scoreContent + '</div>' +
                    '<div class="team-box away">' +
                        '<span class="logo-24">' +
                            '<img src="./' + away.logo + '" alt="' + away.name + '" onerror="' + imgOnError + '">' +
                        '</span>' +
                        '<span>' + away.name + '</span>' +
                    '</div>' +
                '</div>';
        });
    } catch (e) {
        console.error('renderFixtures error:', e);
    }
}

async function saveCurrentRound() {
    if (isSaving) return;
    isSaving = true;
    showToast('Saving...', false);

    const saveBtn = document.getElementById('saveRoundBtn');
    const clearBtn = document.getElementById('clearRoundBtn');
    if (saveBtn) saveBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;

    const matches = (window.matchweeks && window.matchweeks[currentRound]) || [];

    matches.forEach(function(match, idx) {
        const homeInput = document.getElementById('home_r' + currentRound + '_m' + idx);
        const awayInput = document.getElementById('away_r' + currentRound + '_m' + idx);
        if (homeInput && awayInput) {
            scoresStorage['r' + currentRound + '_m' + idx + '_home'] = homeInput.value;
            scoresStorage['r' + currentRound + '_m' + idx + '_away'] = awayInput.value;
        }
    });

    localStorage.setItem('fin_scores', JSON.stringify(scoresStorage));
    localStorage.setItem('fin_last_round', currentRound);

    let result = { ok: true };

    try {
        result = await saveRoundToSupabase(currentRound, window.matchweeks, scoresStorage);
    } catch (e) {
        result = { ok: false, error: e };
    }

    if (result.ok && typeof saveManualTOTW === 'function') {
        try { await saveManualTOTW(currentRound); } catch (e) { console.warn('TOTW snapshot failed:', e); }
    }
    if (result.ok && typeof saveCurrentRanks === 'function') {
        try { await saveCurrentRanks(currentRound); } catch (e) { console.warn('Save ranks failed:', e); }
    }

    isSaving = false;
    if (saveBtn) saveBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;

    if (result.ok) {
        showToast('Saved successfully', true);
        exitEditMode();
    } else {
        let errMsg = 'Unknown error';
        if (result.error && result.error.message) errMsg = result.error.message;
        else if (result.error) errMsg = String(result.error);
        showToast('Save failed: ' + errMsg, false, 20000);
    }
}

async function clearCurrentRound() {
    if (isSaving) return;

    const confirmed = confirm('Clear round ' + currentRound + '?');
    if (!confirmed) return;

    isSaving = true;
    showToast('Clearing...', false);

    const saveBtn = document.getElementById('saveRoundBtn');
    const clearBtn = document.getElementById('clearRoundBtn');
    if (saveBtn) saveBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;

    const matches = (window.matchweeks && window.matchweeks[currentRound]) || [];

    matches.forEach(function(match, idx) {
        delete scoresStorage['r' + currentRound + '_m' + idx + '_home'];
        delete scoresStorage['r' + currentRound + '_m' + idx + '_away'];
    });

    localStorage.setItem('fin_scores', JSON.stringify(scoresStorage));

    let result = { ok: true };

    try {
        result = await clearRoundFromSupabase(currentRound);
    } catch (e) {
        result = { ok: false, error: e };
    }

    isSaving = false;
    if (saveBtn) saveBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;

    if (result.ok) {
        showToast('Round cleared', true);
        exitEditMode();
    } else {
        let errMsg = 'Unknown error';
        if (result.error && result.error.message) errMsg = result.error.message;
        else if (result.error) errMsg = String(result.error);
        showToast('Clear failed: ' + errMsg, false, 20000);
    }
}

setInterval(function() {
    if (Object.keys(scoresStorage).length > 0) {
        localStorage.setItem('fin_scores', JSON.stringify(scoresStorage));
    }
}, 5000);

function setupEruda() {
    let clickCount = 0;
    let clickTimer = null;
    const titleEl = document.getElementById('currentRoundTitle');
    if (!titleEl) return;
    titleEl.addEventListener('click', function() {
        clickCount++;
        clearTimeout(clickTimer);
        if (clickCount >= 5) {
            clickCount = 0;
            if (typeof eruda !== 'undefined' && eruda.init) {
                try { eruda.init(); eruda.show(); } catch (e) {}
            }
        }
        clickTimer = setTimeout(function() { clickCount = 0; }, 2000);
    });
}

/* ===== ربط الدوال بـ window ===== */
window.loadCustomMatchweeksIntoMemory = loadCustomMatchweeksIntoMemory;
window.isRoundHidden = isRoundHidden;
window.canUserSeeRound = canUserSeeRound;
window.unlockSecretPanel = unlockSecretPanel;
window.exitEditMode = exitEditMode;
