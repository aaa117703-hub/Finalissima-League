/* =========================================================
   stats.js — FINALISSIMA LEAGUE CHAT (v5)
   Phosphor Icons + قفل تشكيلة الشهر
========================================================= */

let statsAllManagers = [];
let statsSortedByTotal = [];
let statsRankMap = {};
let statsLoaded = false;
let statsComputed = null;

let currentMonthView = 'squad';
let currentMonthData = [];
let currentMonthSelected = [];
let currentMonthNum = 0;

/* Helper: أيقونة Phosphor */
function statsIcon(name, variant) {
    variant = variant || 'regular';
    const variantClass = variant === 'fill' ? 'ph-fill' :
                         variant === 'bold' ? 'ph-bold' :
                         variant === 'duotone' ? 'ph-duotone' :
                         'ph';
    return '<i class="' + variantClass + ' ph-' + name + '"></i>';
}

function statsDisplayName(name) {
    if (typeof cleanDisplayName === 'function') {
        return cleanDisplayName(name, 13);
    }
    if (!name) return '';
    const result = String(name).trim();
    if (result.length <= 13) return result;
    return result.substring(0, 13);
}

async function fetchAllManagersForStats() {
    if (typeof getManagersWithHistory !== 'function') {
        console.warn('[Stats] getManagersWithHistory not available');
        return [];
    }

    return await getManagersWithHistory();
}

function computeLeagueStats(managers) {
    if (!managers || managers.length === 0) return null;

    const totalManagers = managers.length;
    let sumEvent = 0;
    let sumTotal = 0;
    let highestEvent = 0;
    let highestTotal = 0;
    let lowestEvent = Infinity;

    managers.forEach(function(m) {
        const ev = m.event_total || 0;
        const to = m.total || 0;
        sumEvent += ev;
        sumTotal += to;
        if (ev > highestEvent) highestEvent = ev;
        if (ev < lowestEvent) lowestEvent = ev;
        if (to > highestTotal) highestTotal = to;
    });

    const avgEvent = Math.round(sumEvent / totalManagers);
    const avgTotal = Math.round(sumTotal / totalManagers);

    const sortedByEvent = [...managers].sort(function(a, b) {
        return (b.event_total || 0) - (a.event_total || 0);
    });

    const sortedByTotal = [...managers].sort(function(a, b) {
        return (b.total || 0) - (a.total || 0);
    });

    return {
        totalManagers: totalManagers,
        avgEvent: avgEvent,
        avgTotal: avgTotal,
        highestEvent: highestEvent,
        lowestEvent: lowestEvent === Infinity ? 0 : lowestEvent,
        highestTotal: highestTotal,
        topEvent: sortedByEvent.slice(0, 10),
        topTotal: sortedByTotal.slice(0, 10),
        allManagers: managers
    };
}

function createStatsRow(rank, manager, value, valueLabel) {
    const rawName = manager.player_name || manager.entry_name || 'Unknown';
    const displayName = statsDisplayName(rawName);

    let teamName = '';
    if (typeof findPlayerTeam === 'function') {
        teamName = findPlayerTeam(rawName) || '';
    }

    let logoHtml = '';
    if (teamName && typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[teamName]) {
        logoHtml = '<div class="stats-row-logo"><img src="./' + TEAMS_LOGOS[teamName] + '" onerror="this.style.display=\'none\'"></div>';
    } else {
        logoHtml = '<div class="stats-row-logo stats-row-logo-empty"></div>';
    }

    let rankClass = 'stats-rank-normal';
    let rowExtra = '';

    if (rank === 1) {
        rankClass = 'stats-rank-gold';
        rowExtra = ' stats-row-gold';
    } else if (rank === 2) {
        rankClass = 'stats-rank-silver';
        rowExtra = ' stats-row-silver';
    } else if (rank === 3) {
        rankClass = 'stats-rank-bronze';
        rowExtra = ' stats-row-bronze';
    }

    return '<div class="stats-row' + rowExtra + '">' +
        '<div class="stats-rank ' + rankClass + '">' + rank + '</div>' +
        logoHtml +
        '<div class="stats-row-names">' +
            '<div class="stats-row-entry">' + displayName + '</div>' +
            '<div class="stats-row-player">' + (teamName || '') + '</div>' +
        '</div>' +
        '<div class="stats-row-value">' +
            '<div class="stats-row-value-num">' + value + '</div>' +
            (valueLabel ? '<div class="stats-row-value-label">' + valueLabel + '</div>' : '') +
        '</div>' +
    '</div>';
}

function renderStatsOverview(stats) {
    if (!stats) return;

    const setVal = function(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setVal('kpiManagers', stats.totalManagers);
    setVal('kpiAvg', stats.avgEvent);
    setVal('kpiHigh', stats.highestEvent);
    setVal('kpiHighestTotal', stats.highestTotal);

    const topTotalList = document.getElementById('statsTopTotal');
    if (topTotalList) {
        topTotalList.innerHTML = '';
        stats.topTotal.forEach(function(m, i) {
            topTotalList.innerHTML += createStatsRow(i + 1, m, m.total || 0, 'TOTAL');
        });
    }
}

function renderStatsRecords(stats) {
    if (!stats) return;

    const container = document.getElementById('statsRecordsContent');
    if (!container) return;

    const cards = [];

    if (stats.topTotal[0]) {
        const m = stats.topTotal[0];
        cards.push({
            label: 'Top Total',
            value: stats.highestTotal,
            name: statsDisplayName(m.player_name || m.entry_name),
            color: 'gold',
            icon: 'trophy'
        });
    }

    cards.push({
        label: 'Avg GW',
        value: stats.avgEvent,
        name: 'Per Manager',
        color: 'green',
        icon: 'chart-line-up'
    });

    cards.push({
        label: 'Avg Total',
        value: stats.avgTotal,
        name: 'Per Manager',
        color: 'green',
        icon: 'chart-bar'
    });

    cards.push({
        label: 'Managers',
        value: stats.totalManagers,
        name: 'League',
        color: 'purple',
        icon: 'users'
    });

    container.innerHTML = cards.map(function(c) {
        return '<div class="stats-record-card stats-record-' + c.color + '">' +
            '<div class="stats-record-icon">' + statsIcon(c.icon, 'fill') + '</div>' +
            '<div class="stats-record-label">' + c.label + '</div>' +
            '<div class="stats-record-value">' + c.value + '</div>' +
            '<div class="stats-record-name">' + c.name + '</div>' +
        '</div>';
    }).join('');
}

function searchManager(query) {
    if (!query || !statsAllManagers.length) return [];
    const q = query.toLowerCase().trim();
    return statsAllManagers.filter(function(m) {
        const pn = (m.player_name || '').toLowerCase();
        const en = (m.entry_name || '').toLowerCase();
        return pn.indexOf(q) !== -1 || en.indexOf(q) !== -1;
    }).slice(0, 8);
}

function buildRankMap() {
    statsRankMap = {};
    statsSortedByTotal.forEach(function(m, i) {
        statsRankMap[m.entry] = i + 1;
    });
}

function getRankForEntry(entry) {
    return statsRankMap[entry] || -1;
}

function renderSearchResults(results) {
    const container = document.getElementById('statsSearchResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = '<div class="stats-empty">' +
            statsIcon('magnifying-glass', 'regular') +
            ' لا توجد نتائج' +
        '</div>';
        return;
    }

    container.innerHTML = '';

    results.forEach(function(m) {
        const rawName = m.player_name || m.entry_name || '';
        const displayName = statsDisplayName(rawName);
        const rank = getRankForEntry(m.entry);

        let teamName = '';
        if (typeof findPlayerTeam === 'function') {
            teamName = findPlayerTeam(rawName) || '';
        }

        let logoHtml = '';
        if (teamName && typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[teamName]) {
            logoHtml = '<div class="stats-search-logo"><img src="./' + TEAMS_LOGOS[teamName] + '" onerror="this.style.display=\'none\'"></div>';
        } else {
            logoHtml = '<div class="stats-search-logo stats-search-logo-empty"></div>';
        }

        const div = document.createElement('div');
        div.className = 'stats-search-item';
        div.innerHTML =
            '<div class="stats-search-rank">#' + rank + '</div>' +
            logoHtml +
            '<div class="stats-search-names">' +
                '<div class="stats-search-entry">' + displayName + '</div>' +
                '<div class="stats-search-player">' + (teamName || rawName) + '</div>' +
            '</div>' +
            '<div class="stats-search-total">' + (m.total || 0) + '</div>';

        div.addEventListener('click', function() {
            renderManagerProfile(m);
        });

        container.appendChild(div);
    });
}

function renderManagerProfile(manager) {
    const container = document.getElementById('statsProfile');
    if (!container) return;

    const rawName = manager.player_name || manager.entry_name || '';
    const displayName = statsDisplayName(rawName);

    const rank = getRankForEntry(manager.entry);
    const safeRank = rank > 0 ? rank : 0;
    const totalManagers = statsAllManagers.length;

    let teamName = '';
    if (typeof findPlayerTeam === 'function') {
        teamName = findPlayerTeam(rawName) || '';
    }

    let logoHtml = '';
    if (teamName && typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[teamName]) {
        logoHtml = '<img src="./' + TEAMS_LOGOS[teamName] + '" onerror="this.style.display=\'none\'">';
    } else {
        logoHtml = '<div class="stats-profile-no-logo"></div>';
    }

    const percentile = safeRank > 0
        ? Math.round(((totalManagers - safeRank + 1) / totalManagers) * 100)
        : 0;

    const topManager = statsSortedByTotal[0];
    const diff = topManager ? (topManager.total || 0) - (manager.total || 0) : 0;

    container.innerHTML =
        '<div class="stats-profile-card">' +
            '<button class="stats-profile-close" onclick="document.getElementById(\'statsProfile\').style.display=\'none\'">' +
                statsIcon('x', 'bold') +
            '</button>' +
            '<div class="stats-profile-rank-badge">#' + safeRank + '</div>' +
            '<div class="stats-profile-shirt">' + logoHtml + '</div>' +
            '<div class="stats-profile-entry">' + displayName + '</div>' +
            '<div class="stats-profile-player">' + (teamName || rawName) + '</div>' +
            (teamName ? '<div class="stats-profile-team">' + teamName + '</div>' : '') +
            '<div class="stats-profile-stats">' +
                '<div class="stats-profile-stat stats-stat-total"><div class="stats-stat-label">Total</div><div class="stats-stat-value">' + (manager.total || 0) + '</div></div>' +
                '<div class="stats-profile-stat stats-stat-gw"><div class="stats-stat-label">GW</div><div class="stats-stat-value">' + (manager.event_total || 0) + '</div></div>' +
                '<div class="stats-profile-stat stats-stat-rank"><div class="stats-stat-label">Rank</div><div class="stats-stat-value">' + safeRank + '</div></div>' +
            '</div>' +
            '<div class="stats-profile-details">' +
                '<div class="stats-detail-row"><span class="stats-detail-label">Percentile</span><span class="stats-detail-value">' + percentile + '%</span></div>' +
                '<div class="stats-detail-row"><span class="stats-detail-label">To Leader</span><span class="stats-detail-value' + (diff === 0 ? ' stats-green' : '') + '">' + (diff === 0 ? 'Leader' : '-' + diff) + '</span></div>' +
            '</div>' +
        '</div>';

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadStats() {
    const loadingEl = document.getElementById('statsLoading');
    const contentEl = document.getElementById('statsContent');

    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';

    if (statsLoaded && statsAllManagers.length > 0) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        return;
    }

    try {
        const managers = await fetchAllManagersForStats();
        if (!managers || managers.length === 0) {
            throw new Error('No data from manager_history');
        }

        statsAllManagers = managers;
        statsSortedByTotal = [...managers].sort(function(a, b) {
            return (b.total || 0) - (a.total || 0);
        });
        buildRankMap();

        statsLoaded = true;
        statsComputed = computeLeagueStats(managers);

        renderStatsOverview(statsComputed);
        renderStatsRecords(statsComputed);

        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';

    } catch (e) {
        console.error('Stats load error:', e);
        if (loadingEl) {
            loadingEl.innerHTML = 'Error: ' + e.message;
            loadingEl.style.display = 'block';
        }
    }
}

/* =========================================================
   MONTH
========================================================= */

function switchMonthView(view) {
    currentMonthView = view;

    const squadBtn = document.getElementById('monthSquadBtn');
    const listBtn = document.getElementById('monthListBtn');

    if (squadBtn) squadBtn.classList.toggle('active', view === 'squad');
    if (listBtn) listBtn.classList.toggle('active', view === 'list');

    const pitchWrapper = document.getElementById('monthPitchWrapper');
    const listWrapper = document.getElementById('monthListWrapper');

    if (view === 'list') {
        if (pitchWrapper) pitchWrapper.style.display = 'none';
        if (listWrapper) listWrapper.style.display = 'block';
    } else {
        if (pitchWrapper) pitchWrapper.style.display = 'flex';
        if (listWrapper) listWrapper.style.display = 'none';
        renderMonthCards();
    }
}

async function getMonthTop20(monthNum) {
    if (typeof getManagersForMonth !== 'function') {
        console.warn('[Month] getManagersForMonth not available');
        return [];
    }

    const managers = await getManagersForMonth(monthNum);

    if (!managers || managers.length === 0) return [];

    const filtered = managers.filter(function(m) {
        if (typeof findPlayerTeam !== 'function') return true;
        const rawName = m.player_name || m.entry_name || '';
        const teamName = findPlayerTeam(rawName) || '';
        return teamName !== '';
    });

    const sorted = filtered.sort(function(a, b) {
        return (b.event_total || 0) - (a.event_total || 0);
    });

    return sorted.slice(0, 20);
}

function renderMonthCards() {
    const pitch = document.getElementById('monthPlayers');
    if (!pitch) return;

    const selected = currentMonthData.filter(function(p) {
        return currentMonthSelected.indexOf(p.entry) !== -1;
    });

    const sorted = [...selected].sort(function(a, b) {
        return (b.event_total || 0) - (a.event_total || 0);
    });

    const fwd = sorted.slice(0, 3);
    const mid = sorted.slice(3, 6);
    const def = sorted.slice(6, 10);
    const gk  = sorted.slice(10, 11);

    let html = '';

    html += '<div class="totw-row totw-row-gk">';
    html += gk.map(createMonthCard).join('');
    html += '</div>';

    html += '<div class="totw-row totw-row-def">';
    html += def.map(createMonthCard).join('');
    html += '</div>';

    html += '<div class="totw-row totw-row-mid">';
    html += mid.map(createMonthCard).join('');
    html += '</div>';

    html += '<div class="totw-row totw-row-fwd">';
    html += fwd.map(createMonthCard).join('');
    html += '</div>';

    pitch.innerHTML = html;
}

function createMonthCard(player) {
    if (!player) return '';

    const rawName = player.player_name || player.entry_name || 'Unknown';
    const name = statsDisplayName(rawName);
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

function renderMonthList(players) {
    const listWrapper = document.getElementById('monthListWrapper');
    if (!listWrapper) return;

    let html = '';

    html += '<div class="totw-list-header">';
    html += '<div class="totw-list-h-check">' + statsIcon('check', 'bold') + '</div>';
    html += '<div class="totw-list-h-rank">#</div>';
    html += '<div class="totw-list-h-logo"></div>';
    html += '<div class="totw-list-h-team">Team & Manager</div>';
    html += '<div class="totw-list-h-gw">Month</div>';
    html += '<div class="totw-list-h-total">Total</div>';
    html += '</div>';

    players.forEach(function(player, index) {
        const entryId = player.entry;
        const rawName = player.player_name || player.entry_name || 'Unknown';
        const displayName = statsDisplayName(rawName);
        const points = player.event_total || 0;
        const total = player.total || 0;
        const isSelected = currentMonthSelected.indexOf(entryId) !== -1;

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
            logoHtml = '<div class="totw-list-logo totw-list-logo-empty">' +
                statsIcon('star', 'fill') +
            '</div>';
        }

        html += '<div class="totw-list-item' + (isSelected ? ' selected' : '') + '">';
        html += '<div class="totw-list-check' + (isSelected ? ' checked' : '') + '">' + (isSelected ? statsIcon('check', 'bold') : '') + '</div>';
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

async function loadMonthlyTOTW() {
    const loadingBox = document.getElementById('monthLoadingBox');
    const pitchWrapper = document.getElementById('monthPitchWrapper');
    const listWrapper = document.getElementById('monthListWrapper');
    const errorBox = document.getElementById('monthErrorBox');

    if (!loadingBox) return;

    if (typeof isLocked === 'function' && isLocked('month')) {
        const isAdminUser = (typeof isAdmin === 'function') ? isAdmin() : false;

        if (!isAdminUser) {
            loadingBox.style.display = 'none';
            if (pitchWrapper) pitchWrapper.style.display = 'none';
            if (listWrapper) listWrapper.style.display = 'none';
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML =
                    '<div class="month-locked-msg">' +
                        '<div class="month-locked-icon">' + statsIcon('lock', 'fill') + '</div>' +
                        '<div class="month-locked-title">غير متاح حالياً</div>' +
                        '<div class="month-locked-sub">' +
                            'سيتم عرض تشكيلة الشهر<br>' +
                            'لحين اكتمال مباريات هذا الشهر' +
                        '</div>' +
                        '<div class="month-locked-brand">FINALISSIMA LEAGUE</div>' +
                    '</div>';
            }
            return;
        }
    }

    loadingBox.style.display = 'block';
    if (pitchWrapper) pitchWrapper.style.display = 'none';
    if (listWrapper) listWrapper.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';

    try {
        const monthNum = (typeof getMonthFromRound === 'function')
            ? getMonthFromRound(currentRound || 1)
            : 1;

        currentMonthNum = monthNum;

        const players = await getMonthTop20(monthNum);

        if (!players || players.length === 0) {
            loadingBox.style.display = 'none';
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML =
                    '<div class="month-locked-msg">' +
                        '<div class="month-locked-icon">' + statsIcon('trophy', 'fill') + '</div>' +
                        '<div class="month-locked-title">تشكيلة الشهر قيد التطوير</div>' +
                        '<div class="month-locked-sub">تفتح نهاية الشهر الحالي</div>' +
                        '<div class="month-locked-brand">FINALISSIMA LEAGUE</div>' +
                    '</div>';
            }
            return;
        }

        const selected = players.slice(0, 11).map(function(p) {
            return p.entry;
        });

        currentMonthData = players;
        currentMonthSelected = selected;

        const monthName = (typeof getMonthName === 'function')
            ? getMonthName(monthNum)
            : ('الشهر ' + monthNum);

        const gwLabel = document.getElementById('monthLabel');
        if (gwLabel) {
            gwLabel.textContent = monthName;
        }

        renderMonthCards();
        renderMonthList(players);

        loadingBox.style.display = 'none';

        if (currentMonthView === 'list') {
            if (listWrapper) listWrapper.style.display = 'block';
        } else {
            if (pitchWrapper) pitchWrapper.style.display = 'flex';
        }

    } catch (e) {
        console.error('Monthly TOTW Error:', e);
        loadingBox.style.display = 'none';
        if (errorBox) {
            errorBox.style.display = 'block';
            errorBox.innerHTML = '<div class="month-locked-msg">' +
                '<div class="month-locked-icon">' + statsIcon('warning-circle', 'fill') + '</div>' +
                '<div class="month-locked-title">خطأ</div>' +
                '<div class="month-locked-sub">' + e.message + '</div>' +
            '</div>';
        }
    }
}

function switchStatsTab(tabName) {
    document.querySelectorAll('.stats-tab-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.stats-view').forEach(function(view) {
        view.classList.toggle('active', view.id === 'statsView-' + tabName);
    });

    if (tabName === 'clubs' && typeof loadClubs === 'function') {
        loadClubs();
    }

    if (tabName === 'charts' && typeof initCharts === 'function') {
        initCharts();
    }

    if (tabName === 'compare' && typeof h2hInit === 'function') {
        h2hInit();
    }

    if (tabName === 'month') {
        loadMonthlyTOTW();
    }

    setTimeout(function() {
        const activeBtn = document.querySelector('.stats-tab-btn.active');
        if (activeBtn && activeBtn.scrollIntoView) {
            activeBtn.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, 50);
}

window.addEventListener('managers-updated', function() {
    if (!statsLoaded) return;
    statsLoaded = false;
    const statsTab = document.getElementById('statsTab');
    if (statsTab && statsTab.classList.contains('active')) {
        loadStats();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('statsSearchInput');
    if (!searchInput) return;

    let searchTimer = null;

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        const val = this.value;

        searchTimer = setTimeout(function() {
            const q = val.trim();
            if (q.length < 2) {
                const resultsEl = document.getElementById('statsSearchResults');
                if (resultsEl) resultsEl.innerHTML = '';
                return;
            }
            const results = searchManager(q);
            renderSearchResults(results);
        }, 150);
    });
});

window.switchMonthView = switchMonthView;
window.loadMonthlyTOTW = loadMonthlyTOTW;
window.renderMonthCards = renderMonthCards;
window.renderMonthList = renderMonthList;
window.statsIcon = statsIcon;
