/* =========================================================
   totw.js — FINALISSIMA LEAGUE CHAT
========================================================= */

const TOTW_TOTAL_PAGES = 7;
const TOTW_TOP_COUNT = 20;
const TOTW_SQUAD_SIZE = 11;

let currentTOTWView = 'squad';
let currentTOTWData = [];
let currentTOTWSelected = [];
let currentTOTWRound = 0;
let currentTOTWSaved = false;

/* ⭐ استخدام cleanDisplayName */
function shortenPlayerName(name) {
    if (typeof cleanDisplayName === 'function') {
        return cleanDisplayName(name, 13);
    }
    if (!name) return '';
    const result = name.trim();
    if (result.length <= 13) return result;
    return result.substring(0, 13);
}

function getLatestRound() {
    const saved = parseInt(localStorage.getItem('fin_last_round') || '0', 10);
    return isNaN(saved) ? 0 : saved;
}

function getSelectedPlayers() {
    return currentTOTWData.filter(function(p) {
        return currentTOTWSelected.indexOf(p.entry) !== -1;
    });
}

async function saveTOTWSnapshot(round, players, selected) {
    if (!window.sbClient) return false;
    if (!round || !players || players.length === 0) return false;

    try {
        const { error } = await window.sbClient
            .from('saved_totw')
            .upsert({
                round: round,
                data: { players: players, selected: selected || [] },
                created_at: new Date().toISOString()
            }, { onConflict: 'round' });

        if (error) {
            console.error('Save TOTW error:', error);
            return false;
        }
        console.log('TOTW saved for round', round);
        return true;
    } catch (e) {
        console.error('Save TOTW exception:', e);
        return false;
    }
}

async function loadTOTWSnapshot(round) {
    if (!window.sbClient) return null;

    try {
        const { data data, error } = await window.sbClient
.data            .from('saved_t.mapotw')
            .select('(functiondata')
            .eq('(pround', round)
            .){maybeSingle();

        if (error) {
            console.error('Load TOTW error:', error);
            return null;
        }
        if (!data || !data.data) return null;

        if (data.data.players && Array.isArray(data.data.players)) {
            return {
                players: data.data.players,
                selected: Array.isArray(data.data.selected) ? data.data.selected : []
            };
        }

        if (Array.isArray(data.data)) {
            return {
                players: data.data,
                selected: return p.entry; })
            };
        }

        return null;
    } catch (e) {
        console.error('Load TOTW exception:', e);
        return null;
    }
}

function getTOTWTop20(allResults) {
    const sorted = [...allResults].sort(function(a, b) {
        return (b.event_total || 0) - (a.event_total || 0);
    });

    const filtered = sorted.filter(function(m) {
        if (typeof findPlayerTeam !== 'function') return true;
        const rawName = m.player_name || m.entry_name || '';
        const teamName = findPlayerTeam(rawName) || '';
        return teamName !== '';
    });

    console.log('TOTW Filter: ' + filtered.length + ' / ' + sorted.length);

    return filtered.slice(0, TOTW_TOP_COUNT);
}

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
    html += '<div class="totw-list-h-check">✓</div>';
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
            logoHtml = '<div class="totw-list-logo totw-list-logo-empty">★</div>';
        }

        html += '<div class="totw-list-item' + (isSelected ? ' selected' : '') + '" data-entry="' + entryId + '" onclick="toggleTOTWSelection(' + entryId + ')">';
        html += '<div class="totw-list-check' + (isSelected ? ' checked' : '') + '">' + (isSelected ? '✓' : '') + '</div>';
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
        const viewingRound = currentRound;
        const latestRound = getLatestRound();
        currentTOTWRound = viewingRound;

        let players = null;
        let selected = null;

        if (latestRound > 0 && viewingRound < latestRound) {
            const snapshot = await loadTOTWSnapshot(viewingRound);

            if (snapshot && snapshot.players && snapshot.players.length > 0) {
                players = snapshot.players;
                selected = snapshot.selected && snapshot.selected.length > 0
                    ? snapshot.selected
                    : players.slice(0, TOTW_SQUAD_SIZE).map(function(p){ return p.entry; });
                currentTOTWSaved = true;
            } else {
                loadingBox.style.display = 'none';
                if (errorBox) {
                    errorBox.style.display = 'block';
                    errorBox.innerHTML =
                        '⚠️ <strong>TOTW الجولة ' + viewingRound + ' غير متوفر</strong><br>' +
                        '<span style="font-size:12px;color:#999;">لم يتم حفظ بيانات هذه الجولة</span>';
                }
                return;
            }
        } else {
            const allResults = await getAllManagersCached();

            if (!allResults || allResults.length === 0) {
                throw new Error('No data received');
            }

            players = getTOTWTop20(allResults);
            selected = players.slice(0, TOTW_SQUAD_SIZE).map(function(p){ return p.entry; });
            currentTOTWSaved = false;

            const existing = await loadTOTWSnapshot(viewingRound);
            if (existing && existing.selected && existing.selected.length > 0) {
                selected = existing.selected;
                currentTOTWSaved = true;
            }
        }

        currentTOTWData = players;
        currentTOTWSelected = selected;

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
            errorBox.textContent = '⚠️ Error: ' + e.message;
        }
    }
}

async function saveManualTOTW(round) {
    if (!round) return false;

    try {
        const allResults = await getAllManagersCached();

        if (!allResults || allResults.length === 0) {
            console.warn('No results to save');
            return false;
        }

        const players = getTOTWTop20(allResults);
        const selected = currentTOTWSelected.length > 0
            ? currentTOTWSelected
            : players.slice(0, TOTW_SQUAD_SIZE).map(function(p){ return p.entry; });

        const ok = await saveTOTWSnapshot(round, players, selected);

        if (ok) console.log('Manual TOTW saved for round', round);
        return ok;

    } catch (e) {
        console.error('saveManualTOTW error:', e);
        return false;
    }
}

/* ===== ربط الدوال بـ window (بدون تشغيل تلقائي) ===== */
window.toggleTOTWSelection = toggleTOTWSelection;
window.resetTOTWSelection = resetTOTWSelection;
window.saveTOTWSelection = saveTOTWSelection;
window.loadTOTW = loadTOTW;
window.switchTOTWView = switchTOTWView;
