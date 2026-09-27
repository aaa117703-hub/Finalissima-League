/* =========================================================
   charts.js — FINALISSIMA LEAGUE CHAT
========================================================= */

(function(){
'use strict';

let chartsLoaded = false;
let chartsData = null;
let chartInstances = {};

const CHART_COLORS = [
    '#8B1A2F',
    '#C8A95F',
    '#B22A45',
    '#8B7340',
    '#4A0A15',
    '#E5D4A5',
    '#6B0F1F',
    '#D6BF7E',
    '#2D0A0F',
    '#A02038'
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

/* ⭐ استخدام cleanDisplayName */
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
    Chart.defaults.plugins.legend.labels.font = {
        size: 11,
        weight: '800',
        family: "'Cairo', sans-serif"
    };
    Chart.defaults.plugins.legend.position = 'bottom';

    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(31, 31, 31, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#fff';
    Chart.defaults.plugins.tooltip.bodyColor = '#E5E7EB';
    Chart.defaults.plugins.tooltip.borderColor = '#8B1A2F';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.titleFont = {
        size: 12,
        weight: '900',
        family: "'Cairo', sans-serif"
    };
    Chart.defaults.plugins.tooltip.bodyFont = {
        size: 11,
        weight: '700',
        family: "'Cairo', sans-serif"
    };

    Chart.defaults.animation.duration = 900;
    Chart.defaults.animation.easing = 'easeOutQuart';
}

async function fetchAllRanks() {
    if (!window.sbClient) return null;

    try {
        const { data, error } = await window.sbClient
            .from('weekly_ranks')
            .select('round, entry_id, player_name, entry_name, rank, total, event_total')
            .order('round', { ascending: true });

        if (error) {
            console.error('[Charts] fetch error:', error);
            return null;
        }

        return data || [];
    } catch (e) {
        console.error('[Charts] exception:', e);
        return null;
    }
}

function buildRankProgression(ranks) {
    if (!ranks || ranks.length === 0) return null;

    const rounds = [...new Set(ranks.map(r => r.round))].sort((a, b) => a - b);
    const lastRound = rounds[rounds.length - 1];

    const lastRoundRanks = ranks
        .filter(r => r.round === lastRound)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 10);

    const displayRounds = rounds.slice(-8);

    const datasets = lastRoundRanks.map((entry, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];

        const data = displayRounds.map(r => {
            const found = ranks.find(x => x.round === r && x.entry_id === entry.entry_id);
            return found ? found.rank : null;
        });

        return {
            label: shortenName(entry.player_name || entry.entry_name, 12),
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
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 3,
            spanGaps: true
        };
    });

    return {
        labels: displayRounds.map(r => 'GW' + r),
        datasets: datasets
    };
}

function buildTop15Total(managers) {
    if (!managers || managers.length === 0) return null;

    const sorted = [...managers]
        .sort((a, b) => (b.total || 0) - (a.total || 0))
        .slice(0, 15);

    return {
        labels: sorted.map(m => shortenName(m.player_name || m.entry_name, 14)),
        datasets: [{
            label: 'Total Points',
            data: sorted.map(m => m.total || 0),
            backgroundColor: sorted.map((m, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                return hexToRgba(color, 0.75);
            }),
            borderColor: sorted.map((m, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 'flex',
            maxBarThickness: 40
        }]
    };
}

function buildPointsDistribution(managers) {
    if (!managers || managers.length === 0) return null;

    const totals = managers.map(m => m.total || 0).filter(t => t > 0);
    if (totals.length === 0) return null;

    const min = Math.min(...totals);
    const max = Math.max(...totals);

    const bucketCount = 10;
    const step = Math.ceil((max - min + 1) / bucketCount);

    const buckets = new Array(bucketCount).fill(0);
    const bucketLabels = [];

    for (let i = 0; i < bucketCount; i++) {
        const from = min + (i * step);
        const to = from + step - 1;
        bucketLabels.push(from + '-' + to);
    }

    totals.forEach(t => {
        const idx = Math.min(Math.floor((t - min) / step), bucketCount - 1);
        buckets[idx]++;
    });

    return {
        labels: bucketLabels,
        datasets: [{
            label: 'Managers',
            data: buckets,
            backgroundColor: 'rgba(139, 26, 47, 0.7)',
            borderColor: '#8B1A2F',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 'flex',
            maxBarThickness: 44
        }]
    };
}

function buildRisersFallers(ranks) {
    if (!ranks || ranks.length === 0) return null;

    const rounds = [...new Set(ranks.map(r => r.round))].sort((a, b) => a - b);
    if (rounds.length < 2) return null;

    const lastRound = rounds[rounds.length - 1];
    const prevRound = rounds[rounds.length - 2];

    const last = {};
    ranks.filter(r => r.round === lastRound).forEach(r => { last[r.entry_id] = r; });
    const prev = {};
    ranks.filter(r => r.round === prevRound).forEach(r => { prev[r.entry_id] = r; });

    const changes = [];
    Object.keys(last).forEach(entryId => {
        if (!prev[entryId]) return;
        const diff = prev[entryId].rank - last[entryId].rank;
        changes.push({
            name: shortenName(last[entryId].player_name || last[entryId].entry_name, 14),
            diff: diff
        });
    });

    const risers = changes.filter(c => c.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 6);
    const fallers = changes.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 6);

    return { risers, fallers };
}

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
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 12,
                        font: { size: 10, weight: '800' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ' ' + ctx.dataset.label + ': #' + ctx.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    reverse: true,
                    beginAtZero: false,
                    grid: { color: 'rgba(139, 26, 47, 0.08)', drawBorder: false },
                    ticks: {
                        callback: function(v) { return '#' + v; },
                        font: { size: 10, weight: '800' },
                        color: '#666666'
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { font: { size: 10, weight: '800' }, color: '#666666' }
                }
            }
        }
    });
}

function createTop15Chart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    chartInstances.top15 = new Chart(el, {
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
                        label: function(ctx) { return ' ' + ctx.parsed.x + ' pts'; }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(139, 26, 47, 0.08)', drawBorder: false },
                    ticks: { font: { size: 10, weight: '800' }, color: '#666666' }
                },
                y: {
                    grid: { display: false, drawBorder: false },
                    ticks: { font: { size: 10, weight: '800' }, color: '#1F1F1F' }
                }
            }
        }
    });
}

function createDistributionChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    chartInstances.distribution = new Chart(el, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ' ' + ctx.parsed.y + ' managers'; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(139, 26, 47, 0.08)', drawBorder: false },
                    ticks: { precision: 0, font: { size: 10, weight: '800' }, color: '#666666' }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        font: { size: 9, weight: '800' },
                        color: '#666666',
                        maxRotation: 45,
                        minRotation: 45
                    }
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
                backgroundColor: combined.map(c =>
                    c.diff > 0 ? hexToRgba('#C8A95F', 0.75) : hexToRgba('#8B1A2F', 0.75)
                ),
                borderColor: combined.map(c =>
                    c.diff > 0 ? '#C8A95F' : '#8B1A2F'
                ),
                borderWidth: 2,
                borderRadius: 6,
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
                            return v > 0 ? ' ▲ ' + v + ' ranks up' : ' ▼ ' + Math.abs(v) + ' ranks down';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(139, 26, 47, 0.08)', drawBorder: false },
                    ticks: { font: { size: 10, weight: '800' }, color: '#666666' }
                },
                y: {
                    grid: { display: false, drawBorder: false },
                    ticks: { font: { size: 10, weight: '800' }, color: '#1F1F1F' }
                }
            }
        }
    });
}

async function renderChartsPage() {
    const container = document.getElementById('chartsContent');
    if (!container) return;

    container.innerHTML =
        '<div class="charts-loading">' +
            '<div class="spinner"></div>' +
            '<div>Loading charts...</div>' +
        '</div>';

    if (typeof Chart === 'undefined') {
        container.innerHTML =
            '<div class="charts-error">' +
                'Chart.js not loaded. Please refresh the page.' +
            '</div>';
        return;
    }

    try {
        const [ranks, managers] = await Promise.all([
            fetchAllRanks(),
            typeof getAllManagersCached === 'function'
                ? getAllManagersCached()
                : Promise.resolve([])
        ]);

        const rankData = buildRankProgression(ranks);
        const top15Data = buildTop15Total(managers);
        const distData = buildPointsDistribution(managers);
        const risersData = buildRisersFallers(ranks);

        let html = '';

        html +=
            '<div class="charts-intro">' +
                '<strong>📊 League Analytics</strong><br>' +
                'نظرة شاملة على أداء المديرين — الرتب، النقاط، والتوزيع' +
            '</div>';

        if (rankData) {
            html +=
                '<div class="chart-card">' +
                    '<div class="chart-title">' +
                        '<span class="chart-icon">📈</span>' +
                        '<span>Rank Progression</span>' +
                        '<span class="chart-sub">TOP 10</span>' +
                    '</div>' +
                    '<div class="chart-wrap chart-tall">' +
                        '<canvas id="chartRankProg"></canvas>' +
                    '</div>' +
                '</div>';
        } else {
            html +=
                '<div class="chart-card">' +
                    '<div class="chart-title">' +
                        '<span class="chart-icon">📈</span>' +
                        '<span>Rank Progression</span>' +
                    '</div>' +
                    '<div class="chart-empty">' +
                        '<span class="chart-empty-icon">📊</span>' +
                        'Not enough rounds saved yet.<br>' +
                        'Save at least 2 rounds to see progression.' +
                    '</div>' +
                '</div>';
        }

        if (risersData && (risersData.risers.length > 0 || risersData.fallers.length > 0)) {
            html +=
                '<div class="chart-card">' +
                    '<div class="chart-title">' +
                        '<span class="chart-icon">⚡</span>' +
                        '<span>Risers & Fallers</span>' +
                        '<span class="chart-sub">LAST GW</span>' +
                    '</div>' +
                    '<div class="chart-wrap">' +
                        '<canvas id="chartRisers"></canvas>' +
                    '</div>' +
                '</div>';
        }

        if (top15Data) {
            html +=
                '<div class="chart-card">' +
                    '<div class="chart-title">' +
                        '<span class="chart-icon">🏆</span>' +
                        '<span>Top 15 Total Points</span>' +
                        '<span class="chart-sub">SEASON</span>' +
                    '</div>' +
                    '<div class="chart-wrap chart-tall">' +
                        '<canvas id="chartTop15"></canvas>' +
                    '</div>' +
                '</div>';
        }

        if (distData) {
            html +=
                '<div class="chart-card">' +
                    '<div class="chart-title">' +
                        '<span class="chart-icon">📊</span>' +
                        '<span>Points Distribution</span>' +
                        '<span class="chart-sub">' + managers.length + ' MGRS</span>' +
                    '</div>' +
                    '<div class="chart-wrap">' +
                        '<canvas id="chartDist"></canvas>' +
                    '</div>' +
                '</div>';
        }

        container.innerHTML = html;

        destroyCharts();

        setTimeout(function() {
            if (rankData) createRankProgressionChart('chartRankProg', rankData);
            if (risersData && document.getElementById('chartRisers')) createRisersFallersChart('chartRisers', risersData);
            if (top15Data) createTop15Chart('chartTop15', top15Data);
            if (distData) createDistributionChart('chartDist', distData);
        }, 60);

        chartsLoaded = true;

    } catch (e) {
        console.error('[Charts] render error:', e);
        container.innerHTML =
            '<div class="charts-error">' +
                'Failed to load charts: ' + e.message +
            '</div>';
    }
}

function initCharts() {
    if (!chartsLoaded) {
        renderChartsPage();
    }
}

window.initCharts = initCharts;
window.chartsReload = function() {
    chartsLoaded = false;
    destroyCharts();
    renderChartsPage();
};

})();
