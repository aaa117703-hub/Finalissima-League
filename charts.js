/* =========================================================
   charts.js — FINALISSIMA LEAGUE CHAT (v4 / v=5)
   Phosphor Icons + 4 رسوم فخمة
========================================================= */

(function(){
'use strict';

/* ---------- Phosphor Icons Helper ---------- */
function xIcon(name, variant) {
    variant = variant || 'regular';
    const variantClass = variant === 'fill' ? 'ph-fill' :
                         variant === 'bold' ? 'ph-bold' :
                         variant === 'duotone' ? 'ph-duotone' :
                         'ph';
    return '<i class="' + variantClass + ' ph-' + name + '"></i>';
}

let chartsLoaded = false;
let chartsData = null;
let chartInstances = {};

const CHART_COLORS = [
    '#8B1A2F', '#C8A95F', '#B22A45', '#8B7340', '#4A0A15',
    '#E5D4A5', '#6B0F1F', '#D6BF7E', '#2D0A0F', '#A02038'
];

function destroyCharts() {
    Object.keys(chartInstances).forEach(function(key) {
        if (chartInstances[key]) {
            try { chartInstances[key].destroy(); } catch(e) {}
            chartInstances[key] = null;
        }
    });
    chartInstances = {};
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function shortenName(name, max) {
    max = max || 14;
    if (typeof cleanDisplayName === 'function') {
        return cleanDisplayName(name, max);
    }
    if (!name) return '';
    if (name.length <= max) return name;
    return name.substring(0, max);
}

if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Cairo', 'EnglishCustom', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.font.weight = '700';
    Chart.defaults.color = '#666666';
    Chart.defaults.borderColor = 'rgba(139, 26, 47, 0.08)';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.padding = 14;
    Chart.defaults.plugins.legend.labels.font = { size: 11, weight: '800', family: "'Cairo', sans-serif" };
    Chart.defaults.plugins.legend.position = 'bottom';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(31, 31, 31, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#fff';
    Chart.defaults.plugins.tooltip.bodyColor = '#E5E7EB';
    Chart.defaults.plugins.tooltip.borderColor = '#8B1A2F';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.animation.duration = 900;
    Chart.defaults.animation.easing = 'easeOutQuart';
}

/* =========================================================
   Fetch
========================================================= */

async function fetchHistoryForCharts() {
    if (typeof loadAllManagerHistory !== 'function') return null;
    return await loadAllManagerHistory();
}

async function fetchManagersForCharts() {
    if (typeof getManagersWithHistory !== 'function') return [];
    return await getManagersWithHistory();
}

/* =========================================================
   Builders
========================================================= */

/* 1) Rank Progression — Top 10 */
function buildRankProgression(history, managers) {
    if (!history || history.length === 0) return null;

    const rounds = [...new Set(history.map(r => r.event))].sort((a, b) => a - b);
    if (rounds.length === 0) return null;

    const lastRound = rounds[rounds.length - 1];

    const lastRoundEntries = history
        .filter(r => r.event === lastRound)
        .sort((a, b) => (a.overall_rank || 0) - (b.overall_rank || 0))
        .slice(0, 10);

    const displayRounds = rounds.slice(-8);

    const mMap = {};
    managers.forEach(m => { mMap[m.entry] = m; });

    const datasets = lastRoundEntries.map((entry, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        const info = mMap[entry.entry] || {};
        const label = shortenName(info.player_name || info.entry_name || ('#' + entry.entry), 12);

        const data = displayRounds.map(r => {
            const found = history.find(x => x.event === r && x.entry === entry.entry);
            return found ? found.overall_rank : null;
        });

        return {
            label: label,
            data: data,
            borderColor: color,
            backgroundColor: hexToRgba(color, 0.08),
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: color,
            pointBorderWidth: 2,
            spanGaps: true
        };
    });

    return {
        labels: displayRounds.map(r => 'GW' + r),
        datasets: datasets
    };
}

/* 2) Top 10 by Average GW */
function buildTop10Avg(managers) {
    if (!managers || managers.length === 0) return null;

    const withAvg = managers
        .filter(m => (m.totalGW || 0) > 0)
        .map(m => ({
            name: m.player_name || m.entry_name || 'Unknown',
            avg: Math.round((m.totalPoints || 0) / (m.totalGW || 1)),
            total: m.totalPoints || 0,
            gw: m.totalGW
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 10);

    return {
        labels: withAvg.map(m => shortenName(m.name, 14)),
        datasets: [{
            label: 'Avg Points',
            data: withAvg.map(m => m.avg),
            backgroundColor: withAvg.map((m, i) => hexToRgba(CHART_COLORS[i % CHART_COLORS.length], 0.8)),
            borderColor: withAvg.map((m, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 2,
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 44
        }]
    };
}

/* 3) Risers & Fallers — آخر جولة */
function buildRisersFallers(history, managers) {
    if (!history || history.length === 0) return null;

    const rounds = [...new Set(history.map(r => r.event))].sort((a, b) => a - b);
    if (rounds.length < 2) return null;

    const lastRound = rounds[rounds.length - 1];
    const prevRound = rounds[rounds.length - 2];

    const last = {};
    history.filter(r => r.event === lastRound).forEach(r => { last[r.entry] = r; });
    const prev = {};
    history.filter(r => r.event === prevRound).forEach(r => { prev[r.entry] = r; });

    const mMap = {};
    managers.forEach(m => { mMap[m.entry] = m; });

    const changes = [];
    Object.keys(last).forEach(entryId => {
        if (!prev[entryId]) return;
        const diff = (prev[entryId].overall_rank || 0) - (last[entryId].overall_rank || 0);
        const info = mMap[entryId] || {};
        changes.push({
            name: shortenName(info.player_name || info.entry_name || entryId, 14),
            diff: diff
        });
    });

    const risers = changes.filter(c => c.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 6);
    const fallers = changes.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 6);

    return { risers, fallers };
}

/* 4) Top 5 per GW — للاختيار من Dropdown */
function buildTop5PerGW(history, managers, selectedGW) {
    if (!history || history.length === 0) return null;

    const rounds = [...new Set(history.map(r => r.event))].sort((a, b) => a - b);
    if (rounds.length === 0) return null;

    /* إذا ما محدد → آخر جولة */
    const gw = selectedGW || rounds[rounds.length - 1];

    const mMap = {};
    managers.forEach(m => { mMap[m.entry] = m; });

    const roundData = history
        .filter(r => r.event === gw)
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 5);

    return {
        gw: gw,
        allRounds: rounds,
        players: roundData.map(r => {
            const info = mMap[r.entry] || {};
            return {
                name: info.player_name || info.entry_name || ('#' + r.entry),
                points: r.points || 0,
                total: r.total_points || 0,
                entry: r.entry
            };
        })
    };
}

/* =========================================================
   Chart Creators
========================================================= */

function createRankProgressionChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    chartInstances.rankProg = new Chart(el, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 12, font: { size: 10, weight: '800' } } },
                tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label + ': #' + ctx.parsed.y; } } }
            },
            scales: {
                y: {
                    reverse: true,
                    beginAtZero: false,
                    grid: { color: 'rgba(139, 26, 47, 0.08)' },
                    ticks: {
                        callback: function(v) {
                            if (v >= 1000000) return '#' + (v/1000000).toFixed(1) + 'M';
                            if (v >= 1000) return '#' + (v/1000).toFixed(0) + 'K';
                            return '#' + v;
                        },
                        font: { size: 10, weight: '800' },
                        color: '#666'
                    }
                },
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: '800' }, color: '#666' } }
            }
        }
    });
}

function createTop10AvgChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    chartInstances.top10Avg = new Chart(el, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ' ' + ctx.parsed.x + ' avg pts'; }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(139, 26, 47, 0.08)' },
                    ticks: { font: { size: 10, weight: '800' }, color: '#666' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '900' }, color: '#8B1A2F' }
                }
            }
        }
    });
}

function createRisersFallersChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    const combined = [
        ...data.risers.map(r => ({ name: r.name, diff: r.diff })),
        ...data.fallers.map(f => ({ name: f.name, diff: f.diff }))
    ].sort((a, b) => b.diff - a.diff);

    chartInstances.risers = new Chart(el, {
        type: 'bar',
        data: {
            labels: combined.map(c => c.name),
            datasets: [{
                label: 'Rank Change',
                data: combined.map(c => c.diff),
                backgroundColor: combined.map(c => c.diff > 0 ? hexToRgba('#C8A95F', 0.8) : hexToRgba('#8B1A2F', 0.8)),
                borderColor: combined.map(c => c.diff > 0 ? '#C8A95F' : '#8B1A2F'),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const v = ctx.parsed.x;
                            return v > 0 ? ' ' + v + ' ranks' : ' ' + Math.abs(v) + ' ranks';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(139, 26, 47, 0.08)' },
                    ticks: { font: { size: 10, weight: '800' }, color: '#666' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '900' }, color: '#8B1A2F' }
                }
            }
        }
    });
}

/* ⭐ Chart جديد: Top 5 per GW */
function createTop5PerGWChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    chartInstances.top5gw = new Chart(el, {
        type: 'bar',
        data: {
            labels: data.players.map(p => shortenName(p.name, 14)),
            datasets: [{
                label: 'GW' + data.gw + ' Points',
                data: data.players.map(p => p.points),
                backgroundColor: data.players.map((p, i) => hexToRgba(CHART_COLORS[i % CHART_COLORS.length], 0.85)),
                borderColor: data.players.map((p, i) => CHART_COLORS[i % CHART_COLORS.length]),
                borderWidth: 3,
                borderRadius: 12,
                borderSkipped: false,
                maxBarThickness: 55
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const p = data.players[ctx.dataIndex];
                            return ' ' + ctx.parsed.y + ' pts · Total: ' + p.total;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(139, 26, 47, 0.08)' },
                    ticks: { font: { size: 10, weight: '800' }, color: '#666' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10, weight: '900' }, color: '#8B1A2F' }
                }
            }
        }
    });
}

/* ⭐ Handler لتغيير GW في Top 5 */
window.changeTop5GW = async function(gw) {
    const container = document.getElementById('top5ChartWrap');
    if (!container) return;

    container.innerHTML = '<canvas id="chartTop5"></canvas>';

    const history = await fetchHistoryForCharts();
    const managers = await fetchManagersForCharts();
    const data = buildTop5PerGW(history, managers, gw);

    if (data) {
        setTimeout(function() {
            if (chartInstances.top5gw) {
                try { chartInstances.top5gw.destroy(); } catch(e) {}
            }
            createTop5PerGWChart('chartTop5', data);
        }, 30);
    }
};

/* =========================================================
   Render Page
========================================================= */

async function renderChartsPage() {
    const container = document.getElementById('chartsContent');
    if (!container) return;

    container.innerHTML = '<div class="charts-loading"><div class="spinner"></div><div>Loading charts...</div></div>';

    if (typeof Chart === 'undefined') {
        container.innerHTML = '<div class="charts-error">Chart.js not loaded.</div>';
        return;
    }

    try {
        const [history, managers] = await Promise.all([
            fetchHistoryForCharts(),
            fetchManagersForCharts()
        ]);

        const rankData = buildRankProgression(history, managers);
        const top10Avg = buildTop10Avg(managers);
        const risersData = buildRisersFallers(history, managers);
        const top5Data = buildTop5PerGW(history, managers);

        /* نبني Dropdown للجولات */
        let gwOptions = '';
        if (top5Data && top5Data.allRounds) {
            top5Data.allRounds.forEach(function(r) {
                const selected = (r === top5Data.gw) ? ' selected' : '';
                gwOptions += '<option value="' + r + '"' + selected + '>GW ' + r + '</option>';
            });
        }

        let html = '';
        html += '<div class="charts-intro">' + xIcon('chart-bar', 'duotone') + ' <strong>League Analytics</strong><br>نظرة شاملة على أداء المديرين — الرتب، النقاط، والتوزيع</div>';

        /* 1) Rank Progression */
        if (rankData) {
            html += '<div class="chart-card">' +
                '<div class="chart-title"><span class="chart-icon">' + xIcon('chart-line-up', 'bold') + '</span><span>Rank Progression</span><span class="chart-sub">TOP 10</span></div>' +
                '<div class="chart-wrap chart-tall"><canvas id="chartRankProg"></canvas></div>' +
            '</div>';
        } else {
            html += '<div class="chart-card">' +
                '<div class="chart-title"><span class="chart-icon">' + xIcon('chart-line-up', 'bold') + '</span><span>Rank Progression</span></div>' +
                '<div class="chart-empty"><span class="chart-empty-icon">' + xIcon('chart-bar', 'duotone') + '</span>Not enough rounds saved yet.</div>' +
            '</div>';
        }

        /* 2) Top 10 Average */
        if (top10Avg) {
            html += '<div class="chart-card">' +
                '<div class="chart-title"><span class="chart-icon">' + xIcon('crosshair', 'bold') + '</span><span>Top 10 — Best Average</span><span class="chart-sub">PER GW</span></div>' +
                '<div class="chart-wrap chart-tall"><canvas id="chartTop10Avg"></canvas></div>' +
            '</div>';
        }

        /* 3) Risers & Fallers */
        if (risersData && (risersData.risers.length > 0 || risersData.fallers.length > 0)) {
            html += '<div class="chart-card">' +
                '<div class="chart-title"><span class="chart-icon">' + xIcon('lightning', 'bold') + '</span><span>Risers & Fallers</span><span class="chart-sub">LAST GW</span></div>' +
                '<div class="chart-wrap"><canvas id="chartRisers"></canvas></div>' +
            '</div>';
        }

        /* 4) Top 5 per GW — مع Dropdown */
        if (top5Data) {
            html += '<div class="chart-card">' +
                '<div class="chart-title">' +
                    '<span class="chart-icon">' + xIcon('trophy', 'bold') + '</span>' +
                    '<span>Top 5 — By GW</span>' +
                    '<select class="chart-select" onchange="changeTop5GW(this.value)">' + gwOptions + '</select>' +
                '</div>' +
                '<div class="chart-wrap" id="top5ChartWrap"><canvas id="chartTop5"></canvas></div>' +
            '</div>';
        }

        container.innerHTML = html;
        destroyCharts();

        setTimeout(function() {
            if (rankData) createRankProgressionChart('chartRankProg', rankData);
            if (top10Avg) createTop10AvgChart('chartTop10Avg', top10Avg);
            if (risersData && document.getElementById('chartRisers')) createRisersFallersChart('chartRisers', risersData);
            if (top5Data) createTop5PerGWChart('chartTop5', top5Data);
        }, 60);

        chartsLoaded = true;
    } catch (e) {
        console.error('[Charts] render error:', e);
        container.innerHTML = '<div class="charts-error">Failed to load: ' + e.message + '</div>';
    }
}

function initCharts() {
    if (!chartsLoaded) renderChartsPage();
}

window.initCharts = initCharts;
window.chartsReload = function() {
    chartsLoaded = false;
    destroyCharts();
    renderChartsPage();
};

})();
