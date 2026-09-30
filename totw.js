/* =========================================================
   totw.js — FINALISSIMA LEAGUE CHAT (v5 / v=123)
   Phosphor Icons + تشكيلة الأسبوع فقط
========================================================= */

const TOTW_TOP_COUNT = 20;
const TOTW_SQUAD_SIZE = 11;

let currentTOTWView = 'squad';
let currentTOTWData = [];
let currentTOTWSelected = [];
let currentTOTWRound = 0;
let currentTOTWSaved = false;

/* ---------- Phosphor Icons Helper ---------- */
function xIcon(name, variant) {
    variant = variant || 'regular';
    const variantClass = variant === 'fill' ? 'ph-fill' :
                         variant === 'bold' ? 'ph-bold' :
                         variant === 'duotone' ? 'ph-duotone' :
                         'ph';
    return '<i class="' + variantClass + ' ph-' + name + '"></i>';
}

/* =========================================================
   Helpers
========================================================= */

function shortenPlayerName(name) {
    if (typeof cleanDisplayName === 'function') {
        return cleanDisplayName(name, 13);
    }
    if (!name) return '';
    const result = name.trim();
    if (result.length <= 13) return result;
    return result.substring(0, 13);
}

function getSelectedPlayers() {
    return currentTOTWData.filter(function(p) {
        return currentTOTWSelected.indexOf(p.entry) !== -1;
    });
}

/* =========================================================
   جيب Top 20 للجولة
========================================================= */

async function getTOTWTop20ForRound(round) {
    if (typeof getManagersForRound !== 'function') {
        console.warn('[TOTW] getManagersForRound not available');
        return [];
    }

    const managers = await getManagersForRound(round);

    if (!managers || managers.length === 0) {
        console.warn('[TOTW] No managers for round ' + round);
        return [];
    }

    const filtered = managers.filter(function(m) {
        if (typeof findPlayerTeam !== 'function') return true;
        const rawName = m.player_name || m.entry_name || '';
        const teamName = findPlayerTeam(rawName) || '';
        return teamName !== '';
    });

    const sorted = filtered.sort(function(a, b) {
        return (b.event_total || 0) - (a.event_total || 0);
    });

    console.log('[TOTW] Round ' + round + ' — Top20: ' + sorted.length);

    return sorted.slice(0, TOTW_TOP_COUNT);
}

/* =========================================================
   Switch View
========================================================= */

function switchTOTWView(view) {
    currentTOTWView = view;

    const squadBtn = document.getElementById('totwSquadBtn');
    const listBtn = document.getElementById('totwListBtn');

    if (squadBtn) squadBtn.classList.toggle('active', view === 'squad');
    if (listBtn) listBtn.classList.toggle('active', view === 'list');

    const pitchWrapper = document.getElementById('totwPitchWrapper');
    const listWrapper = document.getElementById('totwListWrapper');

    if (view === 'list') {
        if (pitchWrapper) pitchWrapper.style.display = 'none';
        if (listWrapper) listWrapper.style.display = 'block';
    } else {
        if (pitchWrapper) pitchWrapper.style.display = 'flex';
        if (listWrapper) listWrapper.style.display = 'none';
        renderTOTWCards(getSelectedPlayers());
    }
}

/* =========================================================
   Render Cards (Pitch)
========================================================= */

function renderTOTWCards(selectedPlayers) {
    const pitch = document.getElementById('totwPlayers');
    if (!pitch) return;

    const sorted = [...(selectedPlayers || [])].sort(function(a, b) {
        return (b.event_total || 0) - (a.event_total || 0);
    });

    const fwd = sorted.slice(0, 3);
    const mid = sorted.slice(3, 6);
    const def = sorted.slice(6, 10);
    const gk  = sorted.slice(10, 11);

    let html = '';

    html += '<div class="totw-row totw-row-gk">';
    html += gk.map(createTOTWCard).join('');
    html += '</div>';

    html += '<div class="totw-row totw-row-def">';
    html += def.map(createTOTWCard).join('');
    html += '</div>';

    html += '<div class="totw-row totw-row-mid">';
    html += mid.map(createTOTWCard).join('');
    html += '</div>';

    html += '<div class="totw-row totw-row-fwd">';
    html += fwd.map(createTOTWCard).join('');
    html += '</div>';

    pitch.innerHTML = html;
}

function createTOTWCard(player) {
    if (!player) return '';

    const rawName = player.player_name || player.entry_name || 'Unknown';
    const name = shortenPlayerName(rawName);
    const points = player.event_total || 0;

    let teamName = '';
    if (typeof findPlayerTeam === 'function') {
        teamName = findPlayerTeam(rawName) || '';
    }

    let shirtHtml = '';

    if (teamName && typeof TEAMS_SHIRTS !== 'undefined' && TEAMS_SHIRTS[teamName]) {
        shirtHtml =
            '<div class="tc-shirt">' +
                '<img src="./' + TEAMS_SHIRTS[teamName].file + '" alt="" onerror="this.style.display=\'none\'">' +
            '</div>';
    } else if (teamName && typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[teamName]) {
        shirtHtml =
            '<div class="tc-shirt tc-shirt-fallback">' +
                '<img src="./' + TEAMS_LOGOS[teamName] + '" alt="" onerror="this.style.display=\'none\'">' +
            '</div>';
    } else {
        shirtHtml = '<div class="tc-shirt tc-shirt-empty"></div>';
    }

    return '<div class="totw-card">' +
        shirtHtml +
        '<div class="tc-name">' + name + '</div>' +
        '<div class="tc-points">' + points + '</div>' +
    '</div>';
}

/* =========================================================
   Render List
========================================================= */

function renderTOTWList(players) {
    const listWrapper = document.getElementById('totwListWrapper');
    if (!listWrapper) return;

    let html = '';

    const saveClass = currentTOTWSaved ? ' saved' : '';
    const saveText = currentTOTWSaved ? 'SAVED' : 'SAVE';

    html += '<div class="totw-count-bar">';
    html += '<div>Selected: <span class="count-num' + (currentTOTWSelected.length === TOTW_SQUAD_SIZE ? ' full' : '') + '">' + currentTOTWSelected.length + '</span> / ' + TOTW_SQUAD_SIZE + '</div>';
    html += '<div class="totw-actions">';
    html += '<button class="save-btn' + saveClass + '" onclick="saveTOTWSelection()">' + saveText + '</button>';
    html += '<button class="reset-btn" onclick="resetTOTWSelection()">Reset</button>';
    html += '</div>';
    html += '</div>';

    html += '<div class="totw-list-header">';
    html += '<div class="totw-list-h-check">' + xIcon('check', 'bold') + '</div>';
    html += '<div class="totw-list-h-rank">#</div>';
    html += '<div class="totw-list-h-logo"></div>';
    html += '<div class="totw-list-h-team">Team & Manager</div>';
    html += '<div class="totw-list-h-gw">GW</div>';
    html += '<div class="totw-list-h-total">Total</div>';
    html += '</div>';

    players.forEach(function(player, index) {
        const entryId = player.entry;
        const rawName = player.player_name || player.entry_name || 'Unknown';
        const displayName = shortenPlayerName(rawName);
        const points = player.event_total || 0;
        const total = player.total || 0;
        const isSelected = currentTOTWSelected.indexOf(entryId) !== -1;

        let teamName = '';
        if (typeof findPlayerTeam === 'function') {
            teamName = findPlayerTeam(rawName) || '';
        }

        let logoHtml = '';
        if (teamName && typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[teamName]) {
            logoHtml = '<div class="totw-list-logo">' +
                '<img src="./' + TEAMS_LOGOS[teamName] + '" onerror="this.style.display=\'none\'">' +
            '</div>';
        } else {
            logoHtml = '<div class="totw-list-logo totw-list-logo-empty">' + xIcon('star', 'fill') + '</div>';
        }

        html += '<div class="totw-list-item' + (isSelected ? ' selected' : '') + '" data-entry="' + entryId + '" onclick="toggleTOTWSelection(' + entryId + ')">';
        html += '<div class="totw-list-check' + (isSelected ? ' checked' : '') + '">' + (isSelected ? xIcon('check', 'bold') : '') + '</div>';
        html += '<div class="totw-list-rank">' + (index + 1) + '</div>';
        html += logoHtml;
        html += '<div class="totw-list-names">';
        html += '<div class="totw-list-entry">' + displayName + '</div>';
        html += '<div class="totw-list-player">' + rawName + '</div>';
        html += '</div>';
        html += '<div class="totw-list-gw">' + points + '</div>';
        html += '<div class="totw-list-total">' + total + '</div>';
        html += '</div>';
    });

    listWrapper.innerHTML = html;
}

/* =========================================================
   Selection
========================================================= */

function toggleTOTWSelection(entryId) {
    const idx = currentTOTWSelected.indexOf(entryId);

    if (idx !== -1) {
        currentTOTWSelected.splice(idx, 1);
    } else {
        if (currentTOTWSelected.length >= TOTW_SQUAD_SIZE) {
            if (typeof showToast === 'function') {
                showToast('Squad full (11)', false);
            } else {
                alert('التشكيلة كاملة');
            }
            return;
        }
        currentTOTWSelected.push(entryId);
    }

    currentTOTWSaved = false;
    renderTOTWCards(getSelectedPlayers());
    renderTOTWList(currentTOTWData);
}

function resetTOTWSelection() {
    currentTOTWSelected = currentTOTWData.slice(0, TOTW_SQUAD_SIZE).map(function(p) {
        return p.entry;
    });
    currentTOTWSaved = false;

    renderTOTWCards(getSelectedPlayers());
    renderTOTWList(currentTOTWData);
}

async function saveTOTWSelection() {
    if (!currentTOTWRound) {
        if (typeof showToast === 'function') showToast('No round loaded', false);
        return;
    }

    if (typeof showToast === 'function') showToast('Saving...', false);

    if (typeof saveTOTWSnapshot !== 'function') {
        if (typeof showToast === 'function') showToast('Save not available', false);
        return;
    }

    const ok = await saveTOTWSnapshot(
        currentTOTWRound,
        currentTOTWData,
        currentTOTWSelected
    );

    if (ok) {
        currentTOTWSaved = true;
        renderTOTWList(currentTOTWData);
        if (typeof showToast === 'function') showToast('Saved!', true);
    } else {
        if (typeof showToast === 'function') showToast('Save failed', false);
    }
}

/* =========================================================
   Load TOTW (Week Mode)
========================================================= */

async function loadTOTW() {
    const loadingBox = document.getElementById('totwLoadingBox');
    const pitchWrapper = document.getElementById('totwPitchWrapper');
    const listWrapper = document.getElementById('totwListWrapper');
    const errorBox = document.getElementById('totwErrorBox');

    if (!loadingBox) return;

    loadingBox.style.display = 'block';
    if (pitchWrapper) pitchWrapper.style.display = 'none';
    if (listWrapper) listWrapper.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';

    try {
        const round = currentRound || 1;
        currentTOTWRound = round;

        const players = await getTOTWTop20ForRound(round);

        if (!players || players.length === 0) {
            loadingBox.style.display = 'none';
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML =
                    xIcon('warning-circle', 'duotone') + ' <strong>بيانات الجولة ' + round + ' غير متوفرة</strong><br>' +
                    '<span style="font-size:12px;color:#999;">لم يتم حفظ بيانات هذه الجولة</span>';
            }
            return;
        }

        const selected = players.slice(0, TOTW_SQUAD_SIZE).map(function(p) {
            return p.entry;
        });

        currentTOTWData = players;
        currentTOTWSelected = selected;
        currentTOTWSaved = true;

        const gwLabel = document.getElementById('totwGwLabel');
        if (gwLabel) {
            gwLabel.textContent = 'GW' + round;
        }

        renderTOTWCards(getSelectedPlayers());
        renderTOTWList(players);

        loadingBox.style.display = 'none';

        if (currentTOTWView === 'list') {
            if (listWrapper) listWrapper.style.display = 'block';
        } else {
            if (pitchWrapper) pitchWrapper.style.display = 'flex';
        }

    } catch (e) {
        console.error('TOTW Error:', e);
        loadingBox.style.display = 'none';
        if (errorBox) {
            errorBox.style.display = 'block';
            errorBox.innerHTML = xIcon('warning-circle', 'duotone') + ' Error: ' + e.message;
        }
    }
}

/* =========================================================
   Window
========================================================= */

window.toggleTOTWSelection = toggleTOTWSelection;
window.resetTOTWSelection = resetTOTWSelection;
window.saveTOTWSelection = saveTOTWSelection;
window.loadTOTW = loadTOTW;
window.switchTOTWView = switchTOTWView;
window.getTOTWTop20ForRound = getTOTWTop20ForRound;
