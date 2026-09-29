/* =========================================================
   manager-squad.js — FINALISSIMA LEAGUE CHAT (v2)
   مع حماية من bootstrap الفاضي
========================================================= */

(function(){
'use strict';

const FPL_TO_LOCAL_TEAM = {
    'Arsenal': 'Arsenal',
    'Aston Villa': 'Aston Villa',
    'Bournemouth': 'Bournemouth',
    'Brentford': 'Brentford',
    'Brighton': 'Brighton',
    'Chelsea': 'Chelsea',
    'Crystal Palace': 'Crystal Palace',
    'Everton': 'Everton',
    'Fulham': 'Fulham',
    'Ipswich': 'Ipswich Town',
    'Ipswich Town': 'Ipswich Town',
    'Leeds': 'Leeds United',
    'Leeds United': 'Leeds United',
    'Liverpool': 'Liverpool',
    'Man City': 'Man City',
    'Man Utd': 'Man Utd',
    'Manchester City': 'Man City',
    'Manchester United': 'Man Utd',
    'Newcastle': 'Newcastle',
    'Newcastle United': 'Newcastle',
    "Nott'm Forest": 'Nottingham Forest',
    'Nottingham Forest': 'Nottingham Forest',
    'Spurs': 'Spurs',
    'Tottenham': 'Spurs',
    'Sunderland': 'Sunderland',
    'Hull': 'Hull City',
    'Hull City': 'Hull City',
    'Coventry': 'Coventry City',
    'Coventry City': 'Coventry City'
};

function getTeamLogo(fplTeam) {
    if (!fplTeam) return '';
    const rawName = fplTeam.name || '';
    const mappedName = FPL_TO_LOCAL_TEAM[rawName] || rawName;

    if (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[mappedName]) {
        return './' + TEAMS_LOGOS[mappedName];
    }

    if (fplTeam.code) {
        return 'https://resources.premierleague.com/premierleague/badges/70/t' + fplTeam.code + '.png';
    }

    return '';
}

function escapeHTML(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

async function findEntryId(managerName, teamName){
    const all = await getAllManagersCached();
    if(!all || all.length === 0) return null;

    const clean = function(s){
        return String(s||'').toLowerCase().trim().replace(/\s+/g,' ');
    };

    const mClean = clean(managerName);
    const tClean = clean(teamName);

    let found = all.find(function(m){ return clean(m.player_name) === mClean; });
    if(found) return found.entry;

    found = all.find(function(m){ return clean(m.entry_name) === tClean; });
    if(found) return found.entry;

    found = all.find(function(m){
        const pName = clean(m.player_name);
        const eName = clean(m.entry_name);
        if(!mClean) return false;
        return pName.indexOf(mClean) !== -1 ||
               mClean.indexOf(pName) !== -1 ||
               (tClean && (eName.indexOf(tClean) !== -1 || tClean.indexOf(eName) !== -1));
    });
    if(found) return found.entry;

    return null;
}

async function fetchSquad(entryId, gw){
    const res = await fetchWithTimeout('https://finalissima-api.aaa117703.workers.dev/?type=picks&entry=' + entryId + '&gw=' + gw);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
}

async function fetchLive(gw){
    const res = await fetchWithTimeout('https://finalissima-api.aaa117703.workers.dev/?type=live&gw=' + gw);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
}

/* ⭐ نجيب bootstrap من Worker مباشرة */
async function getBootstrapData(){
    /* 1) نحاول من الذاكرة أولاً */
    if (window.fplDbGetData) {
        try {
            const cached = window.fplDbGetData();
            if (cached && cached.elements && Array.isArray(cached.elements) && cached.elements.length > 0) {
                console.log('[SQUAD] Using cached bootstrap');
                return cached;
            }
        } catch (e) {
            console.warn('[SQUAD] fplDbGetData failed:', e);
        }
    }

    /* 2) نجيب من Worker مباشرة */
    try {
        console.log('[SQUAD] Fetching bootstrap from worker...');
        const res = await fetchWithTimeout(
            'https://finalissima-api.aaa117703.workers.dev/?type=bootstrap',
            {},
            15000
        );

        if (!res.ok) {
            throw new Error('Bootstrap HTTP ' + res.status);
        }

        const json = await res.json();

        if (json && json.ok && json.data && json.data.elements) {
            console.log('[SQUAD] Bootstrap loaded from worker:', json.data.elements.length, 'players');
            return json.data;
        }

        throw new Error('Invalid bootstrap shape');
    } catch (e) {
        console.error('[SQUAD] Bootstrap fetch failed:', e);
        return null;
    }
}

/* ⭐ getCurrentGw — مع حماية */
async function getCurrentGw(){
    const bootstrap = await getBootstrapData();
    if(!bootstrap || !bootstrap.events) return 1;
    const ev = bootstrap.events.find(function(e){ return e.is_current; })
            || bootstrap.events.find(function(e){ return e.is_previous; })
            || bootstrap.events.find(function(e){ return e.is_next; });
    return ev ? ev.id : 1;
}

/* ⭐ renderSquad — مع حماية قوية */
function renderSquad(managerName, gw, picksData, liveData, bootstrapData){
    const bootstrap = bootstrapData;

    /* حماية 1: bootstrap مفقود */
    if(!bootstrap){
        return '<div class="squad-error">⚠️ FPL data not loaded.<br><small>Try again in a few seconds.</small></div>';
    }

    /* حماية 2: elements مفقود */
    if(!bootstrap.elements || !Array.isArray(bootstrap.elements)){
        return '<div class="squad-error">⚠️ Invalid FPL data (no elements).<br><small>Try again later.</small></div>';
    }

    /* حماية 3: picks مفقود */
    if(!picksData || !picksData.picks || picksData.picks.length === 0){
        return '<div class="squad-error">⚠️ No squad available for GW ' + gw + '</div>';
    }

    /* 1) نبني teamsById */
    const teamsById = {};
    if (bootstrap.teams && Array.isArray(bootstrap.teams)) {
        bootstrap.teams.forEach(function(t){
            teamsById[t.id] = t;
        });
    }

    /* 2) نبني elementsById */
    const elementsById = {};
    bootstrap.elements.forEach(function(p){
        elementsById[p.id] = p;
    });

    /* 3) نبني liveById */
    const liveById = {};
    if(liveData && liveData.elements && Array.isArray(liveData.elements)){
        liveData.elements.forEach(function(el){
            liveById[el.id] = el;
        });
    }

    /* 4) نجيب picks */
    const picks = picksData.picks;
    const starters = picks.filter(function(p){ return p.position <= 11; });
    const bench = picks.filter(function(p){ return p.position > 11; });

    const POS_MAP = {1:'GK', 2:'DEF', 3:'MID', 4:'FWD'};

    const groups = {
        'GK':  {name:'Goalkeeper',  players:[]},
        'DEF': {name:'Defenders',   players:[]},
        'MID': {name:'Midfielders', players:[]},
        'FWD': {name:'Forwards',    players:[]}
    };
    const benchArr = [];

    /* 5) نرسم كل لاعب */
    function buildPlayerHTML(slot){
        const el = elementsById[slot.element];
        if(!el){
            return '<div class="squad-player">' +
                '<div class="squad-player-badge"></div>' +
                '<div class="squad-player-names">' +
                    '<div class="squad-player-name">Unknown Player</div>' +
                    '<div class="squad-player-team">ID: ' + slot.element + '</div>' +
                '</div>' +
                '<div class="squad-player-points">0</div>' +
            '</div>';
        }

        const team = teamsById[el.team];
        const posKey = POS_MAP[el.element_type] || 'MID';
        const live = liveById[el.id];
        const rawPts = live ? (live.stats.total_points || 0) : 0;
        const multiplier = slot.multiplier || 1;
        const displayPts = rawPts * multiplier;

        const badges = [];
        if(slot.is_captain) badges.push('<span class="squad-cap-badge squad-cap-C">C</span>');
        if(slot.is_vice_captain) badges.push('<span class="squad-cap-badge squad-cap-V">V</span>');
        if(multiplier === 3) badges.push('<span class="squad-cap-badge squad-cap-3x">3x</span>');

        const logoURL = getTeamLogo(team);

        return '<div class="squad-player">' +
                '<div class="squad-player-badge">' +
                    (logoURL ? '<img src="' + logoURL + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
                '</div>' +
                '<div class="squad-player-names">' +
                    '<div class="squad-player-name">' +
                        escapeHTML(el.web_name) +
                        (badges.length ? ' ' + badges.join(' ') : '') +
                    '</div>' +
                    '<div class="squad-player-team">' +
                        escapeHTML(team ? team.name : '') + ' · ' + posKey +
                    '</div>' +
                '</div>' +
                '<div class="squad-player-points' + (slot.is_captain ? ' captain' : '') + '">' +
                    displayPts +
                '</div>' +
            '</div>';
    }

    starters.forEach(function(slot){
        const el = elementsById[slot.element];
        if(!el) return;
        const posKey = POS_MAP[el.element_type] || 'MID';
        groups[posKey].players.push(buildPlayerHTML(slot));
    });

    bench.forEach(function(slot){
        benchArr.push(buildPlayerHTML(slot));
    });

    /* 6) بناء الـ HTML */
    let html = '';

    const history = picksData.entry_history || {};
    const totalPts = history.points || 0;
    const overallPts = history.total_points || 0;
    const overallRank = history.overall_rank || '—';

    html += '<div class="squad-modal-stats">';
    html += '<div class="squad-stat-box"><div class="squad-stat-label">GW ' + gw + '</div><div class="squad-stat-value">' + totalPts + '</div></div>';
    html += '<div class="squad-stat-box"><div class="squad-stat-label">Total</div><div class="squad-stat-value green">' + overallPts + '</div></div>';
    html += '<div class="squad-stat-box"><div class="squad-stat-label">Overall Rank</div><div class="squad-stat-value gold">' + (typeof overallRank === 'number' ? overallRank.toLocaleString() : overallRank) + '</div></div>';
    html += '</div>';

    const order = ['GK', 'DEF', 'MID', 'FWD'];
    order.forEach(function(key){
        const g = groups[key];
        if(g.players.length === 0) return;
        html += '<div class="squad-section">';
        html += '<div class="squad-section-title">' + g.name + '</div>';
        html += g.players.join('');
        html += '</div>';
    });

    if(benchArr.length > 0){
        html += '<div class="squad-section">';
        html += '<div class="squad-section-title">Bench</div>';
        html += benchArr.join('');
        html += '</div>';
    }

    return html;
}

/* ⭐ openSquadModal — مع جلب bootstrap */
async function openSquadModal(entryId, managerName){
    const modal = document.getElementById('squadModal');
    if(!modal) return;

    const displayName = (typeof cleanDisplayName === 'function')
        ? cleanDisplayName(managerName, 13)
        : (managerName || 'Squad');

    modal.innerHTML =
        '<div class="squad-modal-box">' +
            '<button class="squad-modal-close" onclick="document.getElementById(\'squadModal\').classList.remove(\'show\')">×</button>' +
            '<div class="squad-modal-title">' +
                '<div class="squad-modal-manager">' + escapeHTML(displayName) + '</div>' +
                '<div class="squad-modal-subtitle">Loading...</div>' +
            '</div>' +
            '<div class="squad-loading"><div class="spinner"></div><div>Loading squad...</div></div>' +
        '</div>';

    modal.classList.add('show');

    modal.onclick = function(e){
        if(e.target === modal) modal.classList.remove('show');
    };

    try {
        /* ⭐ نجيب bootstrap أول */
        const bootstrap = await getBootstrapData();

        if (!bootstrap) {
            throw new Error('FPL data not available');
        }

        /* ⭐ نحسب GW الحالي */
        let currentGw = 1;
        if (bootstrap.events && Array.isArray(bootstrap.events)) {
            const ev = bootstrap.events.find(function(e){ return e.is_current; })
                    || bootstrap.events.find(function(e){ return e.is_previous; })
                    || bootstrap.events.find(function(e){ return e.is_next; });
            currentGw = ev ? ev.id : 1;
        }

        let picksData = null;
        let usedGw = currentGw;

        try {
            picksData = await fetchSquad(entryId, currentGw);
            if(!picksData.picks || picksData.picks.length === 0){
                throw new Error('empty');
            }
        } catch(e){
            console.warn('[SQUAD] GW ' + currentGw + ' failed, trying previous');
            usedGw = Math.max(1, currentGw - 1);
            picksData = await fetchSquad(entryId, usedGw);
        }

        let liveData = null;
        try {
            liveData = await fetchLive(usedGw);
        } catch(e){
            console.warn('[SQUAD] Live data unavailable:', e.message);
        }

        /* ⭐ نمرر bootstrap لـ renderSquad */
        const content = renderSquad(displayName, usedGw, picksData, liveData, bootstrap);

        modal.innerHTML =
            '<div class="squad-modal-box">' +
                '<button class="squad-modal-close" onclick="document.getElementById(\'squadModal\').classList.remove(\'show\')">×</button>' +
                '<div class="squad-modal-title">' +
                    '<div class="squad-modal-manager">' + escapeHTML(displayName) + '</div>' +
                    '<div class="squad-modal-subtitle">GW ' + usedGw + ' Squad</div>' +
                '</div>' +
                content +
            '</div>';

        modal.onclick = function(e){
            if(e.target === modal) modal.classList.remove('show');
        };

    } catch(e){
        console.error('[SQUAD] Failed:', e);
        modal.innerHTML =
            '<div class="squad-modal-box">' +
                '<button class="squad-modal-close" onclick="document.getElementById(\'squadModal\').classList.remove(\'show\')">×</button>' +
                '<div class="squad-modal-title">' +
                    '<div class="squad-modal-manager">' + escapeHTML(displayName) + '</div>' +
                '</div>' +
                '<div class="squad-error">Failed to load squad.<br><small>' + escapeHTML(e.message) + '</small></div>' +
            '</div>';
    }
}

function attachSquadButton(){
    const profile = document.getElementById('statsProfile');
    if(!profile) return;
    if(profile.style.display === 'none') return;
    if(!profile.querySelector('.stats-profile-card')) return;

    if(profile.querySelector('.btn-view-squad')) return;

    const playerEl = profile.querySelector('.stats-profile-player');
    const entryEl = profile.querySelector('.stats-profile-entry');

    const playerName = playerEl ? playerEl.textContent.trim() : '';
    const teamName = entryEl ? entryEl.textContent.trim() : '';

    if(!playerName && !teamName) return;

    const btn = document.createElement('button');
    btn.className = 'btn-view-squad';
    btn.innerHTML = 'View FPL Squad';
    btn.type = 'button';

    btn.addEventListener('click', async function(){
        const origText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.disabled = true;

        try {
            const entryId = await findEntryId(playerName, teamName);
            btn.textContent = origText;
            btn.disabled = false;

            if(!entryId){
                alert('Could not find this manager in FPL league.');
                return;
            }

            await openSquadModal(entryId, teamName || playerName);
        } catch(e){
            console.error('[SQUAD] Error:', e);
            btn.textContent = origText;
            btn.disabled = false;
            alert('Error: ' + e.message);
        }
    });

    const card = profile.querySelector('.stats-profile-card');
    if(card){
        card.appendChild(btn);
    } else {
        profile.appendChild(btn);
    }

    console.log('[SQUAD] Button added for:', playerName, '|', teamName);
}

let _profileObserver = null;

function setupProfileWatcher(){
    const profile = document.getElementById('statsProfile');
    if(!profile){
        setTimeout(setupProfileWatcher, 500);
        return;
    }

    if(_profileObserver) _profileObserver.disconnect();

    _profileObserver = new MutationObserver(function(){
        if(profile.style.display === 'none'){
            const btn = profile.querySelector('.btn-view-squad');
            if(btn) btn.remove();
        }
        attachSquadButton();
    });

    _profileObserver.observe(profile, {
        attributes: true,
        attributeFilter: ['style'],
        childList: true,
        subtree: true
    });

    attachSquadButton();
}

window.openManagerSquad = async function(entryId, managerName){
    await openSquadModal(entryId, managerName || 'Manager');
};
window.findManagerEntryId = findEntryId;

document.addEventListener('DOMContentLoaded', function(){
    setTimeout(setupProfileWatcher, 1500);
    setTimeout(function(){ getAllManagersCached(); }, 2500);
});

})();
