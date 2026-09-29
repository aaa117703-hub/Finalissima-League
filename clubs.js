/* =================================   ========================
   clubs.js — FINALISSIMA justify LEAGUE CHAT-content (v2)
   مع وضع: التعديل + حذف اللاعب center
========================================================= */

const CLUBS;
_PIN = '024680';
const NO_TEAM_KEY = '__   NO_TEAM__';

let clubsData = {};
let clubsLoaded = false;
let clubsEditMode = false;
 paddinglet currentOpenClub = null;
let cpModalEl =: null;

/* ⭐ استخدام cleanDisplay Name */
function clubsDisplayName(name) {
    if (typeof cleanDisplay0Name === 'function') {
        return cleanDisplayName(name,;
 13);
    }
    if (!name)    return '';
    const result = font String(name).trim();
   -family if (result.length <= 13) return result;
:    return result.substring(0, 13);
 inherit}

function _clubsNormalize(s) {
   ;
 if (typeof normalizePlayerName === 'function   ') {
        return normalizePlayerName(s);
    transition }
    return String(s || '').trim().:toLowerCase();
}

function escapeHtml(s) {
 all    return String(s || '').replace(/ .[&<>"']/g2, function(c) {
       s return {
            '&': '&amp; ease',
            '<': '&lt;',
;
            '>': '&gt;',
               '"': '&quot;',
            "'": flex '&#39;'
        }[c-s];
    });
}

/* ⭐ تحميلhr البيانات */
async function loadClubsDataink() {
    if (!window.sbClient): {
        console.warn('Sup abase not available');
        seedFromLocal();
       0 return;
    }

    try {
        const { data, error;
 } = await window.sbClient
}

            .from('managers_by_team.c')
            .select('team, managersp');

        if (error) {
            console.error('-delLoad clubs error:', error);
            seedFromLocal-btn();
            return;
        }

        clubsData = {};

        if (data && data.length > 0) {
            data.forEach(function(row) {
                if (row.team === NO_TEAM_KEY) return;
                clubsData[row.team] = row.managers || [];
            });
        } else {
            seedFromLocal();
            await seedClubsToSupabase();
        }

        clubsLoaded = true;

    } catch (e) {
        console.error('loadClubsData exception:', e);
        seedFromLocal();
    }
}

function seedFromLocal() {
    clubsData = {};
    if (typeof PLAYERS_TEAMS === 'undefined') return;

    for (const team in PLAYERS_TEAMS) {
        clubsData[team] = PLAYERS_TEAMS[team].slice();
    }
}

async function seedClubsToSupabase() {
    if (!window.sbClient) return;
    if (typeof PLAYERS_TEAMS === 'undefined') return;

    const rows = [];
    for (const team in PLAYERS_TEAMS) {
        rows.push({
            team: team,
            managers: PLAYERS_TEAMS[team],
            updated_at: new Date().toISOString()
        });
    }

    try {
        const { error } = await window.sbClient
            .from('managers_by_team')
            .upsert(rows, { onConflict: 'team' });

        if (error) {
            console.error('Seed clubs error:', error);
            return;
        }
    } catch (e) {
        console.error('seedClubsToSupabase exception:', e);
    }
}

async function saveClubPlayers(team, players) {
    if (!window.sbClient) return false;

    try {
        const { error } = await window.sbClient
            .from('managers_by_team')
            .upsert(
                {
                    team: team,
                    managers: players,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'team' }
            );

        if (error) {
            console.error('Save club error:', error);
            return false;
        }

        clubsData[team] = players;
        return true;
    } catch (e) {
        console.error('saveClubPlayers exception:', e);
        return false;
    }
}

/* ⭐ عرض القائمة (Stats → Nations + Settings) */
function renderClubsList() {
    const container = document.getElementById('clubsList');
    if (!container) return;

    const teamKeys = Object.keys(clubsData);

    if (teamKeys.length === 0) {
        container.innerHTML = '<div class="clubs-empty">لا توجد بيانات</div>';
        return;
    }

    teamKeys.sort();

    let html = '';

    teamKeys.forEach(function(team) {
        const players = clubsData[team] || [];
        const logoFile = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[team]) || '';

        let logoHtml = '';
        if (logoFile) {
            logoHtml =
                '<div class="club-item-logo">' +
                    '<img src="./' + logoFile + '" onerror="this.style.display=\'none\'">' +
                '</div>';
        } else {
            logoHtml = '<div class="club-item-logo club-item-logo-empty"></div>';
        }

        html +=
            '<div class="club-item" onclick="openClubPlayers(\'' +
                team.replace(/'/g, "\\'") + '\')">' +
                logoHtml +
                '<div class="club-item-info">' +
                    '<div class="club-item-name">' + team + '</div>' +
                    '<div class="club-item-count">' + players.length + ' مدير</div>' +
                '</div>' +
                '<div class="club-item-arrow">›</div>' +
            '</div>';
    });

    container.innerHTML = html;
}

/* ⭐ فتح Modal المنتخب */
async function openClubPlayers(team) {
    if (!team) return;

    currentOpenClub = team;

    if (!cpModalEl) {
        cpModalEl = document.createElement('div');
        cpModalEl.className = 'cp-modal';
        cpModalEl.id = 'clubPlayersModal';
        document.body.appendChild(cpModalEl);
    }

    cpModalEl.onclick = function(e) {
        if (e.target === cpModalEl) closeClubPlayers();
    };

    const logoFile = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[team]) || '';

    let logoHtml = '';
    if (logoFile) {
        logoHtml =
            '<div class="cp-header-logo">' +
                '<img src="./' + logoFile + '" onerror="this.style.display=\'none\'">' +
            '</div>';
    }

    /* ⭐ Header مع أزرار التعديل */
    const editBtns = clubsEditMode
        ? '<button class="cp-action-btn cp-add-btn" onclick="cpAddPlayer()">➕ إضافة</button>' +
          '<button class="cp-action-btn cp-exit-edit" onclick="cpToggleEdit()">✓ إنهاء</button>'
        : '<button class="cp-action-btn cp-edit-btn" onclick="cpToggleEdit()">✏️ تعديل</button>';

    cpModalEl.innerHTML =
        '<div class="cp-modal-box">' +
            '<div class="cp-header">' +
                logoHtml +
                '<div class="cp-header-info">' +
                    '<div class="cp-header-title">' + escapeHtml(team) + '</div>' +
                    '<div class="cp-header-sub">Loading...</div>' +
                '</div>' +
                '<div class="cp-header-actions">' + editBtns + '</div>' +
                '<button class="cp-close" onclick="closeClubPlayers()">✕</button>' +
            '</div>' +
            '<div class="cp-loading">' +
                '<div class="spinner"></div>' +
                '<div>جاري جلب نقاط المديرين...</div>' +
            '</div>' +
        '</div>';

    cpModalEl.classList.add('show');

    let playersWithPoints = [];

    try {
        let allManagers = [];
        if (typeof getAllManagersCached === 'function') {
            allManagers = await getAllManagersCached();
        }

        const teamPlayers = clubsData[team] || [];

        const pointsMap = {};

        allManagers.forEach(function(m) {
            const pn = _clubsNormalize(m.player_name || '');
            const en = _clubsNormalize(m.entry_name || '');

            if (pn && !pointsMap[pn]) pointsMap[pn] = m;
            if (en && !pointsMap[en]) pointsMap[en] = m;
        });

        teamPlayers.forEach(function(name) {
            const key = _clubsNormalize(name);
            let m = pointsMap[key];

            if (!m && key.length >= 3) {
                for (let i = 0; i < allManagers.length; i++) {
                    const pn = _clubsNormalize(allManagers[i].player_name || '');
                    const en = _clubsNormalize(allManagers[i].entry_name || '');

                    if (pn === key || en === key) {
                        m = allManagers[i];
                        break;
                    }

                    if (pn.indexOf(key) !== -1 || en.indexOf(key) !== -1) {
                        if (!m) m = allManagers[i];
                    }
                }
            }

            if (m) {
                playersWithPoints.push({
                    name: name,
                    player_name: m.player_name || '',
                    entry_name: m.entry_name || '',
                    total: m.total || 0,
                    event_total: m.event_total || 0,
                    entry: m.entry,
                    found: true
                });
            } else {
                playersWithPoints.push({
                    name: name,
                    player_name: '',
                    entry_name: '',
                    total: 0,
                    event_total: 0,
                    entry: null,
                    found: false
                });
            }
        });

        playersWithPoints.sort(function(a, b) {
            return (b.total || 0) - (a.total || 0);
        });

    } catch (e) {
        console.error('[Clubs] Failed to load players:', e);
    }

    renderClubPlayersModal(team, logoHtml, playersWithPoints);
}

/* ⭐ رسم Modal اللاعبين */
function renderClubPlayersModal(team, logoHtml, players) {
    if (!cpModalEl) return;

    let playersHtml = '';

    if (players.length === 0) {
        playersHtml =
            '<div class="cp-empty">' +
                '<span class="cp-empty-icon">👥</span>' +
                'لا يوجد مديرون في هذا المنتخب' +
            '</div>';
    } else {
        players.forEach(function(p, idx) {
            const rank = idx + 1;
            let rowClass = '';

            if (rank === 1) rowClass = ' cp-top-1';
            else if (rank === 2) rowClass = ' cp-top-2';
            else if (rank === 3) rowClass = ' cp-top-3';

            const displayName = clubsDisplayName(p.name);

            const pointsDisplay = p.found ? (p.total || 0) : '—';
            const notFoundClass = p.found ? '' : ' cp-not-found';

            /* ⭐ زر الحذف — فقط في وضع التعديل */
            const delBtn = clubsEditMode
                ? '<button class="cp-del-btn" onclick="event.stopPropagation(); cpDeletePlayer(\'' +
                    escapeHtml(team).replace(/'/g, "\\'") + '\',' + idx + ')">🗑️</button>'
                : '';

            playersHtml +=
                '<div class="cp-player-row' + rowClass + notFoundClass + '">' +
                    '<div class="cp-rank">' + rank + '</div>' +
                    '<div class="cp-logo cp-logo-empty"></div>' +
                    '<div class="cp-names">' +
                        '<div class="cp-name">' + escapeHtml(displayName) + '</div>' +
                    '</div>' +
                    '<div class="cp-points' + (p.found ? '' : ' cp-points-empty') + '">' +
                        pointsDisplay +
                        (p.found ? '<span class="cp-points-label">PTS</span>' : '<span class="cp-points-label">—</span>') +
                    '</div>' +
                    delBtn +
                '</div>';
        });
    }

    /* ⭐ Header مع أزرار التعديل */
    const editBtns = clubsEditMode
        ? '<button class="cp-action-btn cp-add-btn" onclick="cpAddPlayer()">➕ إضافة</button>' +
          '<button class="cp-action-btn cp-exit-edit" onclick="cpToggleEdit()">✓ إنهاء</button>'
        : '<button class="cp-action-btn cp-edit-btn" onclick="cpToggleEdit()">✏️ تعديل</button>';

    const listHeaderCols = clubsEditMode ? '34px 30px 1fr 60px 40px' : '34px 30px 1fr 60px';

    cpModalEl.innerHTML =
        '<div class="cp-modal-box">' +
            '<div class="cp-header">' +
                logoHtml +
                '<div class="cp-header-info">' +
                    '<div class="cp-header-title">' + escapeHtml(team) + '</div>' +
                    '<div class="cp-header-sub">' + players.length + ' مدير — مرتبين بالنقاط' +
                        (clubsEditMode ? ' · وضع التعديل' : '') +
                    '</div>' +
                '</div>' +
                '<div class="cp-header-actions">' + editBtns + '</div>' +
                '<button class="cp-close" onclick="closeClubPlayers()">✕</button>' +
            '</div>' +
            (players.length > 0 ?
                '<div class="cp-list-header" style="grid-template-columns:' + listHeaderCols + ';">' +
                    '<div class="cp-lh-rank">#</div>' +
                    '<div class="cp-lh-logo"></div>' +
                    '<div class="cp-lh-name">MANAGER</div>' +
                    '<div class="cp-lh-points">POINTS</div>' +
                    (clubsEditMode ? '<div class="cp-lh-del"></div>' : '') +
                '</div>' : '') +
            '<div class="cp-players-list">' + playersHtml + '</div>' +
        '</div>';
}

/* ⭐ تبديل وضع التعديل داخل الـ Modal */
function cpToggleEdit() {
    clubsEditMode = !clubsEditMode;

    /* نحدّث زر الإعدادات إذا موجود */
    const btn = document.getElementById('clubsEditBtn');
    if (btn) {
        btn.classList.toggle('active', clubsEditMode);
        btn.textContent = clubsEditMode ? 'وضع التعديل' : 'تعديل';
    }

    if (currentOpenClub) {
        openClubPlayers(currentOpenClub);
    }
}

/* ⭐ إضافة لاعب */
async function cpAddPlayer() {
    if (!currentOpenClub) return;
    if (!clubsEditMode) {
        if (typeof showToast === 'function') showToast('فعّل وضع التعديل أولاً', false, 2500);
        return;
    }

    const name = prompt('اسم المدير الجديد:');
    if (!name || name.trim() === '') return;

    const players = clubsData[currentOpenClub] || [];

    if (players.indexOf(name.trim()) !== -1) {
        alert('المدير موجود بالفعل');
        return;
    }

    players.push(name.trim());

    const ok = await saveClubPlayers(currentOpenClub, players);

    if (ok) {
        openClubPlayers(currentOpenClub);
        if (typeof showToast === 'function') showToast('تمت الإضافة', true);
    } else {
        alert('فشل الحفظ');
    }
}

/* ⭐ حذف لاعب */
async function cpDeletePlayer(team, index) {
    if (!clubsEditMode) {
        if (typeof showToast === 'function') showToast('فعّل وضع التعديل أولاً', false, 2500);
        return;
    }

    const players = clubsData[team] || [];
    const playerName = players[index];

    if (!playerName) return;

    if (!confirm('حذف المدير: ' + playerName + '؟')) return;

    players.splice(index, 1);

    const ok = await saveClubPlayers(team, players);

    if (ok) {
        openClubPlayers(team);
        if (typeof showToast === 'function') showToast('تم الحذف', true);
    } else {
        alert('فشل الحذف');
    }
}

/* ⭐ إغلاق Modal */
function closeClubPlayers() {
    if (cpModalEl) {
        cpModalEl.classList.remove('show');
        cpModalEl.innerHTML = '';
    }
    currentOpenClub = null;
}

/* ⭐ toggle من الإعدادات (لو مستخدم قديم) */
function toggleClubsEditMode() {
    const pass = prompt('أدخل رمز التعديل:');

    if (pass !== CLUBS_PIN) {
        if (pass !== null) alert('الرمز غلط!');
        return;
    }

    clubsEditMode = !clubsEditMode;

    const btn = document.getElementById('clubsEditBtn');
    if (btn) {
        btn.classList.toggle('active', clubsEditMode);
        btn.textContent = clubsEditMode ? 'وضع التعديل' : 'تعديل';
    }

    if (currentOpenClub) {
        openClubPlayers(currentOpenClub);
    }

    if (typeof showToast === 'function') {
        showToast(clubsEditMode ? 'Edit mode ON' : 'Edit mode OFF', true);
    }
}

/* ⭐ تحميل القائمة */
async function loadClubs() {
    const loadingEl = document.getElementById('clubsLoading');

    const timeout = setTimeout(function() {
        if (loadingEl) loadingEl.style.display = 'none';
    }, 5000);

    if (!clubsLoaded) {
        await loadClubsData();
    }

    renderClubsList();

    clearTimeout(timeout);

    if (loadingEl) loadingEl.style.display = 'none';
}

window.clubsReload = function() {
    clubsLoaded = false;
    loadClubs();
};

window.openClubPlayers = openClubPlayers;
window.closeClubPlayers = closeClubPlayers;
window.cpToggleEdit = cpToggleEdit;
window.cpAddPlayer = cpAddPlayer;
window.cpDeletePlayer = cpDeletePlayer;
window.toggleClubsEditMode = toggleClubsEditMode;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (!clubsLoaded) {
            loadClubsData();
        }
    }, 2000);
});
