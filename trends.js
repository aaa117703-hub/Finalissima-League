/* =========================================================
   trends.js — FINALISSIMA LEAGUE CHAT (v2)
   يقرأ من manager_history
========================================================= */

async function computeTrendsFromHistory() {
    if (typeof loadAllManagerHistory !== 'function') return null;

    const history = await loadAllManagerHistory();
    if (!history || history.length === 0) return null;

    const rounds = [...new Set(history.map(r => r.event))].sort((a, b) => a - b);
    if (rounds.length < 2) return null;

    const lastRound = rounds[rounds.length - 1];
    const prevRound = rounds[rounds.length - 2];

    /* جيب المديرين */
    let managers = [];
    if (typeof getManagersWithHistory === 'function') {
        managers = await getManagersWithHistory();
    }
    const mMap = {};
    managers.forEach(m => { mMap[m.entry] = m; });

    const last = {};
    history.filter(r => r.event === lastRound).forEach(r => { last[r.entry] = r; });
    const prev = {};
    history.filter(r => r.event === prevRound).forEach(r => { prev[r.entry] = r; });

    const trends = [];
    Object.keys(last).forEach(entryId => {
        if (!prev[entryId]) return;

        const diff = (prev[entryId].overall_rank || 0) - (last[entryId].overall_rank || 0);
        const info = mMap[entryId] || {};

        trends.push({
            entry_id: entryId,
            player_name: info.player_name || '',
            entry_name: info.entry_name || '',
            currentRank: last[entryId].overall_rank || 0,
            previousRank: prev[entryId].overall_rank || 0,
            diff: diff,
            total: last[entryId].total_points || 0
        });
    });

    const risers = trends
        .filter(t => t.diff > 0)
        .sort((a, b) => b.diff - a.diff)
        .slice(0, 5);

    const fallers = trends
        .filter(t => t.diff < 0)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 5);

    return {
        risers: risers,
        fallers: fallers,
        totalTracked: trends.length
    };
}

function createTrendRow(trend, type) {
    const rawName = trend.player_name || trend.entry_name || 'Unknown';
    const entryName = trend.entry_name || '';

    let teamName = '';
    if (typeof findPlayerTeam === 'function') {
        teamName = findPlayerTeam(rawName) || findPlayerTeam(entryName) || '';
    }

    let logoHtml = '';
    if (teamName && typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[teamName]) {
        logoHtml = '<div class="trend-row-logo"><img src="./' + TEAMS_LOGOS[teamName] + '" onerror="this.style.display=\'none\'"></div>';
    } else {
        logoHtml = '<div class="trend-row-logo trend-row-logo-empty"></div>';
    }

    const isRiser = type === 'riser';
    const diffText = isRiser ? '+' + trend.diff : trend.diff;
    const diffClass = isRiser ? 'trend-diff-up' : 'trend-diff-down';

    return '<div class="trend-row">' +
        logoHtml +
        '<div class="trend-row-names">' +
            '<div class="trend-row-entry">' + (entryName || rawName) + '</div>' +
            '<div class="trend-row-player">' +
                'من #' + trend.previousRank + ' إلى #' + trend.currentRank +
            '</div>' +
        '</div>' +
        '<div class="trend-row-diff ' + diffClass + '">' + diffText + '</div>' +
    '</div>';
}

function renderTrends(trends) {
    const risersEl = document.getElementById('statsTopRisers');
    const fallersEl = document.getElementById('statsTopFallers');

    if (!trends) {
        if (risersEl) risersEl.innerHTML = '<div class="stats-empty">البيانات غير متوفرة</div>';
        if (fallersEl) fallersEl.innerHTML = '<div class="stats-empty">البيانات غير متوفرة</div>';
        return;
    }

    if (risersEl) {
        risersEl.innerHTML = trends.risers.length === 0
            ? '<div class="stats-empty">لا توجد بيانات</div>'
            : trends.risers.map(t => createTrendRow(t, 'riser')).join('');
    }

    if (fallersEl) {
        fallersEl.innerHTML = trends.fallers.length === 0
            ? '<div class="stats-empty">لا توجد بيانات</div>'
            : trends.fallers.map(t => createTrendRow(t, 'faller')).join('');
    }
}

async function loadTrends(currentRound) {
    try {
        const trends = await computeTrendsFromHistory();
        renderTrends(trends);
        return trends;
    } catch (e) {
        console.error('loadTrends error:', e);
        renderTrends(null);
        return null;
    }
}

/* keep saveCurrentRanks for backward compatibility */
async function saveCurrentRanks(round) {
    /* لا نستخدمها بعد الآن — البيانات من manager_history */
    console.log('[Trends] saveCurrentRanks deprecated');
    return true;
}

window.loadTrends = loadTrends;
window.computeTrendsFromHistory = computeTrendsFromHistory;
