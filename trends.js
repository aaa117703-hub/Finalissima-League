/* =========================================================
   trends.js — FINALISSIMA LEAGUE CHAT
========================================================= */

async function saveCurrentRanks(round) {
    if (!window.sbClient) return false;
    if (!round) return false;

    try {
        const allResults = await getAllManagersCached();

        if (!allResults || allResults.length === 0) return false;

        const sorted = [...allResults].sort(function(a, b) {
            return (b.total || 0) - (a.total || 0);
        });

        const rows = sorted.map(function(m, idx) {
            return {
                round: round,
                entry_id: m.entry,
                player_name: m.player_name || '',
                entry_name: m.entry_name || '',
                rank: idx + 1,
                total: m.total || 0,
                event_total: m.event_total || 0
            };
        });

        await window.sbClient
            .from('weekly_ranks')
            .delete()
            .eq('round', round);

        const { error } = await window.sbClient
            .from('weekly_ranks')
            .insert(rows);

        if (error) {
            console.error('Save ranks error:', error);
            return false;
        }

        console.log('Ranks saved for round', round, rows.length);
        return true;

    } catch (e) {
        console.error('saveCurrentRanks exception:', e);
        return false;
    }
}

async function loadRanksForRound(round) {
    if (!window.sbClient) return null;

    try {
        const { data, error } = await window.sbClient
            .from('weekly_ranks')
            .select('entry_id, player_name, entry_name, rank, total')
            .eq('round', round);

        if (error) {
            console.error('Load ranks error:', error);
            return null;
        }

        if (!data || data.length === 0) return null;

        const map = {};
        data.forEach(function(r) {
            map[r.entry_id] = r;
        });

        return map;

    } catch (e) {
        console.error('loadRanksForRound exception:', e);
        return null;
    }
}

async function computeTrends(currentRound) {
    if (currentRound < 2) return null;

    const currentRanks = await loadRanksForRound(currentRound);
    const prevRanks = await loadRanksForRound(currentRound - 1);

    if (!currentRanks || !prevRanks) {
        console.log('Missing ranks for trend calculation');
        return null;
    }

    const trends = [];

    Object.keys(currentRanks).forEach(function(entryId) {
        const current = currentRanks[entryId];
        const prev = prevRanks[entryId];

        if (!prev) return;

        const diff = prev.rank - current.rank;

        trends.push({
            entry_id: current.entry_id,
            player_name: current.player_name,
            entry_name: current.entry_name,
            currentRank: current.rank,
            previousRank: prev.rank,
            diff: diff,
            total: current.total
        });
    });

    const risers = trends
        .filter(function(t) { return t.diff > 0; })
        .sort(function(a, b) { return b.diff - a.diff; })
        .slice(0, 5);

    const fallers = trends
        .filter(function(t) { return t.diff < 0; })
        .sort(function(a, b) { return a.diff - b.diff; })
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

    const diffText = isRiser
        ? '+' + trend.diff
        : trend.diff;

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
        if (trends.risers.length === 0) {
            risersEl.innerHTML = '<div class="stats-empty">لا توجد بيانات</div>';
        } else {
            risersEl.innerHTML = trends.risers.map(function(t) {
                return createTrendRow(t, 'riser');
            }).join('');
        }
    }

    if (fallersEl) {
        if (trends.fallers.length === 0) {
            fallersEl.innerHTML = '<div class="stats-empty">لا توجد بيانات</div>';
        } else {
            fallersEl.innerHTML = trends.fallers.map(function(t) {
                return createTrendRow(t, 'faller');
            }).join('');
        }
    }
}

async function loadTrends(currentRound) {
    try {
        const trends = await computeTrends(currentRound);
        renderTrends(trends);
        return trends;
    } catch (e) {
        console.error('loadTrends error:', e);
        renderTrends(null);
        return null;
    }
}
