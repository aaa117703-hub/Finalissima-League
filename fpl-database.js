/* =========================================================
   fpl-database.js — FINALISSIMA LEAGUE CHAT
   FPL Players & Teams Database (يشتغل بالخلفية)
========================================================= */

(function(){
'use strict';

const WORKER_URL = 'https://finalissima-api.aaa117703.workers.dev';
const CACHE_KEY = 'fin_bootstrap_v3';
const CACHE_TTL = 6 * 60 * 60 * 1000;

const POS_MAP = {
    1: {short:'GK',  name:'Goalkeeper'},
    2: {short:'DEF', name:'Defender'},
    3: {short:'MID', name:'Midfielder'},
    4: {short:'FWD', name:'Forward'}
};

const SORT_OPTIONS = [
    {key:'total_points',        label:'Total Points'},
    {key:'event_points',        label:'GW Points'},
    {key:'now_cost',            label:'Price'},
    {key:'form',                label:'Form'},
    {key:'selected_by_percent', label:'Selected %'},
    {key:'goals_scored',        label:'Goals'},
    {key:'assists',             label:'Assists'},
    {key:'bonus',               label:'Bonus'}
];

const state = {
    data: null,
    teamsById: {},
    filtered: [],
    search: '',
    position: 'ALL',
    teamId: 'ALL',
    sortBy: 'total_points',
    sortDir: 'desc',
    view: 'players',
    loading: false,
    loaded: false
};

function badgeURL(code, size){
    size = size || 70;
    return 'https://resources.premierleague.com/premierleague/badges/' + size + '/t' + code + '.png';
}

async function loadBootstrap(){
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if(cached){
            const parsed = JSON.parse(cached);
            if(Date.now() - parsed.ts < CACHE_TTL){
                console.log('[FPL] Loaded from cache');
                return parsed.data;
            }
        }
    } catch(e){}

    console.log('[FPL] Fetching bootstrap...');
    const res = await fetch(WORKER_URL + '?type=current');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ts: Date.now(), data: data}));
    } catch(e){
        console.warn('[FPL] Cache write failed:', e.message);
    }

    return data;
}

function applyFilters(){
    if(!state.data) return;
    const term = state.search.toLowerCase().trim();
    const players = state.data.elements;

    let arr = players.filter(function(p){
        if(term){
            const full = (p.web_name + ' ' + p.first_name + ' ' + p.second_name).toLowerCase();
            if(full.indexOf(term) === -1) return false;
        }
        if(state.position !== 'ALL' && p.element_type !== state.position) return false;
        if(state.teamId !== 'ALL' && p.team !== state.teamId) return false;
        return true;
    });

    const key = state.sortBy;
    const dir = state.sortDir === 'desc' ? -1 : 1;
    arr.sort(function(a, b){
        let va = a[key], vb = b[key];
        if(typeof va === 'string') va = parseFloat(va) || 0;
        if(typeof vb === 'string') vb = parseFloat(vb) || 0;
        return (va - vb) * dir;
    });

    state.filtered = arr;
}

function renderPlayerRow(p){
    const team = state.teamsById[p.team];
    const pos = POS_MAP[p.element_type] || {short:'?'};
    const badge = team ? badgeURL(team.code, 70) : '';
    const price = (p.now_cost / 10).toFixed(1);

    const row = document.createElement('div');
    row.className = 'fpl-player-row';
    row.dataset.id = p.id;

    const badgeWrap = document.createElement('div');
    badgeWrap.className = 'fpl-player-team-badge';
    if(badge){
        const bimg = document.createElement('img');
        bimg.src = badge;
        bimg.alt = '';
        bimg.loading = 'lazy';
        badgeWrap.appendChild(bimg);
    }
    row.appendChild(badgeWrap);

    const names = document.createElement('div');
    names.className = 'fpl-player-names';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'fpl-player-name';
    nameDiv.appendChild(document.createTextNode(p.web_name + ' '));

    const posSpan = document.createElement('span');
    posSpan.className = 'fpl-pos-badge fpl-pos-' + pos.short;
    posSpan.textContent = pos.short;
    nameDiv.appendChild(posSpan);
    names.appendChild(nameDiv);

    const subDiv = document.createElement('div');
    subDiv.className = 'fpl-player-sub';
    subDiv.textContent = (team ? team.name : '') + ' · ' + p.first_name + ' ' + p.second_name;
    names.appendChild(subDiv);

    row.appendChild(names);

    const priceDiv = document.createElement('div');
    priceDiv.className = 'fpl-player-price';
    priceDiv.textContent = '£' + price + 'm';
    row.appendChild(priceDiv);

    const ptsDiv = document.createElement('div');
    ptsDiv.className = 'fpl-player-points';
    ptsDiv.appendChild(document.createTextNode(String(p.total_points)));
    const small = document.createElement('small');
    small.textContent = 'PTS';
    ptsDiv.appendChild(small);
    row.appendChild(ptsDiv);

    row.addEventListener('click', function(){
        openModal(p.id);
    });

    return row;
}

function renderPlayersList(){
    const wrap = document.createElement('div');
    wrap.className = 'fpl-content';

    if(state.filtered.length === 0){
        wrap.innerHTML = '<div class="fpl-empty">No players match your filters</div>';
        return wrap;
    }

    const limit = Math.min(state.filtered.length, 200);
    const frag = document.createDocumentFragment();
    for(let i = 0; i < limit; i++){
        frag.appendChild(renderPlayerRow(state.filtered[i]));
    }
    wrap.appendChild(frag);

    if(state.filtered.length > limit){
        const more = document.createElement('div');
        more.className = 'fpl-empty';
        more.textContent = 'Showing first ' + limit + ' of ' + state.filtered.length + ' — refine search to see more';
        wrap.appendChild(more);
    }

    return wrap;
}

function renderTeamsGrid(){
    const wrap = document.createElement('div');
    wrap.className = 'fpl-teams-grid';

    const teams = state.data.teams.slice().sort(function(a,b){
        return a.name.localeCompare(b.name);
    });

    teams.forEach(function(t){
        const count = state.data.elements.filter(function(p){ return p.team === t.id; }).length;
        const card = document.createElement('div');
        card.className = 'fpl-team-card';

        const badge = document.createElement('div');
        badge.className = 'fpl-team-card-badge';
        const img = document.createElement('img');
        img.src = badgeURL(t.code, 110);
        img.alt = '';
        img.loading = 'lazy';
        badge.appendChild(img);
        card.appendChild(badge);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'fpl-team-card-name';
        nameDiv.textContent = t.name;
        card.appendChild(nameDiv);

        const countDiv = document.createElement('div');
        countDiv.className = 'fpl-team-card-count';
        countDiv.textContent = count + ' PLAYERS';
        card.appendChild(countDiv);

        card.addEventListener('click', function(){
            state.view = 'players';
            state.teamId = t.id;
            state.position = 'ALL';
            state.search = '';

            const searchInput = document.getElementById('fplSearch');
            if(searchInput) searchInput.value = '';

            const teamSelect = document.getElementById('fplTeam');
            if(teamSelect) teamSelect.value = t.id;

            document.querySelectorAll('.fpl-pos-btn').forEach(function(b){ b.classList.remove('active'); });
            const allBtn = document.querySelector('.fpl-pos-btn[data-pos="ALL"]');
            if(allBtn) allBtn.classList.add('active');

            document.querySelectorAll('.fpl-view-btn').forEach(function(b){
                b.classList.toggle('active', b.dataset.view === 'players');
            });

            const filterRow = document.querySelector('.fpl-filter-row');
            const searchRow = document.querySelector('.fpl-search-row');
            if(filterRow) filterRow.style.display = 'flex';
            if(searchRow) searchRow.style.display = 'flex';

            refresh();
        });

        wrap.appendChild(card);
    });

    return wrap;
}

function render(){
    const content = document.getElementById('fplDbContent');
    const summary = document.getElementById('fplSummary');
    if(!content) return;

    if(state.loading){
        content.innerHTML = '<div class="fpl-loading"><div class="spinner"></div><div>Loading FPL data...</div></div>';
        if(summary) summary.style.display = 'none';
        return;
    }

    if(!state.data){
        content.innerHTML = '<div class="fpl-error">Failed to load FPL data. Check console for details.</div>';
        if(summary) summary.style.display = 'none';
        return;
    }

    content.innerHTML = '';

    if(state.view === 'teams'){
        content.appendChild(renderTeamsGrid());
        if(summary){
            summary.style.display = 'block';
            summary.innerHTML = '<span>' + state.data.teams.length + '</span> PREMIER LEAGUE TEAMS · <span>' + state.data.elements.length + '</span> PLAYERS';
        }
    } else {
        content.appendChild(renderPlayersList());
        if(summary){
            summary.style.display = 'block';
            summary.innerHTML = 'Showing <span>' + state.filtered.length + '</span> players · Top sorted by <span>' + getSortLabel() + '</span>';
        }
    }
}

function getSortLabel(){
    const found = SORT_OPTIONS.find(function(o){ return o.key === state.sortBy; });
    return found ? found.label : state.sortBy;
}

function openModal(playerId){
    const p = state.data.elements.find(function(x){ return x.id === playerId; });
    if(!p) return;

    const team = state.teamsById[p.team];
    const pos = POS_MAP[p.element_type] || {short:'?', name:'?'};
    const badge = team ? badgeURL(team.code, 70) : '';

    const modal = document.getElementById('fplModal');
    if(!modal) return;

    const formNum = parseFloat(p.form) || 0;
    const formClass = formNum >= 5 ? 'green' : (formNum < 2 ? 'red' : '');

    const box = document.createElement('div');
    box.className = 'fpl-modal-box';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fpl-modal-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = function(){ modal.classList.remove('show'); };
    box.appendChild(closeBtn);

    const header = document.createElement('div');
    header.className = 'fpl-modal-header';

    const badgeWrap = document.createElement('div');
    badgeWrap.className = 'fpl-modal-photo';
    if(badge){
        const bimg = document.createElement('img');
        bimg.src = badge;
        bimg.alt = '';
        bimg.style.objectFit = 'contain';
        bimg.style.padding = '12px';
        badgeWrap.appendChild(bimg);
    }
    header.appendChild(badgeWrap);

    const info = document.createElement('div');
    info.className = 'fpl-modal-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'fpl-modal-name';
    nameEl.textContent = p.web_name;
    info.appendChild(nameEl);

    const realEl = document.createElement('div');
    realEl.className = 'fpl-modal-realname';
    realEl.textContent = p.first_name + ' ' + p.second_name;
    info.appendChild(realEl);

    const tags = document.createElement('div');
    tags.className = 'fpl-modal-tags';

    const posTag = document.createElement('span');
    posTag.className = 'fpl-pos-badge fpl-pos-' + pos.short;
    posTag.textContent = pos.name;
    tags.appendChild(posTag);

    if(team){
        const teamTag = document.createElement('span');
        teamTag.className = 'fpl-modal-team-tag';
        const timg = document.createElement('img');
        timg.src = badge;
        timg.alt = '';
        teamTag.appendChild(timg);
        teamTag.appendChild(document.createTextNode(team.name));
        tags.appendChild(teamTag);
    }
    info.appendChild(tags);
    header.appendChild(info);
    box.appendChild(header);

    const stats = document.createElement('div');
    stats.className = 'fpl-modal-stats';

    stats.appendChild(statBox('Price', '£' + (p.now_cost/10).toFixed(1) + 'm', 'gold'));
    stats.appendChild(statBox('Total Pts', p.total_points, ''));
    stats.appendChild(statBox('Form', p.form, formClass));
    stats.appendChild(statBox('GW Pts', p.event_points, ''));
    stats.appendChild(statBox('Goals', p.goals_scored, 'green'));
    stats.appendChild(statBox('Assists', p.assists, 'green'));

    box.appendChild(stats);

    const details = document.createElement('div');
    details.className = 'fpl-modal-details';

    details.appendChild(detailRow('Minutes', p.minutes));
    details.appendChild(detailRow('Clean Sheets', p.clean_sheets));
    details.appendChild(detailRow('Bonus', p.bonus));
    details.appendChild(detailRow('Selected By', p.selected_by_percent + '%'));
    details.appendChild(detailRow('Points / Game', p.points_per_game));
    details.appendChild(detailRow('Expected Goals', p.expected_goals));
    details.appendChild(detailRow('Expected Assists', p.expected_assists));
    details.appendChild(detailRow('Status', statusLabel(p.status)));

    box.appendChild(details);

    modal.innerHTML = '';
    modal.appendChild(box);
    modal.classList.add('show');

    modal.onclick = function(e){
        if(e.target === modal) modal.classList.remove('show');
    };
}

function statBox(label, value, cls){
    const box = document.createElement('div');
    box.className = 'fpl-stat-box';

    const l = document.createElement('div');
    l.className = 'fpl-stat-label';
    l.textContent = label;

    const v = document.createElement('div');
    v.className = 'fpl-stat-value' + (cls ? ' ' + cls : '');
    v.textContent = String(value);

    box.appendChild(l);
    box.appendChild(v);
    return box;
}

function detailRow(label, value){
    const row = document.createElement('div');
    row.className = 'fpl-detail-row';

    const l = document.createElement('span');
    l.className = 'fpl-detail-label';
    l.textContent = label;

    const v = document.createElement('span');
    v.className = 'fpl-detail-value';
    v.textContent = String(value);

    row.appendChild(l);
    row.appendChild(v);
    return row;
}

function statusLabel(s){
    if(s === 'a') return 'Available';
    if(s === 'i') return 'Injured';
    if(s === 's') return 'Suspended';
    if(s === 'u') return 'Unavailable';
    if(s === 'd') return 'Doubtful';
    return s || '—';
}

function refresh(){
    applyFilters();
    render();
}

function buildControls(){
    const sortSel = document.getElementById('fplSort');
    if(sortSel && sortSel.options.length === 0){
        SORT_OPTIONS.forEach(function(o){
            const opt = document.createElement('option');
            opt.value = o.key;
            opt.textContent = o.label;
            if(o.key === state.sortBy) opt.selected = true;
            sortSel.appendChild(opt);
        });
        sortSel.addEventListener('change', function(){
            state.sortBy = this.value;
            refresh();
        });
    }

    const teamSel = document.getElementById('fplTeam');
    if(teamSel && state.data && teamSel.options.length === 1){
        state.data.teams.slice().sort(function(a,b){
            return a.name.localeCompare(b.name);
        }).forEach(function(t){
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            teamSel.appendChild(opt);
        });
        teamSel.addEventListener('change', function(){
            const v = this.value;
            state.teamId = (v === 'ALL') ? 'ALL' : parseInt(v, 10);
            refresh();
        });
    }

    const searchInput = document.getElementById('fplSearch');
    if(searchInput && !searchInput.dataset.bound){
        searchInput.dataset.bound = '1';
        let timer = null;
        searchInput.addEventListener('input', function(){
            const val = this.value;
            clearTimeout(timer);
            timer = setTimeout(function(){
                state.search = val;
                refresh();
            }, 150);
        });
    }

    document.querySelectorAll('.fpl-view-btn').forEach(function(btn){
        if(btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function(){
            const v = this.dataset.view;
            state.view = v;
            document.querySelectorAll('.fpl-view-btn').forEach(function(b){
                b.classList.toggle('active', b.dataset.view === v);
            });
            const filterRow = document.querySelector('.fpl-filter-row');
            const searchRow = document.querySelector('.fpl-search-row');
            if(filterRow) filterRow.style.display = (v === 'players') ? 'flex' : 'none';
            if(searchRow) searchRow.style.display = (v === 'players') ? 'flex' : 'none';
            refresh();
        });
    });

    document.querySelectorAll('.fpl-pos-btn').forEach(function(btn){
        if(btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function(){
            const pos = this.dataset.pos;
            state.position = (pos === 'ALL') ? 'ALL' : parseInt(pos, 10);
            document.querySelectorAll('.fpl-pos-btn').forEach(function(b){
                b.classList.toggle('active', b.dataset.pos === pos);
            });
            refresh();
        });
    });
}

async function init(){
    if(state.loaded || state.loading) return;
    state.loading = true;
    render();

    try {
        const data = await loadBootstrap();
        state.data = data;

        state.teamsById = {};
        data.teams.forEach(function(t){ state.teamsById[t.id] = t; });

        state.loaded = true;
        state.loading = false;

        buildControls();
        refresh();

        console.log('[FPL] Ready. Teams:', data.teams.length, '· Players:', data.elements.length);
    } catch(e){
        state.loading = false;
        console.error('[FPL] Load failed:', e);
        render();
    }
}

document.addEventListener('DOMContentLoaded', function(){
    setTimeout(init, 1000);
});

window.fplDbInit = init;
window.fplDbGetData = function(){ return state.data; };
window.fplDbGetTeamsById = function(){ return state.teamsById; };
window.fplDbGetState = function(){ return state; };

})();
