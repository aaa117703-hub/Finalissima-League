/* =========================================================
   supabase.js — FINALISSIMA LEAGUE CHAT (v8)
   يدعم: match_results + custom_matchweeks + manager_history + head-to-head
========================================================= */

/* =========================================================
   1) MATCH RESULTS
========================================================= */

async function loadScoresFromSupabase(matchweeks) {
    try {
        const res = await window.sbClient
            .from('match_results')
            .select('round, home_team, away_team, home_score, away_score');

        if (res.error) {
            console.error('Supabase load error:', res.error);
            return null;
        }

        if (!res.data || res.data.length === 0) {
            return null;
        }

        const result = {};

        res.data.forEach(function(row) {
            const round = parseInt(row.round, 10);

            if (!matchweeks || !matchweeks[round]) {
                return;
            }

            const matches = matchweeks[round];

            const idx = matches.findIndex(function(m) {
                return m[0] === row.home_team && m[1] === row.away_team;
            });

            if (idx === -1) {
                return;
            }

            if (row.home_score !== null && row.home_score !== undefined) {
                result['r' + round + '_m' + idx + '_home'] = String(row.home_score);
            }

            if (row.away_score !== null && row.away_score !== undefined) {
                result['r' + round + '_m' + idx + '_away'] = String(row.away_score);
            }
        });

        return result;
    } catch (e) {
        console.error('Supabase load exception:', e);
        return null;
    }
}

async function saveRoundToSupabase(round, matchweeks, scoresStorage) {
    try {
        const matches = matchweeks[round] || [];
        const rows = [];

        matches.forEach(function(match, idx) {
            const hVal = scoresStorage['r' + round + '_m' + idx + '_home'];
            const aVal = scoresStorage['r' + round + '_m' + idx + '_away'];

            const hasHome = hVal !== undefined && hVal !== '';
            const hasAway = aVal !== undefined && aVal !== '';

            if (hasHome || hasAway) {
                rows.push({
                    round: String(round),
                    home_team: match[0],
                    away_team: match[1],
                    home_score: hasHome ? parseInt(hVal, 10) : null,
                    away_score: hasAway ? parseInt(aVal, 10) : null,
                    created_at: new Date().toISOString()
                });
            }
        });

        const delRes = await window.sbClient
            .from('match_results')
            .delete()
            .eq('round', String(round));

        if (delRes.error) {
            console.error('Delete error:', delRes.error);
            return { ok: false, error: delRes.error };
        }

        if (rows.length > 0) {
            const insRes = await window.sbClient
                .from('match_results')
                .insert(rows);

            if (insRes.error) {
                console.error('Insert error:', insRes.error);
                return { ok: false, error: insRes.error };
            }
        }

        return { ok: true, count: rows.length };
    } catch (e) {
        console.error('Save exception:', e);
        return { ok: false, error: e };
    }
}

async function clearRoundFromSupabase(round) {
    try {
        const res = await window.sbClient
            .from('match_results')
            .delete()
            .eq('round', String(round));

        if (res.error) {
            console.error('Clear error:', res.error);
            return { ok: false, error: res.error };
        }

        return { ok: true };
    } catch (e) {
        console.error('Clear exception:', e);
        return { ok: false, error: e };
    }
}

/* =========================================================
   2) CUSTOM MATCHWEEKS
========================================================= */

async function loadCustomMatchweeks() {
    try {
        const res = await window.sbClient
            .from('custom_matchweeks')
            .select('round, matches, is_hidden');

        if (res.error) {
            console.error('[Custom MW] load error:', res.error);
            return null;
        }

        if (!res.data || res.data.length === 0) {
            return null;
        }

        const result = {};
        res.data.forEach(function(row) {
            const r = parseInt(row.round, 10);
            result[r] = {
                matches: Array.isArray(row.matches) ? row.matches : [],
                is_hidden: row.is_hidden === true
            };
        });

        return result;
    } catch (e) {
        console.error('[Custom MW] load exception:', e);
        return null;
    }
}

async function saveCustomMatchweek(round, matches, isHidden) {
    try {
        const result = await window.sbClient
            .from('custom_matchweeks')
            .upsert(
                {
                    round: parseInt(round, 10),
                    matches: matches,
                    is_hidden: isHidden === true,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'round' }
            );

        if (result.error) {
            console.error('[Custom MW] save error:', result.error);
            return { ok: false, error: result.error };
        }

        return { ok: true };
    } catch (e) {
        console.error('[Custom MW] save exception:', e);
        return { ok: false, error: e };
    }
}

async function setRoundHidden(round, isHidden) {
    try {
        const result = await window.sbClient
            .from('custom_matchweeks')
            .upsert(
                {
                    round: parseInt(round, 10),
                    is_hidden: isHidden === true,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'round' }
            );

        if (result.error) {
            console.error('[Custom MW] setHidden error:', result.error);
            return { ok: false, error: result.error };
        }

        return { ok: true };
    } catch (e) {
        console.error('[Custom MW] setHidden exception:', e);
        return { ok: false, error: e };
    }
}

/* =========================================================
   3) MANAGER HISTORY
========================================================= */

async function loadAllManagerHistory() {
    if (!window.sbClient) return null;

    try {
        const res = await window.sbClient
            .from('manager_history')
            .select('entry, event, points, total_points, overall_rank')
            .order('event', { ascending: true });

        if (res.error) {
            console.error('[MH] load error:', res.error);
            return null;
        }

        return res.data || [];
    } catch (e) {
        console.error('[MH] load exception:', e);
        return null;
    }
}

async function loadManagerHistoryById(entryId) {
    if (!window.sbClient) return null;

    try {
        const res = await window.sbClient
            .from('manager_history')
            .select('event, points, total_points, overall_rank')
            .eq('entry', entryId)
            .order('event', { ascending: true });

        if (res.error) {
            console.error('[MH] load error:', res.error);
            return null;
        }

        return res.data || [];
    } catch (e) {
        console.error('[MH] load exception:', e);
        return null;
    }
}

async function getManagersForRound(round) {
    if (!window.sbClient) return [];

    try {
        const res = await window.sbClient
            .from('manager_history')
            .select('entry, event, points, total_points, overall_rank')
            .eq('event', round);

        if (res.error) {
            console.error('[MH-Round] load error:', res.error);
            return [];
        }

        if (!res.data || res.data.length === 0) return [];

        const managers = (typeof getAllManagersCached === 'function')
            ? await getAllManagersCached()
            : [];

        const mMap = {};
        managers.forEach(function(m) { mMap[m.entry] = m; });

        return res.data.map(function(row) {
            const info = mMap[row.entry] || {};
            return {
                entry: row.entry,
                player_name: info.player_name || '',
                entry_name: info.entry_name || '',
                nation: info._nationCode || info.nation || '',
                _team: info._team || '',
                event_total: row.points || 0,
                total: row.total_points || 0,
                overall_rank: row.overall_rank || 0,
                event: row.event
            };
        });
    } catch (e) {
        console.error('[MH-Round] error:', e);
        return [];
    }
}

async function getManagersForMonth(monthNum) {
    if (!window.sbClient) return [];

    try {
        const start = (monthNum - 1) * 5 + 1;
        const end = monthNum * 5;

        const res = await window.sbClient
            .from('manager_history')
            .select('entry, event, points, total_points, overall_rank')
            .gte('event', start)
            .lte('event', end)
            .order('event', { ascending: true });

        if (res.error) {
            console.error('[MH-Month] load error:', res.error);
            return [];
        }

        if (!res.data || res.data.length === 0) return [];

        const grouped = {};
        res.data.forEach(function(row) {
            if (!grouped[row.entry]) {
                grouped[row.entry] = {
                    entry: row.entry,
                    totalPoints: 0,
                    gwCount: 0,
                    lastRank: 0,
                    lastTotal: 0,
                    lastEvent: 0
                };
            }
            grouped[row.entry].totalPoints += (row.points || 0);
            grouped[row.entry].gwCount++;

            if (row.event >= grouped[row.entry].lastEvent) {
                grouped[row.entry].lastEvent = row.event;
                grouped[row.entry].lastRank = row.overall_rank || 0;
                grouped[row.entry].lastTotal = row.total_points || 0;
            }
        });

        const managers = (typeof getAllManagersCached === 'function')
            ? await getAllManagersCached()
            : [];

        const mMap = {};
        managers.forEach(function(m) { mMap[m.entry] = m; });

        return Object.keys(grouped).map(function(entryId) {
            const g = grouped[entryId];
            const info = mMap[entryId] || {};
            const avg = g.gwCount > 0 ? Math.round(g.totalPoints / g.gwCount) : 0;

            return {
                entry: g.entry,
                player_name: info.player_name || '',
                entry_name: info.entry_name || '',
                nation: info._nationCode || info.nation || '',
                _team: info._team || '',
                event_total: g.totalPoints,
                total: g.lastTotal,
                overall_rank: g.lastRank,
                gwCount: g.gwCount,
                avg: avg,
                monthNum: monthNum
            };
        });
    } catch (e) {
        console.error('[MH-Month] error:', e);
        return [];
    }
}

async function getManagersWithHistory() {
    if (!window.sbClient) return [];

    try {
        const [history, managers] = await Promise.all([
            loadAllManagerHistory(),
            (typeof getAllManagersCached === 'function') ? getAllManagersCached() : Promise.resolve([])
        ]);

        if (!history || history.length === 0) return [];

        const managersMap = {};
        if (managers && managers.length > 0) {
            managers.forEach(function(m) {
                managersMap[m.entry] = m;
            });
        }

        const grouped = {};
        history.forEach(function(row) {
            if (!grouped[row.entry]) {
                grouped[row.entry] = {
                    entry: row.entry,
                    totalPoints: 0,
                    totalGW: 0,
                    events: [],
                    lastRank: 0,
                    lastTotal: 0,
                    lastEvent: 0
                };
            }

            grouped[row.entry].totalPoints += (row.points || 0);
            grouped[row.entry].totalGW += 1;
            grouped[row.entry].events.push({
                event: row.event,
                points: row.points,
                total_points: row.total_points,
                overall_rank: row.overall_rank
            });

            if (row.event >= grouped[row.entry].lastEvent) {
                grouped[row.entry].lastEvent = row.event;
                grouped[row.entry].lastRank = row.overall_rank || 0;
                grouped[row.entry].lastTotal = row.total_points || 0;
            }
        });

        const result = Object.keys(grouped).map(function(entryId) {
            const g = grouped[entryId];
            const info = managersMap[entryId] || {};

            return {
                entry: g.entry,
                player_name: info.player_name || '',
                entry_name: info.entry_name || '',
                nation: info._nationCode || info.nation || '',
                _team: info._team || '',
                total: g.lastTotal,
                totalPoints: g.totalPoints,
                totalGW: g.totalGW,
                avgPoints: g.totalGW > 0 ? Math.round(g.totalPoints / g.totalGW) : 0,
                event_total: g.events.length > 0 ? g.events[g.events.length - 1].points : 0,
                events: g.events
            };
        });

        return result;
    } catch (e) {
        console.error('[MH] getManagersWithHistory error:', e);
        return [];
    }
}

/* =========================================================
   ⭐ 4) HEAD-TO-HEAD — إحصائيات كاملة لمدير واحد
========================================================= */

/**
 * يجيب كل إحصائيات مدير واحد (للمقارنة)
 * - مجموع النقاط
 * - متوسط الجولة
 * - مرات في تشكيلة الأسبوع
 * - مرات في تشكيلة الشهر
 * - المركز العالمي (آخر جولة)
 * - المركز في الدوري
 * - أفضل جولة
 * - أسوأ جولة
 * - المنتخب
 */
async function getManagerFullStats(entryId) {
    if (!window.sbClient) return null;

    try {
        /* 1) تاريخ المدير */
        const historyRes = await window.sbClient
            .from('manager_history')
            .select('event, points, total_points, overall_rank')
            .eq('entry', entryId)
            .order('event', { ascending: true });

        if (historyRes.error || !historyRes.data || historyRes.data.length === 0) {
            console.warn('[H2H] No history for entry ' + entryId);
            return null;
        }

        const history = historyRes.data;

        /* 2) معلومات المدير */
        const managers = (typeof getAllManagersCached === 'function')
            ? await getAllManagersCached()
            : [];

        const info = managers.find(function(m) { return m.entry === entryId; }) || {};

        /* 3) حساب الإحصائيات */
        let totalPoints = 0;
        let gwCount = 0;
        let bestGW = { event: 0, points: 0 };
        let worstGW = { event: 0, points: Infinity };
        let lastRank = 0;
        let lastEvent = 0;

        history.forEach(function(row) {
            totalPoints += (row.points || 0);
            gwCount++;

            if (row.points > bestGW.points) {
                bestGW = { event: row.event, points: row.points || 0 };
            }
            if (row.points < worstGW.points) {
                worstGW = { event: row.event, points: row.points || 0 };
            }

            if (row.event >= lastEvent) {
                lastEvent = row.event;
                lastRank = row.overall_rank || 0;
            }
        });

        const avgPoints = gwCount > 0 ? Math.round(totalPoints / gwCount) : 0;

        /* 4) المركز في الدوري */
        const allManagers = await getManagersWithHistory();
        const sortedByTotal = allManagers.sort(function(a, b) {
            return (b.totalPoints || 0) - (a.totalPoints || 0);
        });
        const leagueRank = sortedByTotal.findIndex(function(m) {
            return m.entry === entryId;
        }) + 1;

        /* 5) عدد مرات تشكيلة الأسبوع */
        let totwWeekCount = 0;
        const allRounds = [...new Set(history.map(h => h.event))];
        for (let i = 0; i < allRounds.length; i++) {
            const round = allRounds[i];
            const roundData = await getManagersForRound(round);
            const roundSorted = roundData.sort(function(a, b) {
                return (b.event_total || 0) - (a.event_total || 0);
            });
            const top11 = roundSorted.slice(0, 11);
            const isIn = top11.find(function(m) { return m.entry === entryId; });
            if (isIn) totwWeekCount++;
        }

        /* 6) عدد مرات تشكيلة الشهر */
        let totwMonthCount = 0;
        const allMonths = [...new Set(history.map(h => Math.ceil(h.event / 5)))];
        for (let i = 0; i < allMonths.length; i++) {
            const monthNum = allMonths[i];
            const monthData = await getManagersForMonth(monthNum);
            const monthSorted = monthData.sort(function(a, b) {
                return (b.event_total || 0) - (a.event_total || 0);
            });
            const top11 = monthSorted.slice(0, 11);
            const isIn = top11.find(function(m) { return m.entry === entryId; });
            if (isIn) totwMonthCount++;
        }

        /* 7) المنتخب */
        const nation = info._nationCode || info.nation || '';
        const nationName = info._team || '';

        return {
            entry: entryId,
            player_name: info.player_name || 'Unknown',
            entry_name: info.entry_name || '',
            nation: nation,
            nationName: nationName,
            totalPoints: totalPoints,
            avgPoints: avgPoints,
            gwCount: gwCount,
            totwWeekCount: totwWeekCount,
            totwMonthCount: totwMonthCount,
            overallRank: lastRank,
            leagueRank: leagueRank,
            bestGW: bestGW,
            worstGW: worstGW.points === Infinity ? { event: 0, points: 0 } : worstGW,
            history: history
        };

    } catch (e) {
        console.error('[H2H] getManagerFullStats error:', e);
        return null;
    }
}

/**
 * للمقارنة — ترجع نتائج مديرين
 */
async function getComparisonData(entry1, entry2) {
    try {
        const [stats1, stats2] = await Promise.all([
            getManagerFullStats(entry1),
            getManagerFullStats(entry2)
        ]);

        if (!stats1 || !stats2) return null;

        return { a: stats1, b: stats2 };
    } catch (e) {
        console.error('[H2H] getComparisonData error:', e);
        return null;
    }
}

/* =========================================================
   Helpers
========================================================= */

function getMonthName(monthNum) {
    const names = {
        1: 'الشهر 1',
        2: 'الشهر 2',
        3: 'الشهر 3',
        4: 'الشهر 4',
        5: 'الشهر 5',
        6: 'الشهر 6',
        7: 'الشهر 7',
        8: 'الشهر 8'
    };
    return names[monthNum] || ('الشهر ' + monthNum);
}

function getMonthFromRound(round) {
    return Math.ceil(round / 5);
}

function getRoundsForMonth(monthNum) {
    const start = (monthNum - 1) * 5 + 1;
    const end = Math.min(monthNum * 5, 38);
    return { start: start, end: end };
}

/* =========================================================
   WINDOW
========================================================= */

window.loadCustomMatchweeks = loadCustomMatchweeks;
window.saveCustomMatchweek = saveCustomMatchweek;
window.setRoundHidden = setRoundHidden;
window.loadAllManagerHistory = loadAllManagerHistory;
window.loadManagerHistoryById = loadManagerHistoryById;
window.getManagersForRound = getManagersForRound;
window.getManagersForMonth = getManagersForMonth;
window.getManagersWithHistory = getManagersWithHistory;
window.getManagerFullStats = getManagerFullStats;
window.getComparisonData = getComparisonData;
window.getMonthName = getMonthName;
window.getMonthFromRound = getMonthFromRound;
window.getRoundsForMonth = getRoundsForMonth;
