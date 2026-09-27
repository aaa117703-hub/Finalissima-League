/* =========================================================
   backfill-history.js — FINALISSIMA LEAGUE CHAT
========================================================= */

const BACKFILL_WORKER = 'https://finalissima-api.aaa117703.workers.dev';
const BACKFILL_FLAG_KEY = 'fin_backfill_done_v1';
const BACKFILL_FLAG_TTL = 24 * 60 * 60 * 1000;

let backfillRunning = false;
let backfillDone = false;

function showBackfillDebug(text, isError) {
    console.log('[Backfill]', text);
}

async function fetchManagerHistory(entryId) {
    try {
        const res = await fetchWithTimeout(
            'https://fantasy.premierleague.com/api/entry/' + entryId + '/history/',
            {},
            8000
        );

        if (!res.ok) {
            return [];
        }

        const data = await res.json();
        if (!data || !data.current) return [];

        return data.current.map(function(gw) {
            return {
                entry: entryId,
                event: gw.event,
                points: gw.points || 0,
                total_points: gw.total_points || 0,
                overall_rank: gw.overall_rank || 0
            };
        });

    } catch (e) {
        return [];
    }
}

async function saveHistoryBatch(rows) {
    if (!window.sbClient) return false;
    if (!rows || rows.length === 0) return false;

    try {
        const { error } = await window.sbClient
            .from('manager_history')
            .upsert(rows, { onConflict: 'entry,event' });

        if (error) {
            console.error('[Backfill] Save error:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[Backfill] Save exception:', e);
        return false;
    }
}

async function runBackfillWithDebug() {
    if (backfillRunning || backfillDone) return;
    if (!window.sbClient) {
        showBackfillDebug('Backfill: no Supabase client', true);
        return;
    }

    backfillRunning = true;
    showBackfillDebug('Backfill: fetching managers...');

    const managers = await getAllManagersCached();
    showBackfillDebug('Backfill: got ' + managers.length + ' managers');

    if (!managers || managers.length === 0) {
        showBackfillDebug('Backfill: no managers', true);
        backfillRunning = false;
        return;
    }

    let done = 0;
    let saved = 0;
    let buffer = [];

    for (let i = 0; i < managers.length; i++) {
        const m = managers[i];
        const rows = await fetchManagerHistory(m.entry);
        buffer.push(...rows);
        done++;

        if (buffer.length >= 100 || i === managers.length - 1) {
            const ok = await saveHistoryBatch(buffer);
            if (ok) saved += buffer.length;
            buffer = [];
        }

        await new Promise(function(r) { setTimeout(r, 150); });

        if (done % 10 === 0) {
            showBackfillDebug('Backfill: ' + done + '/' + managers.length + ' · saved=' + saved);
        }
    }

    showBackfillDebug('Backfill: DONE! saved=' + saved + ' rows');

    backfillRunning = false;
    backfillDone = true;

    try {
        localStorage.setItem(BACKFILL_FLAG_KEY, JSON.stringify({
            ts: Date.now(),
            saved: saved
        }));
    } catch (e) {}
}

window.runBackfill = runBackfillWithDebug;

function shouldRunBackfill() {
    try {
        const raw = localStorage.getItem(BACKFILL_FLAG_KEY);
        if (!raw) return true;

        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts) return true;

        const age = Date.now() - parsed.ts;
        if (age < BACKFILL_FLAG_TTL) return false;
        return true;
    } catch (e) {
        return true;
    }
}

function tryAutoBackfill() {
    if (backfillRunning || backfillDone) return;

    if (!shouldRunBackfill()) {
        console.log('[Backfill] Skipped (flag fresh)');
        backfillDone = true;
        return;
    }

    showBackfillDebug('Backfill: checking...');

    if (!window.sbClient) {
        showBackfillDebug('Backfill: waiting for sbClient...');
        setTimeout(tryAutoBackfill, 3000);
        return;
    }

    window.sbClient
        .from('manager_history')
        .select('*', { count: 'exact', head: true })
        .then(function(res) {
            const count = (res && res.count) || 0;
            showBackfillDebug('Backfill: current rows=' + count);

            if (count < 100) {
                showBackfillDebug('Backfill: table empty, starting...');
                runBackfillWithDebug();
            } else {
                showBackfillDebug('Backfill: already populated (' + count + ' rows)');
                backfillDone = true;

                try {
                    localStorage.setItem(BACKFILL_FLAG_KEY, JSON.stringify({
                        ts: Date.now(),
                        saved: count
                    }));
                } catch (e) {}
            }
        })
        .catch(function(e) {
            showBackfillDebug('Backfill check failed: ' + e.message, true);
        });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(tryAutoBackfill, 5000);
    });
} else {
    setTimeout(tryAutoBackfill, 5000);
}
