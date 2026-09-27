/* =========================================================
   supabase.js
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
                    created_at: Date.now()
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
