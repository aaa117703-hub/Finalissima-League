/* =========================================================
   admin-matchweeks.js — إدارة المواجهات (مع منع التكرار)
========================================================= */

window._editingRound = null;
window._editingMatches = [];
window._pickingSide = null;

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
    if (typeof setRoundHidden !== 'function') {
        if (typeof showToast === 'function') showToast('setRoundHidden not available', false, 3000);
        return;
    }

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

/* ===== رسم واجهة التحرير — بطاقات ===== */
function renderRoundEditor() {
    const body = document.getElementById('settingsBody');
    if (!body) return;

    const round = window._editingRound;
    const matches = window._editingMatches;

    let cardsHtml = '';
    matches.forEach(function(m, idx) {
        cardsHtml += renderMatchCard(m, idx);
    });

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMatchweeks()">' +
            '<span class="si-icon">←</span>' +
            '<span class="si-label">رجوع للقائمة</span>' +
        '</button>' +

        '<div class="mwm-editor-header">' +
            '<div class="mwm-editor-title">الجولة ' + round + '</div>' +
            '<div class="mwm-editor-sub">' + matches.length + ' مباريات</div>' +
        '</div>' +

        '<div class="mwm-edit-list" id="mwmEditList">' + cardsHtml + '</div>' +

        '<button class="mwm-add-btn" onclick="addEditingMatch()">➕ إضافة مباراة</button>' +
        '<button class="mwm-save-btn" onclick="saveRoundMatches()">💾 حفظ الجولة</button>';
}

/* ===== رسم بطاقة مباراة ===== */
function renderMatchCard(match, idx) {
    const home = match[0] || '';
    const away = match[1] || '';

    const homeInfo = (typeof teamsMap !== 'undefined' && teamsMap[home]) ? teamsMap[home] : null;
    const awayInfo = (typeof teamsMap !== 'undefined' && teamsMap[away]) ? teamsMap[away] : null;

    let homeLogoHtml = '';
    if (homeInfo && homeInfo.logo) {
        homeLogoHtml = '<img class="mwm-team-logo" src="./' + homeInfo.logo + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
        homeLogoHtml = '<div class="mwm-team-placeholder">?</div>';
    }

    let awayLogoHtml = '';
    if (awayInfo && awayInfo.logo) {
        awayLogoHtml = '<img class="mwm-team-logo" src="./' + awayInfo.logo + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
        awayLogoHtml = '<div class="mwm-team-placeholder">?</div>';
    }

    const homeName = homeInfo ? homeInfo.name : 'اختر';
    const awayName = awayInfo ? awayInfo.name : 'اختر';

    return '<div class="mwm-match-card">' +
        '<button class="mwm-del-btn" onclick="removeEditingMatch(' + idx + ')">✕</button>' +
        '<button class="mwm-team-pick' + (home ? ' picked' : '') + '" onclick="openTeamPicker(' + idx + ', 0)">' +
            homeLogoHtml +
            '<div class="mwm-team-name">' + homeName + '</div>' +
        '</button>' +
        '<div class="mwm-vs-badge">VS</div>' +
        '<button class="mwm-team-pick' + (away ? ' picked' : '') + '" onclick="openTeamPicker(' + idx + ', 1)">' +
            awayLogoHtml +
            '<div class="mwm-team-name">' + awayName + '</div>' +
        '</button>' +
    '</div>';
}

/* ===== فتح Modal اختيار المنتخب (مع استثناء المستخدمين) ===== */
function openTeamPicker(matchIdx, side) {
    if (typeof teamsMap === 'undefined') {
        if (typeof showToast === 'function') showToast('teamsMap not loaded', false, 3000);
        return;
    }

    window._pickingSide = { matchIdx: matchIdx, side: side };

    let modal = document.getElementById('mwmPickerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mwmPickerModal';
        modal.className = 'mwm-picker-modal';
        document.body.appendChild(modal);
    }

    /* ⭐ تجميع المنتخبات المستخدمة في المباريات الأخرى */
    const usedTeams = getUsedTeamsExcept(matchIdx, side);

    let itemsHtml = '';
    let availableCount = 0;
    const teamsList = Object.keys(teamsMap).sort(function(a, b) {
        return (teamsMap[a].name || '').localeCompare(teamsMap[b].name || '');
    });

    teamsList.forEach(function(code) {
        const t = teamsMap[code];
        if (!t) return;

        const isUsed = usedTeams[code] === true;

        const logo = t.logo || '';
        const name = t.name || code;

        if (isUsed) {
            itemsHtml +=
                '<button class="mwm-picker-item mwm-picker-item-disabled" disabled>' +
                    '<img src="./' + logo + '" alt="" onerror="this.style.display=\'none\'">' +
                    '<div class="mwm-picker-item-name">' + name + '</div>' +
                    '<div class="mwm-picker-item-used">مُستخدم</div>' +
                '</button>';
        } else {
            availableCount++;
            itemsHtml +=
                '<button class="mwm-picker-item" onclick="selectTeam(\'' + code + '\')" data-name="' + name.toLowerCase() + '">' +
                    '<img src="./' + logo + '" alt="" onerror="this.style.display=\'none\'">' +
                    '<div class="mwm-picker-item-name">' + name + '</div>' +
                '</button>';
        }
    });

    modal.innerHTML =
        '<div class="mwm-picker-box">' +
            '<div class="mwm-picker-header">' +
                '<div class="mwm-picker-title">اختر المنتخب</div>' +
                '<button class="mwm-picker-close" onclick="closeTeamPicker()">✕</button>' +
            '</div>' +
            '<div class="mwm-picker-search">' +
                '<input type="text" id="mwmPickerSearch" placeholder="🔍 ابحث..." oninput="filterTeamPicker(this.value)" autocomplete="off">' +
            '</div>' +
            '<div class="mwm-picker-info">' +
                'متاح: ' + availableCount + ' / ' + teamsList.length +
            '</div>' +
            '<div class="mwm-picker-list" id="mwmPickerList">' +
                itemsHtml +
            '</div>' +
        '</div>';

    modal.style.display = 'flex';
}

/* ===== حساب المنتخبات المستخدمة (باستثناء الجانب الحالي) ===== */
function getUsedTeamsExcept(matchIdx, side) {
    const used = {};
    if (!window._editingMatches) return used;

    window._editingMatches.forEach(function(m, idx) {
        if (!m) return;

        /* تجاهل الجهة الحالية — نسمح بإعادة اختيار نفس المنتخب */
        const skipHome = (idx === matchIdx && side === 0);
        const skipAway = (idx === matchIdx && side === 1);

        if (!skipHome && m[0]) used[m[0]] = true;
        if (!skipAway && m[1]) used[m[1]] = true;
    });

    return used;
}

function closeTeamPicker() {
    const modal = document.getElementById('mwmPickerModal');
    if (modal) modal.style.display = 'none';
    window._pickingSide = null;
}

function filterTeamPicker(query) {
    const list = document.getElementById('mwmPickerList');
    if (!list) return;

    const q = query.toLowerCase().trim();
    const items = list.querySelectorAll('.mwm-picker-item:not(.mwm-picker-item-disabled)');

    items.forEach(function(item) {
        const name = item.getAttribute('data-name') || '';
        if (q === '' || name.indexOf(q) !== -1) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function selectTeam(code) {
    if (!window._pickingSide) return;

    const side = window._pickingSide.side;
    const matchIdx = window._pickingSide.matchIdx;

    if (!window._editingMatches[matchIdx]) {
        window._editingMatches[matchIdx] = ['', ''];
    }
    window._editingMatches[matchIdx][side] = code;

    closeTeamPicker();
    renderRoundEditor();
}

/* ===== تعديل/إضافة/حذف ===== */
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

/* ===== حفظ الجولة ===== */
async function saveRoundMatches() {
    if (typeof saveCustomMatchweek !== 'function') {
        if (typeof showToast === 'function') showToast('saveCustomMatchweek not available', false, 3000);
        return;
    }

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

    /* ⭐ فحص نهائي — ما فيه تكرار */
    const used = {};
    let hasDupe = false;
    matches.forEach(function(m) {
        if (used[m[0]]) hasDupe = true;
        if (used[m[1]]) hasDupe = true;
        used[m[0]] = true;
        used[m[1]] = true;
    });

    if (hasDupe) {
        if (typeof showToast === 'function') {
            showToast('⚠️ فيه منتخب مكرر! تأكد من المباريات', false, 4000);
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
window.openTeamPicker = openTeamPicker;
window.closeTeamPicker = closeTeamPicker;
window.filterTeamPicker = filterTeamPicker;
window.selectTeam = selectTeam;
window.getUsedTeamsExcept = getUsedTeamsExcept;
