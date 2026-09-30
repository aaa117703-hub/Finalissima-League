/* =========================================================
   countdown.js — FINALISSIMA LEAGUE CHAT (v2)
   Phosphor Icons + عداد تنازلي + فتح تلقائي
========================================================= */

(function(){
'use strict';

/* =========================================================
   State
========================================================= */

window.countdownState = {
    deadlineTime: null,
    deadlineMs: 0,
    roundNumber: 0,
    intervalId: null,
    autoOpenTriggered: false,
    bootstrapData: null,
    bootstrapFetchedAt: 0
};

const BOOTSTRAP_CACHE_TTL = 5 * 60 * 1000;
const WORKER_URL = 'https://finalissima-api.aaa117703.workers.dev';

/* ⭐ Helper: أيقونة Phosphor */
function cdIcon(name, variant) {
    variant = variant || 'regular';
    const variantClass = variant === 'fill' ? 'ph-fill' :
                         variant === 'bold' ? 'ph-bold' :
                         variant === 'duotone' ? 'ph-duotone' :
                         'ph';
    return '<i class="' + variantClass + ' ph-' + name + '"></i>';
}

/* =========================================================
   جلب bootstrap
========================================================= */

async function fetchBootstrapForCountdown() {
    const now = Date.now();

    if (window.countdownState.bootstrapData &&
        (now - window.countdownState.bootstrapFetchedAt) < BOOTSTRAP_CACHE_TTL) {
        return window.countdownState.bootstrapData;
    }

    if (typeof window.fplDbGetData === 'function') {
        try {
            const cached = window.fplDbGetData();
            if (cached && cached.events && Array.isArray(cached.events)) {
                window.countdownState.bootstrapData = cached;
                window.countdownState.bootstrapFetchedAt = now;
                return cached;
            }
        } catch (e) {
            console.warn('[Countdown] fplDbGetData failed:', e);
        }
    }

    try {
        const res = await fetch(WORKER_URL + '/?type=bootstrap');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();

        if (json && json.ok && json.data) {
            window.countdownState.bootstrapData = json.data;
            window.countdownState.bootstrapFetchedAt = now;
            return json.data;
        }
    } catch (e) {
        console.error('[Countdown] fetch failed:', e);
    }

    return null;
}

/* =========================================================
   إيجاد deadline لجولة معينة
========================================================= */

async function getDeadlineForRound(roundNum) {
    const bootstrap = await fetchBootstrapForCountdown();
    if (!bootstrap || !bootstrap.events) return null;

    const event = bootstrap.events.find(function(e) {
        return e.id === roundNum;
    });

    if (!event || !event.deadline_time) return null;

    return {
        deadlineTime: event.deadline_time,
        deadlineMs: new Date(event.deadline_time).getTime(),
        roundNumber: roundNum,
        name: event.name || ('GW' + roundNum),
        finished: event.finished === true
    };
}

/* =========================================================
   حساب الوقت المتبقي
========================================================= */

function calculateTimeLeft(deadlineMs) {
    const now = Date.now();
    const diff = deadlineMs - now;

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        total: diff
    };
}

function pad2(num) {
    return String(num).padStart(2, '0');
}

/* =========================================================
   رسم العداد — Phosphor
========================================================= */

function renderCountdownHTML(deadlineInfo) {
    return '<div class="cd-wrapper">' +
        '<div class="cd-label">' +
            '<span class="cd-label-icon">' + cdIcon('timer', 'fill') + '</span>' +
            '<span>Deadline — ' + deadlineInfo.name + '</span>' +
        '</div>' +
        '<div class="cd-timer" id="cdTimer">' +
            '<div class="cd-unit">' +
                '<div class="cd-num" id="cdDays">--</div>' +
                '<div class="cd-text">يوم</div>' +
            '</div>' +
            '<div class="cd-sep">:</div>' +
            '<div class="cd-unit">' +
                '<div class="cd-num" id="cdHours">--</div>' +
                '<div class="cd-text">ساعة</div>' +
            '</div>' +
            '<div class="cd-sep">:</div>' +
            '<div class="cd-unit">' +
                '<div class="cd-num" id="cdMinutes">--</div>' +
                '<div class="cd-text">دقيقة</div>' +
            '</div>' +
            '<div class="cd-sep">:</div>' +
            '<div class="cd-unit">' +
                '<div class="cd-num" id="cdSeconds">--</div>' +
                '<div class="cd-text">ثانية</div>' +
            '</div>' +
        '</div>' +
        '<div class="cd-hint" id="cdHint">' +
            cdIcon('clock', 'regular') +
            ' الجولة تُفتح تلقائياً عند الديدلاين' +
        '</div>' +
    '</div>';
}

/* =========================================================
   تحديث العداد
========================================================= */

function updateCountdownDisplay(deadlineMs) {
    const time = calculateTimeLeft(deadlineMs);

    const daysEl = document.getElementById('cdDays');
    const hoursEl = document.getElementById('cdHours');
    const minutesEl = document.getElementById('cdMinutes');
    const secondsEl = document.getElementById('cdSeconds');
    const hintEl = document.getElementById('cdHint');
    const timerEl = document.getElementById('cdTimer');

    if (daysEl) daysEl.textContent = pad2(time.days);
    if (hoursEl) hoursEl.textContent = pad2(time.hours);
    if (minutesEl) minutesEl.textContent = pad2(time.minutes);
    if (secondsEl) secondsEl.textContent = pad2(time.seconds);

    /* تغيير الألوان */
    if (timerEl) {
        timerEl.classList.remove('cd-urgent', 'cd-warning');

        const totalHours = time.total / (1000 * 60 * 60);

        if (totalHours < 2) {
            timerEl.classList.add('cd-urgent');
            if (hintEl) {
                hintEl.innerHTML = cdIcon('lightning', 'fill') + ' الوقت ضيق — قريباً تفتح الجولة';
                hintEl.classList.add('cd-hint-urgent');
            }
        } else if (totalHours < 24) {
            timerEl.classList.add('cd-warning');
            if (hintEl) {
                hintEl.innerHTML = cdIcon('alarm', 'fill') + ' أقل من 24 ساعة — استعد!';
                hintEl.classList.remove('cd-hint-urgent');
            }
        } else {
            if (hintEl) {
                hintEl.innerHTML = cdIcon('clock', 'regular') + ' الجولة تُفتح تلقائياً عند الديدلاين';
                hintEl.classList.remove('cd-hint-urgent');
            }
        }
    }

    if (time.total <= 0) {
        return true;
    }

    return false;
}

/* =========================================================
   الفتح التلقائي
========================================================= */

async function autoOpenRound(roundNum) {
    if (window.countdownState.autoOpenTriggered) return;

    window.countdownState.autoOpenTriggered = true;

    console.log('[Countdown] Deadline reached for GW' + roundNum + ' — Opening...');

    if (typeof setRoundHidden === 'function') {
        try {
            const result = await setRoundHidden(roundNum, false);

            if (result && result.ok) {
                console.log('[Countdown] GW' + roundNum + ' opened successfully');

                if (window.customMatchweeks && window.customMatchweeks[roundNum]) {
                    window.customMatchweeks[roundNum].is_hidden = false;
                }

                if (typeof showToast === 'function') {
                    showToast('الجولة ' + roundNum + ' مفتوحة الآن!', true, 4000);
                }

                setTimeout(function() {
                    if (typeof renderFixtures === 'function') {
                        renderFixtures();
                    }
                }, 800);

                return true;
            } else {
                console.warn('[Countdown] Failed to open GW' + roundNum);
            }
        } catch (e) {
            console.error('[Countdown] autoOpen error:', e);
        }
    }

    return false;
}

/* =========================================================
   بدء العداد
========================================================= */

async function initRoundCountdown(roundNum) {
    console.log('[Countdown] Starting for round ' + roundNum);

    stopRoundCountdown();
    window.countdownState.autoOpenTriggered = false;

    const deadlineInfo = await getDeadlineForRound(roundNum);

    if (!deadlineInfo) {
        console.warn('[Countdown] No deadline for round ' + roundNum);
        const container = document.getElementById('roundCountdown');
        if (container) {
            container.innerHTML = '<div class="cd-error">' +
                cdIcon('warning-circle', 'fill') +
                ' لا يوجد deadline لهذه الجولة' +
            '</div>';
        }
        return;
    }

    if (deadlineInfo.deadlineMs <= Date.now()) {
        console.log('[Countdown] Deadline already passed — Opening now');
        await autoOpenRound(roundNum);
        return;
    }

    window.countdownState.deadlineMs = deadlineInfo.deadlineMs;
    window.countdownState.deadlineTime = deadlineInfo.deadlineTime;
    window.countdownState.roundNumber = roundNum;

    const container = document.getElementById('roundCountdown');
    if (container) {
        container.innerHTML = renderCountdownHTML(deadlineInfo);
    }

    updateCountdownDisplay(deadlineInfo.deadlineMs);

    window.countdownState.intervalId = setInterval(async function() {
        const ended = updateCountdownDisplay(deadlineInfo.deadlineMs);

        if (ended) {
            stopRoundCountdown();
            await autoOpenRound(roundNum);
        }
    }, 1000);
}

function stopRoundCountdown() {
    if (window.countdownState.intervalId) {
        clearInterval(window.countdownState.intervalId);
        window.countdownState.intervalId = null;
    }
}

/* =========================================================
   Window exports
========================================================= */

window.initRoundCountdown = initRoundCountdown;
window.stopRoundCountdown = stopRoundCountdown;
window.getDeadlineForRound = getDeadlineForRound;
window.cdIcon = cdIcon;

console.log('[Countdown] loaded');

})();
