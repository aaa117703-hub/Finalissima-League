/* =========================================================
   backfill-history.js — FINALISSIMA LEAGUE CHAT
   يستخدم Worker لجلب تاريخ كل مدير
========================================================= */

const BACKFILL_WORKER = 'https://finalissima-api.aaa117703.workers.dev';
const BACKFILL_FLAG_KEY = 'fin_backfill_done_v1';
const BACKFILL_FLAG_TTL = 24 * 60 * 60 * 1000;

let backfillRunning = false;
let backfillDone = false;

function showBackfillDebug(text, isError) {
    console.log('[Backfill]', text);
    if (isError) {
        console.error('[Backfill]', text);
    }
}

/* ⭐ يستخدم الـ Worker بدل FPL API مباشرة */
async function fetchManagerHistory(entryId) {
    try {
        const url = BACKFILL_WORKER + '/?type=history&entry=' + entryId;

        const res = await fetchWithTimeout(url, {}, 15000);

        if (!res.ok) {
            console.warn('[Backfill] HTTP ' + res.status + ' for entry ' + entryId);
            return [];
        }

        const data = await res.json();

        if (!data || !data.ok || !Array.isArray(data.history)) {
            console.warn('[Backfill] Invalid response for entry ' + entryId);
            return [];
        }

        return data.history.map(function(gw) {
            return {
                entry: entryId,
                event: gw.event,
                points: gw.points || 0,
                total_points: gw.total_points || 0,
                overall_rank: gw.overall_rank || 0
            };
        });

    } catch (e) {
        console.warn('[Backfill] Fetch failed for ' + entryId + ':', e.message);
        return [];
    }
}

async function saveHistoryBatch(rows) {
    if (!window.sbClient) return false;
    if (!rows || rows.length === 0) return false;

    try {
        const result = await window.sbClient
            .from('manager_history')
            .upsert(rows, { onConflict: 'entry,event' });

        if (result.error) {
            console.error('[Backfill] Save error:', result.error);
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
    let failed = 0;
    let buffer = [];

    for (let i = 0; i < managers.length; i++) {
        const m = managers[i];

        const rows = await fetchManagerHistory(m.entry);

        if (rows.length === 0) {
            failed++;
        } else {
            buffer.push(...rows);
        }

        done++;

        /* كل 50 صف → حفظ */
        if (buffer.length >= 50 || i === managers.length - 1) {
            const ok = await saveHistoryBatch(buffer);
            if (ok) saved += buffer.length;
            buffer = [];
        }

        /* تأخير بسيط بين الطلبات (لتجنب Rate limit) */
        await new Promise(function(r) { setTimeout(r, 100); });

        /* تقرير كل 20 مدير */
        if (done % 20 === 0) {
            showBackfillDebug('Backfill: ' + done + '/' + managers.length + ' · saved=' + saved + ' · failed=' + failed);
        }
    }

    showBackfillDebug('Backfill: DONE! saved=' + saved + ' rows, failed=' + failed);

    backfillRunning = false;
    backfillDone = true;

    try {
        localStorage.setItem(BACKFILL_FLAG_KEY, JSON.stringify({
            ts: Date.now(),
            saved: saved,
            failed: failed
        }));
    } catch (e) {}

    /* رسالة نجاح */
    if (typeof showToast === 'function') {
        showToast('Backfill: تم! ' + saved + ' سجل', true, 5000);
    }
}

window.runBackfill = runBackfillWithDebug;

/* ===== دالة يدوية لتشغيل Backfill ===== */
window.forceBackfill = function() {
    backfillDone = false;
    backfillRunning = false;
    localStorage.removeItem(BACKFILL_FLAG_KEY);

    /* مسح البيانات القديمة (اختياري) */
    if (window.sbClient) {
        window.sbClient
            .from('manager_history')
            .delete()
            .neq('id', 0)
            .then(function() {
                console.log('[Backfill] Old data cleared');
                runBackfillWithDebug();
            });
    }
};

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
