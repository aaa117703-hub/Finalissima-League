/* =========================================================
   team-view.js — FINALISSIMA LEAGUE CHAT
========================================================= */

async function openTeamView(teamName) {
    if (!teamName) return;

    const modal = document.getElementById('teamModal');
    if (!modal) return;

    modal.classList.add('show');
    modal.innerHTML = '<div class="team-modal-box"><div class="team-modal-loading">Loading...</div></div>';

    try {
        const managers = await fetchTeamManagers(teamName);

        if (!managers || managers.length === 0) {
            modal.innerHTML = '<div class="team-modal-box"><div class="team-modal-loading">لا يوجد مديرون لهذا المنتخب</div></div>';
            return;
        }

        const entries = managers.map(function(m) { return m.entry; });
        const history = await loadTeamHistory(entries);

        const players = managers.map(function(m) {
            const rows = history[m.entry] || [];
            const total = rows.length > 0 ? rows[rows.length - 1].total_points : 0;
            const trend = calcTrend(rows);
            return {
                name: m.player_name || m.entry_name,
                entry: m.entry,
                total: total,
                trend: trend,
                rows: rows
            };
        });

        players.sort(function(a, b) { return b.total - a.total; });

        renderTeamModal(teamName, players);

    } catch (e) {
        console.error('[TeamView]', e);
        modal.innerHTML = '<div class="team-modal-box"><div class="team-modal-loading">خطأ: ' + e.message + '</div></div>';
    }
}

async function fetchTeamManagers(teamName) {
    const all = await getAllManagersCached();

    return all.filter(function(m) {
        if (typeof findPlayerTeam !== 'function') return false;
        const raw = m.player_name || '';
        return findPlayerTeam(raw) === teamName;
    });
}

async function loadTeamHistory(entries) {
    if (!window.sbClient) return {};

    const { data, error } = await window.sbClient
        .from('manager_history')
        .select('entry, event, points, total_points, overall_rank')
        .in('entry', entries)
        .order('event', { ascending: true });

    if (error) {
        console.error('[TeamView] Supabase:', error);
        return {};
    }

    const map = {};
    (data || []).forEach(function(row) {
        if (!map[row.entry]) map[row.entry] = [];
        map[row.entry].push(row);
    });

    return map;
}

function calcTrend(rows) {
    if (!rows || rows.length < 3) return '➡️';

    const last3 = rows.slice(-3);
    const first = last3[0].points;
    const last = last3[last3.length - 1].points;

    if (last > first + 5) return '📈';
    if (last < first - 5) return '📉';
    return '➡️';
}

function renderTeamModal(teamName, players) {
    const modal = document.getElementById('teamModal');
    if (!modal) return;

    const logo = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[teamName])
        ? './' + TEAMS_LOGOS[teamName]
        : '';

    const total = players.reduce(function(s, p) { return s + p.total; }, 0);
    const avg = Math.round(total / players.length);

    let html = '<div class="team-modal-box">';
    html += '<button class="team-modal-close" onclick="closeTeamView()">✕</button>';

    html += '<div class="team-modal-header">';
    if (logo) html += '<img src="' + logo + '" alt="">';
    html += '<div class="team-modal-title">' + teamName + '</div>';
    html += '</div>';

    html += '<div class="team-modal-kpis">';
    html += '<div class="team-modal-kpi"><div class="team-modal-kpi-label">Total</div><div class="team-modal-kpi-value">' + total + '</div></div>';
    html += '<div class="team-modal-kpi"><div class="team-modal-kpi-label">Avg</div><div class="team-modal-kpi-value">' + avg + '</div></div>';
    html += '<div class="team-modal-kpi"><div class="team-modal-kpi-label">Managers</div><div class="team-modal-kpi-value">' + players.length + '</div></div>';
    html += '</div>';

    html += '<div class="team-modal-list">';

    players.forEach(function(p, i) {
        let rowClass = '';
        if (i === 0) rowClass = ' top';
        else if (i === players.length - 1) rowClass = ' bottom';

        html += '<div class="team-player-row' + rowClass + '">';
        html += '<div class="team-player-rank">' + (i + 1) + '</div>';
        html += '<div class="team-player-name">' + p.name + '</div>';
        html += '<div class="team-player-points">' + p.total + '</div>';
        html += '<div class="team-player-trend">' + p.trend + '</div>';
        html += '</div>';
    });

    html += '</div>';
    html += '</div>';

    modal.innerHTML = html;
}

function closeTeamView() {
    const modal = document.getElementById('teamModal');
    if (modal) {
        modal.classList.remove('show');
        modal.innerHTML = '';
    }
}

window.openTeamView = openTeamView;
window.closeTeamView = closeTeamView;
