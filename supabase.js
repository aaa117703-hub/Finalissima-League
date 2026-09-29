/* =========================================================
   supabase.js — FINALISSIMA LEAGUE CHAT (v3)
   يدعم: match_results + custom_matchweeks + manager_history
========================================================= */

/* =========================================================
   1) MATCH RESULTS (المواجهات)
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
   2) CUSTOM MATCHWEEKS (إدارة الجولات)
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
   3) MANAGER HISTORY (تاريخ المديرين)
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

/**
 * ⭐ جيب المديرين لجولة واحدة فقط
 * النقاط = نقاط تلك الجولة
 */
async function getManagersForRound(round) {
    if (!window.sbClient) return [];

    try {
        /* 1) جيب history الجولة المحددة فقط */
        const res = await window.sbClient
            .from('manager_history')
            .select('entry, event, points, total_points, overall_rank')
            .eq('event', round);

        if (res.error) {
            console.error('[MH-Round] load error:', res.error);
            return [];
        }

        if (!res.data || res.data.length === 0) {
            console.warn('[MH-Round] No data for round ' + round);
            return [];
        }

        /* 2) جيب معلومات المديرين */
        const managers = (typeof getAllManagersCached === 'function')
            ? await getAllManagersCached()
            : [];

        const mMap = {};
        managers.forEach(function(m) { mMap[m.entry] = m; });

        /* 3) دمج */
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

/**
 * ⭐ جيب المديرين لشهر كامل (5 جولات)
 * monthNum: 1 → GW 1-5، 2 → GW 6-10، ...
 * النقاط = مجموع نقاط الشهر
 */
async function getManagersForMonth(monthNum) {
    if (!window.sbClient) return [];

    try {
        const start = (monthNum - 1) * 5 + 1;
        const end = monthNum * 5;

        /* 1) جيب history الجولات المطلوبة */
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

        if (!res.data || res.data.length === 0) {
            console.warn('[MH-Month] No data for month ' + monthNum);
            return [];
        }

        /* 2) تجميع حسب المدير */
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

        /* 3) جيب معلومات المديرين */
        const managers = (typeof getAllManagersCached === 'function')
            ? await getAllManagersCached()
            : [];

        const mMap = {};
        managers.forEach(function(m) { mMap[m.entry] = m; });

        /* 4) دمج */
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

/**
 * جيب كل المديرين مع تاريخهم (لـ Stats و Charts)
 */
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

/**
 * اسم الشهر بالعربي
 */
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

/**
 * الشهر من رقم الجولة
 */
function getMonthFromRound(round) {
    return Math.ceil(round / 5);
}

/**
 * جولات شهر معين
 */
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
window.getMonthName = getMonthName;
window.getMonthFromRound = getMonthFromRound;
window.getRoundsForMonth = getRoundsForMonth;
