/* =========================================================
   supabase.js — FINALISSIMA LEAGUE CHAT
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
   دوال الجولات المخصصة (custom_matchweeks)
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
   ⭐ دوال manager_history الجديدة
========================================================= */

/**
 * يجيب كل تاريخ المديرين (كل الجولات)
 * ترجع: [{ entry, event, points, total_points, overall_rank }, ...]
 */
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

/**
 * يجيب تاريخ مدير واحد
 */
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
 * يجيب المديرين من manager_history + معلوماتهم من getAllManagersCached
 */
async function getManagersWithHistory() {
    if (!window.sbClient) return [];

    try {
        const [history, managers] = await Promise.all([
            loadAllManagerHistory(),
            (typeof getAllManagersCached === 'function') ? getAllManagersCached() : Promise.resolve([])
        ]);

        if (!history || history.length === 0) return [];

        /* نبني map لكل مدير → نقاطه التراكمية */
        const managersMap = {};
        if (managers && managers.length > 0) {
            managers.forEach(function(m) {
                managersMap[m.entry] = m;
            });
        }

        /* تجميع history لكل entry */
        const grouped = {};
        history.forEach(function(row) {
            if (!grouped[row.entry]) {
                grouped[row.entry] = {
                    entry: row.entry,
                    totalPoints: 0,
                    totalGW: 0,
                    events: [],
                    lastRank: 0,
                    lastTotal: 0
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

            /* آخر جولة */
            if (row.event >= grouped[row.entry].events.length) {
                grouped[row.entry].lastRank = row.overall_rank || 0;
                grouped[row.entry].lastTotal = row.total_points || 0;
            }
        });

        /* ندمج مع معلومات المدير */
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
 * تشكيلة الشهر — يجيب Top 11 من شهر معين
 * monthKey = "2026-09"
 */
async function getMonthlyTop11(monthKey) {
    if (!window.sbClient) return null;

    try {
        /* جيب كل history */
        const history = await loadAllManagerHistory();
        if (!history || history.length === 0) return null;

        /* نحتاج نعرف تاريخ كل جولة → الشهر */
        /* ⚠️ نستخدم currentRound كمرجع — الجولات 1-4 = أغسطس، 5-8 = سبتمبر، إلخ */
        /* أو — نحتاج جدول gameweeks_deadlines من FPL (bootstrap) */
        /* حالياً: نستخدم تاريخ today */

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const targetMonth = monthKey || (currentYear + '-' + String(currentMonth).padStart(2, '0'));

        /* فلترة حسب الشهر — نحتاج معرفة أي جولة في أي شهر */
        /* نستخدم FPL API bootstrap اللي فيه deadlines */
        const bootstrap = await loadBootstrap();

        if (!bootstrap || !bootstrap.events) {
            console.warn('[Monthly] No bootstrap — using all events');
            return null;
        }

        /* نجمع الجولات اللي في الشهر المطلوب */
        const monthEvents = [];
        bootstrap.events.forEach(function(ev) {
            if (!ev.deadline_time) return;
            const deadline = new Date(ev.deadline_time);
            const key = deadline.getFullYear() + '-' + String(deadline.getMonth() + 1).padStart(2, '0');
            if (key === targetMonth && ev.finished) {
                monthEvents.push(ev.id);
            }
        });

        if (monthEvents.length === 0) {
            return { ok: false, error: 'no-events', month: targetMonth };
        }

        /* نجمّع نقاط كل مدير في جولات الشهر */
        const managersTotals = {};
        history.forEach(function(row) {
            if (monthEvents.indexOf(row.event) === -1) return;

            if (!managersTotals[row.entry]) {
                managersTotals[row.entry] = {
                    entry: row.entry,
                    points: 0,
                    gws: 0
                };
            }
            managersTotals[row.entry].points += (row.points || 0);
            managersTotals[row.entry].gws++;
        });

        /* نحسب المتوسط */
        const arr = Object.keys(managersTotals).map(function(k) {
            const m = managersTotals[k];
            return {
                entry: m.entry,
                points: m.points,
                gws: m.gws,
                avg: m.gws > 0 ? (m.points / m.gws) : 0
            };
        });

        /* ترتيب حسب المتوسط */
        arr.sort(function(a, b) { return b.avg - a.avg; });

        const top11 = arr.slice(0, 11);

        /* نضيف معلومات المديرين */
        const managers = await getAllManagersCached();
        const managersMap = {};
        if (managers) {
            managers.forEach(function(m) { managersMap[m.entry] = m; });
        }

        const enriched = top11.map(function(m) {
            const info = managersMap[m.entry] || {};
            return {
                entry: m.entry,
                player_name: info.player_name || '',
                entry_name: info.entry_name || '',
                points: m.points,
                gws: m.gws,
                avg: Math.round(m.avg),
                event_total: Math.round(m.avg)
            };
        });

        return {
            ok: true,
            month: targetMonth,
            monthName: getMonthName(targetMonth),
            events: monthEvents,
            players: enriched
        };
    } catch (e) {
        console.error('[Monthly] error:', e);
        return null;
    }
}

/**
 * اسم الشهر بالعربي
 */
function getMonthName(monthKey) {
    const months = {
        '01': 'يناير', '02': 'فبراير', '03': 'مارس',
        '04': 'أبريل', '05': 'مايو', '06': 'يونيو',
        '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر',
        '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
    };
    const parts = monthKey.split('-');
    return (months[parts[1]] || parts[1]) + ' ' + parts[0];
}

/**
 * يجيب FPL Bootstrap (deadlines)
 */
async function loadBootstrap() {
    const WORKER = 'https://finalissima-api.aaa117703.workers.dev';
    try {
        const res = await fetchWithTimeout(WORKER + '/?type=bootstrap', {}, 10000);
        if (!res.ok) return null;
        const json = await res.json();
        return json.data || null;
    } catch (e) {
        console.error('[Bootstrap] error:', e);
        return null;
    }
}

window.loadCustomMatchweeks = loadCustomMatchweeks;
window.saveCustomMatchweek = saveCustomMatchweek;
window.setRoundHidden = setRoundHidden;
window.loadAllManagerHistory = loadAllManagerHistory;
window.loadManagerHistoryById = loadManagerHistoryById;
window.getManagersWithHistory = getManagersWithHistory;
window.getMonthlyTop11 = getMonthlyTop11;
