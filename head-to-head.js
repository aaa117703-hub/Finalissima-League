/* =========================================================
   head-to-head.js — مقارنة المديرين
========================================================= */

window.h2hState = {
    slotA: null,   // { entry, player_name, ... }
    slotB: null,
    allManagers: [],
    loaded: false
};

/* =========================================================
   تحميل القائمة
========================================================= */

async function h2hLoadManagers() {
    if (window.h2hState.loaded) return window.h2hState.allManagers;

    try {
        const managers = (typeof getManagersWithHistory === 'function')
            ? await getManagersWithHistory()
            : [];

        /* ترتيب حسب الاسم */
        managers.sort(function(a, b) {
            return (a.player_name || '').localeCompare(b.player_name || '');
        });

        window.h2hState.allManagers = managers;
        window.h2hState.loaded = true;
        return managers;
    } catch (e) {
        console.error('[H2H] load error:', e);
        return [];
    }
}

/* =========================================================
   بحث
========================================================= */

function h2hSearch(query) {
    if (!query || query.length < 2) return [];

    const q = query.toLowerCase().trim();
    const managers = window.h2hState.allManagers;

    return managers.filter(function(m) {
        const pn = (m.player_name || '').toLowerCase();
        const en = (m.entry_name || '').toLowerCase();
        return pn.indexOf(q) !== -1 || en.indexOf(q) !== -1;
    }).slice(0, 10);
}

/* =========================================================
   UI
========================================================= */

function h2hRender() {
    const container = document.getElementById('h2hContent');
    if (!container) return;

    const state = window.h2hState;
    const hasA = !!state.slotA;
    const hasB = !!state.slotB;

    let html = '';

    /* Intro */
    html += '<div class="h2h-intro">' +
        '<div class="h2h-intro-icon">⚔️</div>' +
        '<div class="h2h-intro-title">مقارنة المديرين</div>' +
        '<div class="h2h-intro-sub">اختر مديرين لتقارن بينهما</div>' +
    '</div>';

    /* Slots */
    html += '<div class="h2h-slots">';

    /* Slot A */
    html += '<div class="h2h-slot' + (hasA ? ' filled' : '') + '" onclick="h2hOpenPicker(\'A\')">';
    if (hasA) {
        html += '<div class="h2h-slot-badge">1</div>';
        html += '<div class="h2h-slot-name">' + h2hShorten(state.slotA.player_name) + '</div>';
        html += '<div class="h2h-slot-nation">' + (state.slotA.nationName || state.slotA.nation || '') + '</div>';
        html += '<div class="h2h-slot-clear" onclick="event.stopPropagation(); h2hClearSlot(\'A\')">✕</div>';
    } else {
        html += '<div class="h2h-slot-plus">+</div>';
        html += '<div class="h2h-slot-empty">اختر المدير الأول</div>';
    }
    html += '</div>';

    /* VS */
    html += '<div class="h2h-vs">VS</div>';

    /* Slot B */
    html += '<div class="h2h-slot' + (hasB ? ' filled' : '') + '" onclick="h2hOpenPicker(\'B\')">';
    if (hasB) {
        html += '<div class="h2h-slot-badge">2</div>';
        html += '<div class="h2h-slot-name">' + h2hShorten(state.slotB.player_name) + '</div>';
        html += '<div class="h2h-slot-nation">' + (state.slotB.nationName || state.slotB.nation || '') + '</div>';
        html += '<div class="h2h-slot-clear" onclick="event.stopPropagation(); h2hClearSlot(\'B\')">✕</div>';
    } else {
        html += '<div class="h2h-slot-plus">+</div>';
        html += '<div class="h2h-slot-empty">اختر المدير الثاني</div>';
    }
    html += '</div>';

    html += '</div>';

    /* Results */
    if (hasA && hasB) {
        html += '<div id="h2hResults" class="h2h-results">' +
            '<div class="h2h-loading"><div class="spinner"></div><div>جاري الحساب...</div></div>' +
        '</div>';
    } else {
        html += '<div class="h2h-hint">' +
            '👆 اختر مديرين لعرض المقارنة الكاملة' +
        '</div>';
    }

    container.innerHTML = html;

    /* نحمّل النتائج إذا المديرين مختارين */
    if (hasA && hasB) {
        h2hLoadResults();
    }
}

function h2hShorten(name) {
    if (!name) return '';
    if (typeof cleanDisplayName === 'function') {
        return cleanDisplayName(name, 14);
    }
    if (name.length <= 14) return name;
    return name.substring(0, 14);
}

/* =========================================================
   اختيار المدير (Modal)
========================================================= */

function h2hOpenPicker(slot) {
    window.h2hState.pickingSlot = slot;

    let modal = document.getElementById('h2hPickerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'h2hPickerModal';
        modal.className = 'h2h-picker-modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML =
        '<div class="h2h-picker-box">' +
            '<div class="h2h-picker-header">' +
                '<div class="h2h-picker-title">اختر المدير</div>' +
                '<button class="h2h-picker-close" onclick="h2hClosePicker()">✕</button>' +
            '</div>' +
            '<div class="h2h-picker-search">' +
                '<input type="text" id="h2hSearchInput" placeholder="🔍 ابحث..." oninput="h2hFilterPicker(this.value)" autocomplete="off">' +
            '</div>' +
            '<div class="h2h-picker-list" id="h2hPickerList"></div>' +
        '</div>';

    modal.style.display = 'flex';

    /* نعرض كل المديرين أول ما يفتح */
    const allManagers = window.h2hState.allManagers;
    h2hRenderPickerList(allManagers);

    /* focus على البحث */
    setTimeout(function() {
        const input = document.getElementById('h2hSearchInput');
        if (input) input.focus();
    }, 100);
}

function h2hRenderPickerList(managers) {
    const list = document.getElementById('h2hPickerList');
    if (!list) return;

    if (!managers || managers.length === 0) {
        list.innerHTML = '<div class="h2h-picker-empty">ما فيه نتائج</div>';
        return;
    }

    const state = window.h2hState;
    const usedA = state.slotA ? state.slotA.entry : null;
    const usedB = state.slotB ? state.slotB.entry : null;

    let html = '';

    managers.forEach(function(m) {
        const isUsed = (m.entry === usedA || m.entry === usedB);
        const rawName = m.player_name || m.entry_name || 'Unknown';
        const name = h2hShorten(rawName);
        const nation = m._team || m.nation || '';

        html += '<div class="h2h-picker-item' + (isUsed ? ' used' : '') + '" onclick="h2hSelectManager(' + m.entry + ')">';
        html += '<div class="h2h-picker-name">' + name + '</div>';
        html += '<div class="h2h-picker-nation">' + nation + '</div>';
        if (isUsed) {
            html += '<div class="h2h-picker-used-badge">مختار</div>';
        }
        html += '</div>';
    });

    list.innerHTML = html;
}

function h2hFilterPicker(query) {
    const managers = window.h2hState.allManagers;

    if (!query || query.length === 0) {
        h2hRenderPickerList(managers);
        return;
    }

    const results = h2hSearch(query);
    h2hRenderPickerList(results);
}

function h2hClosePicker() {
    const modal = document.getElementById('h2hPickerModal');
    if (modal) modal.style.display = 'none';
    window.h2hState.pickingSlot = null;
}

function h2hSelectManager(entry) {
    const state = window.h2hState;
    const slot = state.pickingSlot;

    if (!slot) return;

    const manager = state.allManagers.find(function(m) { return m.entry === entry; });
    if (!manager) return;

    /* منع اختيار نفس المدير في الخانتين */
    const otherSlot = slot === 'A' ? 'B' : 'A';
    if (state['slot' + otherSlot] && state['slot' + otherSlot].entry === entry) {
        if (typeof showToast === 'function') {
            showToast('المدير موجود في الخانة الثانية', false, 2500);
        }
        return;
    }

    state['slot' + slot] = manager;

    h2hClosePicker();
    h2hRender();
}

function h2hClearSlot(slot) {
    window.h2hState['slot' + slot] = null;
    h2hRender();
}

/* =========================================================
   النتائج
========================================================= */

async function h2hLoadResults() {
    const container = document.getElementById('h2hResults');
    if (!container) return;

    const state = window.h2hState;

    try {
        const data = await getComparisonData(state.slotA.entry, state.slotB.entry);

        if (!data) {
            container.innerHTML = '<div class="h2h-error">⚠️ تعذر تحميل البيانات</div>';
            return;
        }

        h2hRenderResults(data);
    } catch (e) {
        console.error('[H2H] load results error:', e);
        container.innerHTML = '<div class="h2h-error">⚠️ خطأ: ' + e.message + '</div>';
    }
}

function h2hRenderResults(data) {
    const container = document.getElementById('h2hResults');
    if (!container) return;

    const a = data.a;
    const b = data.b;

    /* مصفوفة الصفوف */
    const rows = [
        { icon: '', label: 'مجموع النقاط', valA: a.totalPoints, valB: b.totalPoints, format: 'number' },
        { icon: '', label: 'متوسط الجولة', valA: a.avgPoints, valB: b.avgPoints, format: 'number' },
        { icon: '', label: 'مرات في تشكيلة الأسبوع', valA: a.totwWeekCount, valB: b.totwWeekCount, format: 'count' },
        { icon: '', label: 'مرات في تشكيلة الشهر', valA: a.totwMonthCount, valB: b.totwMonthCount, format: 'count' },
        { icon: '', label: 'المركز العالمي', valA: a.overallRank, valB: b.overallRank, format: 'rank', invert: true },
        { icon: '', label: 'المركز في الدوري', valA: a.leagueRank, valB: b.leagueRank, format: 'rank', invert: true },
        { icon: '', label: 'أفضل جولة', valA: a.bestGW.points + ' (GW' + a.bestGW.event + ')', valB: b.bestGW.points + ' (GW' + b.bestGW.event + ')', format: 'text' },
        { icon: '', label: 'أسوأ جولة', valA: a.worstGW.points + ' (GW' + a.worstGW.event + ')', valB: b.worstGW.points + ' (GW' + b.worstGW.event + ')', format: 'text', invert: true }
    ];

    let html = '';

    /* Header */
    html += '<div class="h2h-results-header">';
    html += '<div class="h2h-results-name">' + h2hShorten(a.player_name) + '</div>';
    html += '<div class="h2h-results-vs">VS</div>';
    html += '<div class="h2h-results-name">' + h2hShorten(b.player_name) + '</div>';
    html += '</div>';

    /* الفارق الإجمالي */
    const diff = a.totalPoints - b.totalPoints;
    let diffText = '';
    let diffClass = 'h2h-diff-equal';

    if (diff > 0) {
        diffText = '🏆 ' + h2hShorten(a.player_name) + ' متقدم بـ ' + diff + ' نقطة';
        diffClass = 'h2h-diff-a';
    } else if (diff < 0) {
        diffText = '🏆 ' + h2hShorten(b.player_name) + ' متقدم بـ ' + Math.abs(diff) + ' نقطة';
        diffClass = 'h2h-diff-b';
    } else {
        diffText = '🤝 تعادل في النقاط';
    }

    html += '<div class="h2h-overall-diff ' + diffClass + '">' + diffText + '</div>';

    /* Rows */
    html += '<div class="h2h-rows">';

    rows.forEach(function(row) {
        let aClass = '';
        let bClass = '';

        /* تحديد الفائز */
        if (row.format === 'number' || row.format === 'count') {
            if (row.valA > row.valB) aClass = 'win';
            else if (row.valB > row.valA) bClass = 'win';
        } else if (row.format === 'rank') {
            /* rank: الأقل = الأفضل */
            const vA = typeof row.valA === 'number' ? row.valA : 999999;
            const vB = typeof row.valB === 'number' ? row.valB : 999999;
            if (vA < vB) aClass = 'win';
            else if (vB < vA) bClass = 'win';
        }

        html += '<div class="h2h-row">';
        html += '<div class="h2h-row-val ' + aClass + '">' + h2hFormatVal(row.valA, row.format) + '</div>';
        html += '<div class="h2h-row-label">';
        html += '<span class="h2h-row-icon">' + row.icon + '</span>';
        html += '<span class="h2h-row-text">' + row.label + '</span>';
        html += '</div>';
        html += '<div class="h2h-row-val ' + bClass + '">' + h2hFormatVal(row.valB, row.format) + '</div>';
        html += '</div>';
    });

    html += '</div>';

    /* الرسم البياني — تطور النقاط التراكمية */
    html += '<div class="h2h-chart-section">';
    html += '<div class="h2h-chart-title"> تطور النقاط التراكمية</div>';
    html += '<div class="h2h-chart-wrap"><canvas id="h2hChart"></canvas></div>';
    html += '</div>';

    /* زر التحميل */
    html += '<button class="h2h-download-btn" onclick="h2hDownload()"> تحميل المقارنة</button>';

    /* زر تبديل */
    html += '<button class="h2h-swap-btn" onclick="h2hSwap()"> تبديل المديرين</button>';

    container.innerHTML = html;

    /* رسم Chart */
    setTimeout(function() {
        h2hDrawChart(a, b);
    }, 100);
}

function h2hFormatVal(val, format) {
    if (val === null || val === undefined) return '—';

    if (format === 'rank' || format === 'number') {
        if (typeof val !== 'number') return val;
        return val.toLocaleString('en-US');
    }

    return val;
}

function h2hDrawChart(a, b) {
    const canvas = document.getElementById('h2hChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') return;

    /* نبني البيانات */
    const eventsA = a.history.map(h => h.event);
    const eventsB = b.history.map(h => h.event);
    const allEvents = [...new Set([...eventsA, ...eventsB])].sort((x, y) => x - y);

    /* النقاط التراكمية */
    let cumA = 0;
    let cumB = 0;
    const cumA_data = [];
    const cumB_data = [];

    allEvents.forEach(function(ev) {
        const rowA = a.history.find(h => h.event === ev);
        const rowB = b.history.find(h => h.event === ev);

        if (rowA) cumA += (rowA.points || 0);
        if (rowB) cumB += (rowB.points || 0);

        cumA_data.push(cumA);
        cumB_data.push(cumB);
    });

    /* حذف Chart قديم */
    if (window.h2hChartInstance) {
        try { window.h2hChartInstance.destroy(); } catch(e) {}
    }

    window.h2hChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: allEvents.map(e => 'GW' + e),
            datasets: [
                {
                    label: h2hShorten(a.player_name),
                    data: cumA_data,
                    borderColor: '#8B1A2F',
                    backgroundColor: 'rgba(139, 26, 47, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#8B1A2F',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    fill: true
                },
                {
                    label: h2hShorten(b.player_name),
                    data: cumB_data,
                    borderColor: '#C8A95F',
                    backgroundColor: 'rgba(200, 169, 95, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#C8A95F',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 14,
                        font: { size: 12, weight: '900', family: "'Cairo', sans-serif" }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 31, 31, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#E5D4A5',
                    borderColor: '#8B1A2F',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(139, 26, 47, 0.08)' },
                    ticks: { font: { size: 11, weight: '800' }, color: '#666' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '800' }, color: '#666' }
                }
            }
        }
    });
}

function h2hSwap() {
    const state = window.h2hState;
    const temp = state.slotA;
    state.slotA = state.slotB;
    state.slotB = temp;
    h2hRender();
}

async function h2hDownload() {
    const container = document.getElementById('h2hResults');
    if (!container) return;

    if (typeof html2canvas === 'undefined') {
        if (typeof showToast === 'function') showToast('html2canvas not loaded', false, 3000);
        return;
    }

    if (typeof showToast === 'function') showToast('جاري التجهيز...', false, 2000);

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: '#FAF6F0',
            scale: 3,
            useCORS: true,
            allowTaint: false,
            logging: false
        });

        canvas.toBlob(function(blob) {
            if (!blob) return;

            const state = window.h2hState;
            const nameA = (state.slotA.player_name || 'A').replace(/\s+/g, '_');
            const nameB = (state.slotB.player_name || 'B').replace(/\s+/g, '_');
            const filename = 'H2H_' + nameA + '_vs_' + nameB + '.png';

            if (typeof showImageModal === 'function') {
                showImageModal(blob, filename);
            } else {
                /* fallback */
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
            }
        }, 'image/png');
    } catch (e) {
        console.error('[H2H] download error:', e);
        if (typeof showToast === 'function') showToast('فشل التحميل', false, 3000);
    }
}

/* =========================================================
   تهيئة
========================================================= */

async function h2hInit() {
    const container = document.getElementById('h2hContent');
    if (!container) return;

    container.innerHTML = '<div class="h2h-loading"><div class="spinner"></div><div>جاري تحميل المديرين...</div></div>';

    await h2hLoadManagers();
    h2hRender();
}

/* =========================================================
   WINDOW
========================================================= */

window.h2hInit = h2hInit;
window.h2hRender = h2hRender;
window.h2hOpenPicker = h2hOpenPicker;
window.h2hClosePicker = h2hClosePicker;
window.h2hFilterPicker = h2hFilterPicker;
window.h2hSelectManager = h2hSelectManager;
window.h2hClearSlot = h2hClearSlot;
window.h2hLoadResults = h2hLoadResults;
window.h2hSwap = h2hSwap;
window.h2hDownload = h2hDownload;
