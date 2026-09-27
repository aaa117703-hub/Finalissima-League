/* =========================================================
   admin-matchweeks.js — إدارة المواجهات
========================================================= */

window._editingRound = null;
window._editingMatches = [];

/* ===== فتح صفحة الإدارة ===== */
function openSettingsMatchweeks() {
    if (typeof restoreSettingsContent === 'function') {
        restoreSettingsContent();
    }

    const body = document.getElementById('settingsBody');
    if (!body) return;

    let rows = '<div class="mwm-rounds-list">';
    for (let r = 1; r <= 38; r++) {
        const custom = window.customMatchweeks ? window.customMatchweeks[r] : null;
        const isHidden = custom ? custom.is_hidden : true;
        const matchCount = custom && custom.matches ? custom.matches.length : 0;
        const statusIcon = isHidden ? '🔒' : '👁️';
        const statusText = isHidden ? 'مخفي' : 'ظاهر';
        const statusClass = isHidden ? 'mwm-hidden' : 'mwm-visible';

        rows +=
            '<div class="mwm-round-row">' +
                '<div class="mwm-round-info">' +
                    '<div class="mwm-round-num">الجولة ' + r + '</div>' +
                    '<div class="mwm-round-meta">' + matchCount + ' مباريات • <span class="' + statusClass + '">' + statusIcon + ' ' + statusText + '</span></div>' +
                '</div>' +
                '<div class="mwm-round-actions">' +
                    '<button class="mwm-btn mwm-toggle" onclick="toggleRoundVisibility(' + r + ')">' + statusIcon + '</button>' +
                    '<button class="mwm-btn mwm-edit" onclick="openRoundEditor(' + r + ')">✏️</button>' +
                '</div>' +
            '</div>';
    }
    rows += '</div>';

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMain()">' +
            '<span class="si-icon">←</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div class="settings-hint" style="padding:8px 0;">' +
            'عند التعديل، تُحفظ المواجهات لكل المستخدمين' +
        '</div>' +
        rows;
}

/* ===== تبديل الإخفاء ===== */
async function toggleRoundVisibility(round) {
    const custom = window.customMatchweeks ? window.customMatchweeks[round] : null;
    const currentHidden = custom ? custom.is_hidden : true;
    const newHidden = !currentHidden;

    if (typeof showToast === 'function') {
        showToast('جاري التحديث...', false, 10000);
    }

    const result = await setRoundHidden(round, newHidden);

    if (result.ok) {
        if (!window.customMatchweeks) window.customMatchweeks = {};
        if (!window.customMatchweeks[round]) {
            window.customMatchweeks[round] = { matches: [], is_hidden: newHidden };
        } else {
            window.customMatchweeks[round].is_hidden = newHidden;
        }

        if (typeof showToast === 'function') {
            showToast(newHidden ? 'الجولة مخفية' : 'الجولة ظاهرة', true, 2000);
        }

        openSettingsMatchweeks();

        if (typeof renderFixtures === 'function') renderFixtures();
    } else {
        if (typeof showToast === 'function') {
            showToast('فشل التحديث', false, 3000);
        }
    }
}

/* ===== فتح محرر المباريات ===== */
function openRoundEditor(round) {
    const body = document.getElementById('settingsBody');
    if (!body) return;

    window._editingRound = round;

    /* جيب المباريات الحالية */
    const custom = window.customMatchweeks ? window.customMatchweeks[round] : null;
    let matches = [];

    if (custom && Array.isArray(custom.matches) && custom.matches.length > 0) {
        matches = custom.matches.map(function(m) { return [m[0], m[1]]; });
    } else if (window.matchweeks && window.matchweeks[round]) {
        matches = window.matchweeks[round].map(function(m) { return [m[0], m[1]]; });
    }

    window._editingMatches = matches;

    renderRoundEditor();
}

/* ===== رسم واجهة التحرير ===== */
function renderRoundEditor() {
    const body = document.getElementById('settingsBody');
    if (!body) return;

    const round = window._editingRound;
    const matches = window._editingMatches;

    /* قائمة المنتخبات */
    let teamOptions = '';
    const teamsList = Object.keys(teamsMap).sort();
    teamsList.forEach(function(code) {
        const t = teamsMap[code];
        teamOptions += '<option value="' + code + '">' + t.name + '</option>';
    });

    let rowsHtml = '';
    matches.forEach(function(m, idx) {
        const home = m[0] || '';
        const away = m[1] || '';
        rowsHtml +=
            '<div class="mwm-edit-row">' +
                '<select class="mwm-select" onchange="updateEditingMatch(' + idx + ',0,this.value)">' +
                    teamOptions +
                '</select>' +
                '<span class="mwm-vs">vs</span>' +
                '<select class="mwm-select" onchange="updateEditingMatch(' + idx + ',1,this.value)">' +
                    teamOptions +
                '</select>' +
                '<button class="mwm-del-btn" onclick="removeEditingMatch(' + idx + ')">🗑️</button>' +
            '</div>';
    });

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMatchweeks()">' +
            '<span class="si-icon">←</span>' +
            '<span class="si-label">رجوع للقائمة</span>' +
        '</button>' +
        '<div class="mwm-editor-title">تحرير الجولة ' + round + '</div>' +
        '<div class="mwm-edit-list" id="mwmEditList">' + rowsHtml + '</div>' +
        '<button class="mwm-add-btn" onclick="addEditingMatch()">➕ إضافة مباراة</button>' +
        '<button class="mwm-save-btn" onclick="saveRoundMatches()">💾 حفظ الجولة</button>';

    /* اختر القيم الحالية */
    setTimeout(function() {
        const selects = document.querySelectorAll('.mwm-select');
        let matchIdx = 0;
        selects.forEach(function(sel, i) {
            const idx = Math.floor(i / 2);
            const side = i % 2;
            const val = window._editingMatches[idx][side];
            if (val) sel.value = val;
        });
    }, 50);
}

function updateEditingMatch(idx, side, value) {
    if (!window._editingMatches[idx]) {
        window._editingMatches[idx] = ['', ''];
    }
    window._editingMatches[idx][side] = value;
}

function addEditingMatch() {
    window._editingMatches.push(['', '']);
    renderRoundEditor();
}

function removeEditingMatch(idx) {
    window._editingMatches.splice(idx, 1);
    renderRoundEditor();
}

async function saveRoundMatches() {
    const round = window._editingRound;
    const matches = window._editingMatches.filter(function(m) {
        return m[0] && m[1] && m[0] !== m[1];
    });

    if (matches.length === 0) {
        if (typeof showToast === 'function') {
            showToast('لازم تختار مباراة واحدة على الأقل', false, 3000);
        }
        return;
    }

    if (typeof showToast === 'function') {
        showToast('جاري الحفظ...', false, 10000);
    }

    const custom = window.customMatchweeks ? window.customMatchweeks[round] : null;
    const currentHidden = custom ? custom.is_hidden : true;

    const result = await saveCustomMatchweek(round, matches, currentHidden);

    if (result.ok) {
        if (!window.customMatchweeks) window.customMatchweeks = {};
        window.customMatchweeks[round] = {
            matches: matches,
            is_hidden: currentHidden
        };

        if (window.matchweeks) {
            window.matchweeks[round] = matches;
        }

        if (typeof showToast === 'function') {
            showToast('تم حفظ الجولة ' + round, true, 2500);
        }

        /* ارجع للقائمة */
        setTimeout(function() {
            openSettingsMatchweeks();
            if (typeof renderFixtures === 'function') renderFixtures();
        }, 800);
    } else {
        if (typeof showToast === 'function') {
            showToast('فشل الحفظ', false, 3000);
        }
    }
}

window.openSettingsMatchweeks = openSettingsMatchweeks;
window.toggleRoundVisibility = toggleRoundVisibility;
window.openRoundEditor = openRoundEditor;
window.updateEditingMatch = updateEditingMatch;
window.addEditingMatch = addEditingMatch;
window.removeEditingMatch = removeEditingMatch;
window.saveRoundMatches = saveRoundMatches;
