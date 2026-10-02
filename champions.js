/* =========================================================
   champions.js — FINALISSIMA LEAGUE CHAT (v=12)
   🔐 منطق الأدمن + sessionStorage
========================================================= */

const CHAMP_PIN = '024680';
const CHAMP_GROUPS = ['A', 'B', 'C', 'D'];
const CHAMP_POT_SIZE = 4;

let champData = { meta: null, draw: [], matches: [], pendingDraw: null };
let champLoaded = false;
let champDrawAnimating = false;
let champCurrentView = 'matches';

/* =========================================================
   🔐 Admin Logic
========================================================= */

function isChampAdmin() {
    try {
        return sessionStorage.getItem('champ_admin') === 'true';
    } catch (e) {
        return false;
    }
}

function setChampAdmin() {
    try {
        sessionStorage.setItem('champ_admin', 'true');
    } catch (e) {}
}

function clearChampAdmin() {
    try {
        sessionStorage.removeItem('champ_admin');
    } catch (e) {}
}

window.isChampAdmin = isChampAdmin;
window.clearChampAdmin = clearChampAdmin;

/* =========================================================
   Helpers
========================================================= */

function xIcon(name, variant) {
    variant = variant || 'regular';
    const variantClass = variant === 'fill' ? 'ph-fill' :
                         variant === 'bold' ? 'ph-bold' :
                         variant === 'duotone' ? 'ph-duotone' :
                         'ph';
    return '<i class="' + variantClass + ' ph-' + name + '"></i>';
}
window.xIcon = xIcon;

function champGoToTab() {
    if (typeof switchTab === 'function') switchTab('champions');
}
window.champGoToTab = champGoToTab;

function champGetTeamName(code) {
    if (typeof teamsMap !== 'undefined' && teamsMap[code]) {
        return teamsMap[code].name || code;
    }
    return code || 'Unknown';
}
window.champGetTeamName = champGetTeamName;

function champGetTeamLogo(code) {
    if (typeof teamsMap !== 'undefined' && teamsMap[code]) {
        return teamsMap[code].logo || '';
    }
    return '';
}
window.champGetTeamLogo = champGetTeamLogo;

function champWait(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
}
window.champWait = champWait;

function champShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
}
window.champShuffle = champShuffle;

/* =========================================================
   Supabase
========================================================= */

async function loadChampionsMeta() {
    if (!window.sbClient) return null;
    try {
        const { data, error } = await window.sbClient
            .from('champions_meta').select('*').eq('id', 1).single();
        if (error) throw error;
        return data;
    } catch (e) { return null; }
}

async function loadChampionsDraw() {
    if (!window.sbClient) return [];
    try {
        const { data, error } = await window.sbClient
            .from('champions_draw').select('*')
            .order('pot_number', { ascending: true })
            .order('group_name', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
}

async function loadChampionsMatches() {
    if (!window.sbClient) return [];
    try {
        const { data, error } = await window.sbClient
            .from('champions_matches').select('*')
            .order('stage', { ascending: true })
            .order('round_num', { ascending: true })
            .order('id', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
}

async function saveCh }ampionsMeta(updates) {
    catch if (!window.sbClient) return false;
 (    try {
        const payload = Object.assign({e id: 1, updated_at:) new Date().toISOString() { }, updates);
        const { error } = await window.sbClient
            .from('champions_meta').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}
window.saveChampionsMeta = saveChampionsMeta;

async function saveChampionsDraw(rows) {
    if (!window.sbClient) return false;
    try {
        await window.sbClient.from('champions_draw').delete().neq('id', 0);
        const { error } = await window.sbClient.from('champions_draw').insert(rows);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('[Champions] saveDraw error:', e);
        return false;
    }
}
window.saveChampionsDraw = saveChampionsDraw;

async function saveChampionsMatches(rows) {
    if (!window.sbClient) return false;
    try {
        await window.sbClient.from('champions_matches').delete().neq('id', 0);
        const { error } = await window.sbClient.from('champions_matches').insert(rows);
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}
window.saveChampionsMatches = saveChampionsMatches;

async function updateChampionsMatch(id, updates) {
    if (!window.sbClient) return false;
    try {
        const payload = Object.assign({ updated_at: new Date().toISOString() }, updates);
        const { error } = await window.sbClient
            .from('champions_matches').update(payload).eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}

async function resetChampions() {
    if (!window.sbClient) return false;
    try {
        await window.sbClient.from('champions_draw').delete().neq('id', 0);
        await window.sbClient.from('champions_matches').delete().neq('id', 0);
        await window.sbClient.from('champions_meta').upsert({
            id: 1, started: false, start_gw: null,
            current_stage: 'groups', current_round: 0,
            champion: null, updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        return true;
    } catch (e) { return false; }
}

/* =========================================================
   Fetch Scores
========================================================= */

async function fetchTeamScoresForRound(gw) {
    if (!window.sbClient) return {};
    try {
        const { data, error } = await window.sbClient
            .from('match_results')
            .select('home_team, away_team, home_score, away_score')
            .eq('round', String(gw));
        if (error) throw error;
        const map = {};
        (data || []).forEach(function(row) {
            const hs = parseInt(row.home_score, 10);
            const as = parseInt(row.away_score, 10);
            if (!isNaN(hs)) map[row.home_team] = hs;
            if (!isNaN(as)) map[row.away_team] = as;
        });
        return map;
    return {}; }
}

/* =========================================================
   Pots
========================================================= */

async function buildPots() {
    let sortedTeams = [];

    if (typeof calculateStandingsUpToRound === 'function') {
        try {
            const standings = await calculateStandingsUpToRound(38);
            if (standings && standings.length > 0) {
                sortedTeams = standings.map(function(s) {
                    return s.key || s.team;
                }).filter(function(t) { return t && t.length > 0; });
            }
        } catch (e) {}
    }

    if (sortedTeams.length === 0 && typeof teamsMap !== 'undefined') {
        sortedTeams = Object.keys(teamsMap);
    }

    if (sortedTeams.length === 0) return null;

    if (sortedTeams.length < 20 && typeof teamsMap !== 'undefined') {
        Object.keys(teamsMap).forEach(function(t) {
            if (sortedTeams.indexOf(t) === -1) sortedTeams.push(t);
        });
    }

    const pots = [[], [], [], [], []];
    sortedTeams.slice(0, 20).forEach(function(team, idx) {
        const potIdx = Math.floor(idx / CHAMP_POT_SIZE);
        if (potIdx < 5) pots[potIdx].push(team);
    });

    return pots;
}
window.buildPots = buildPots;

function champGenerateRandomDraw(pots) {
    const groups = { A: [], B: [], C: [], D: [] };
    const drawRows = [];

    pots.forEach(function(potTeams, potIdx) {
        const shuffledTeams = champShuffle(potTeams);
        const shuffledGroups = champShuffle(CHAMP_GROUPS.slice());

        for (let i = 0; i < shuffledTeams.length; i++) {
            const team = shuffledTeams[i];
            const groupLetter = shuffledGroups[i];
            groups[groupLetter].push(team);

            drawRows.push({
                pot_number: potIdx + 1,
                group_name: groupLetter,
                team: team,
                position: groups[groupLetter].length,
                slot_index: i
            });
        }
    });

    return drawRows;
}
window.champGenerateRandomDraw = champGenerateRandomDraw;

/* =========================================================
   Round Robin
========================================================= */

function buildRoundRobin(groups) {
    const matches = [];

    CHAMP_GROUPS.forEach(function(gName) {
        const teams = (groups[gName] || []).map(function(r) { return r.team; });
        if (teams.length < 5) return;

        const list = teams.slice();
        if (list.length % 2 !== 0) list.push('__BYE__');

        const total = list.length;
        const roundsCount = total - 1;
        const halfSize = total / 2;
        const rotating = list.slice(1);
        const fixed = list[0];

        for (let r = 0; r < roundsCount; r++) {
            const roundMatches = [];
            const opp = rotating[rotating.length - 1];

            if (fixed !== '__BYE__' && opp !== '__BYE__') {
                roundMatches.push(r % 2 === 0
                    ? { home: fixed, away: opp }
                    : { home: opp, away: fixed });
            }

            for (let i = 0; i < halfSize - 1; i++) {
                const t1 = rotating[i];
                const t2 = rotating[rotating.length - 2 - i];
                if (t1 === '__BYE__' || t2 === '__BYE__') continue;
                roundMatches.push(r % 2 === 0
                    ? { home: t1, away: t2 }
                    : { home: t2, away: t1 });
            }

            rotating.unshift(rotating.pop());

            roundMatches.forEach(function(m) {
                matches.push({
                    stage: 'groups', group_name: gName, round_num: r + 1,
                    gw: null, home_team: m.home, away_team: m.away,
                    home_score: null, away_score: null,
                    winner: null, is_played: false
                });
            });
        }
    });

    return matches;
}
window.buildRoundRobin = buildRoundRobin;

/* =========================================================
   Sync Results
========================================================= */

async function syncGroupResults() {
    const matches = champData.matches.filter(function(m) {
        return m.stage === 'groups' && !m.is_played;
    });
    if (matches.length === 0) return 0;

    const meta = champData.meta || {};
    const startGw = meta.start_gw || 6;

    const gwsNeeded = {};
    matches.forEach(function(m) {
        gwsNeeded[startGw + (m.round_num - 1)] = true;
    });

    const scoresByGw = {};
    for (const gw of Object.keys(gwsNeeded)) {
        scoresByGw[gw] = await fetchTeamScoresForRound(parseInt(gw, 10));
    }

    let updated = 0;
    for (const m of matches) {
        const gw = startGw + (m.round_num - 1);
        const scores = scoresByGw[gw] || {};
        const hs = scores[m.home_team];
        const as = scores[m.away_team];
        if (hs === undefined || as === undefined) continue;

        let winner = 'draw';
        if (hs > as) winner = m.home_team;
        else if (as > hs) winner = m.away_team;

        const ok = await updateChampionsMatch(m.id, {
            gw: gw, home_score: hs, away_score: as,
            winner: winner, is_played: true
        });
        if (ok) {
            m.gw = gw; m.home_score = hs; m.away_score = as;
            m.winner = winner; m.is_played = true;
            updated++;
        }
    }
    return updated;
}

async function syncKnockoutResults() {
    const knockoutMatches = champData.matches.filter(function(m) {
        return m.stage !== 'groups' && !m.is_played;
    });
    if (knockoutMatches.length === 0) return 0;

    const gwsNeeded = {};
    knockoutMatches.forEach(function(m) {
        if (m.gw) gwsNeeded[m.gw] = true;
    });

    const scoresByGw = {};
    for (const gw of Object.keys(gwsNeeded)) {
        scoresByGw[gw] = await fetchTeamScoresForRound(parseInt(gw, 10));
    }

    const rankMap = {};
    if (typeof calculateStandingsUpToRound === 'function') {
        try {
            const standings = await calculateStandingsUpToRound(38);
            standings.forEach(function(s, idx) {
                if (s.key) rankMap[s.key] = idx;
            });
        } catch (e) {}
    }

    let updated = 0;
    for (const m of knockoutMatches) {
        const scores = scoresByGw[m.gw] || {};
        const hs = scores[m.home_team];
        const as = scores[m.away_team];
        if (hs === undefined || as === undefined) continue;

        let winner;
        if (hs > as) winner = m.home_team;
        else if (as > hs) winner = m.away_team;
        else {
            const hRank = rankMap[m.home_team] !== undefined ? rankMap[m.home_team] : 999;
            const aRank = rankMap[m.away_team] !== undefined ? rankMap[m.away_team] : 999;
            winner = hRank <= aRank ? m.home_team : m.away_team;
        }

        const ok = await updateChampionsMatch(m.id, {
            home_score: hs, away_score: as,
            winner: winner, is_played: true
        });
        if (ok) {
            m.home_score = hs; m.away_score = as;
            m.winner = winner; m.is_played = true;
            updated++;
        }
    }

    await checkAndBuildNextRound();
    return updated;
}

async function checkAndBuildNextRound() {
    const matches = champData.matches;
    const stages = ['qf', 'sf', 'final'];

    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageMatches = matches.filter(function(m) { return m.stage === stage; });
        if (stageMatches.length === 0) continue;

        const allPlayed = stageMatches.every(function(m) { return m.is_played; });
        if (!allPlayed) continue;

        const nextStage = stages[i + 1];
        if (!nextStage) {
            const finalMatch = stageMatches[0];
            if (finalMatch && finalMatch.winner) {
                await saveChampionsMeta({
                    current_stage: 'done',
                    champion: finalMatch.winner
                });
            }
            continue;
        }

        const nextMatches = matches.filter(function(m) { return m.stage === nextStage; });
        if (nextMatches.length > 0) continue;

        const winners = stageMatches.map(function(m) { return m.winner; });
        const gw = (stageMatches[0].gw || 0) + 1;
        const newMatches = [];

        if (nextStage === 'sf' && winners.length >= 4) {
            newMatches.push({
                stage: 'sf', group_name: null, round_num: 1, gw: gw,
                home_team: winners[0], away_team: winners[1],
                home_score: null, away_score: null,
                winner: null, is_played: false
            });
            newMatches.push({
                stage: 'sf', group_name: null, round_num: 2, gw: gw,
                home_team: winners[2], away_team: winners[3],
                home_score: null, away_score: null,
                winner: null, is_played: false
            });
        } else if (nextStage === 'final' && winners.length >= 2) {
            newMatches.push({
                stage: 'final', group_name: null, round_num: 1, gw: gw,
                home_team: winners[0], away_team: winners[1],
                home_score: null, away_score: null,
                winner: null, is_played: false
            });
        }

        if (newMatches.length > 0) {
            await window.sbClient.from('champions_matches').insert(newMatches);
            await saveChampionsMeta({
                current_stage: nextStage,
                current_round: 1
            });
        }
    }
}

/* =========================================================
   Compute Standings
========================================================= */

function computeGroupStandings(draw, matches, groupName) {
    const teams = draw.filter(function(r) { return r.group_name === groupName; });
    const table = {};
    teams.forEach(function(t) {
        table[t.team] = {
            team: t.team, played: 0, won: 0, drawn: 0, lost: 0,
            gf: 0, ga: 0, gd: 0, points: 0
        };
    });

    const gMatches = matches.filter(function(m) {
        return m.stage === 'groups' && m.group_name === groupName && m.is_played;
    });

    gMatches.forEach(function(m) {
        const h = table[m.home_team];
        const a = table[m.away_team];
        if (!h || !a) return;

        h.played++; a.played++;
        h.gf += m.home_score; h.ga += m.away_score;
        a.gf += m.away_score; a.ga += m.home_score;

        if (m.home_score > m.away_score) {
            h.won++; a.lost++; h.points += 3;
        } else if (m.away_score > m.home_score) {
            a.won++; h.lost++; a.points += 3;
        } else {
            h.drawn++; a.drawn++;
            h.points += 1; a.points += 1;
        }
    });

    Object.values(table).forEach(function(t) { t.gd = t.gf - t.ga; });

    return Object.values(table).sort(function(x, y) {
        if (y.points !== x.points) return y.points - x.points;
        if (y.gd !== x.gd) return y.gd - x.gd;
        if (y.gf !== x.gf) return y.gf - x.gf;
        return x.team.localeCompare(y.team);
    });
}

async function buildKnockoutStage(startGw) {
    const qualified = [];
    CHAMP_GROUPS.forEach(function(g) {
        const standings = computeGroupStandings(champData.draw, champData.matches, g);
        if (standings.length >= 2) {
            qualified.push({
                group: g,
                first: standings[0].team,
                second: standings[1].team
            });
        }
    });

    if (qualified.length < 4) return false;

    const qfPairs = [
        { home: qualified[0].first, away: qualified[1].second },
        { home: qualified[1].first, away: qualified[0].second },
        { home: qualified[2].first, away: qualified[3].second },
        { home: qualified[3].first, away: qualified[2].second }
    ];

    const qfMatches = qfPairs.map(function(p, idx) {
        return {
            stage: 'qf', group_name: null, round_num: idx + 1, gw: startGw,
            home_team: p.home, away_team: p.away,
            home_score: null, away_score: null,
            winner: null, is_played: false
        };
    });

    await window.sbClient.from('champions_matches').insert(qfMatches);
    await saveChampionsMeta({ current_stage: 'qf', current_round: 1 });
    return true;
}

/* =========================================================
   Tabs — 2 only (no settings button)
========================================================= */

function champSwitchView(view) {
    champCurrentView = view;

    document.querySelectorAll('.champ-view-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.querySelectorAll('.champ-view-panel').forEach(function(panel) {
        panel.style.display = (panel.dataset.panel === view) ? 'block' : 'none';
    });
}
window.champSwitchView = champSwitchView;

/* =========================================================
   Render Main
========================================================= */

function renderChampionsMain() {
    const container = document.getElementById('championsContent');
    if (!container) return;

    const meta = champData.meta || {};
    const draw = champData.draw || [];
    const matches = champData.matches || [];
    const isAdmin = isChampAdmin();

    let html = '';

    /* ⭐ للأدمن فقط */
    if (isAdmin) {
        /* Status Line */
        if (meta.started) {
            let stageText = '';
            if (meta.current_stage === 'groups') stageText = 'Group Stage';
            else if (meta.current_stage === 'qf') stageText = 'Quarter Finals';
            else if (meta.current_stage === 'sf') stageText = 'Semi Finals';
            else if (meta.current_stage === 'final') stageText = 'Final';
            else if (meta.current_stage === 'done') stageText = 'Finished';

            html += '<div class="champions-status-text">';
            html += xIcon('trophy', 'fill') + ' ' + stageText + ' - GW<strong>' + meta.start_gw + '</strong>';
            html += '</div>';
        }

        /* Admin Actions */
        if (!meta.started || draw.length === 0) {
            html += '<div class="champ-admin-actions">';

            if (draw.length === 0) {
                html += '<button class="champ-admin-btn champ-admin-start" onclick="champPerformDraw()">';
                html += xIcon('shuffle', 'bold') + ' <span>ابدأ القرعة</span>';
                html += '</button>';
            } else {
                html += '<button class="champ-admin-btn champ-admin-reset" onclick="champRequestReset()">';
                html += xIcon('arrows-clockwise', 'bold') + ' <span>إعادة القرعة</span>';
                html += '</button>';
            }

            html += '</div>';
        }
    }

    /* ⭐ إذا ما فيه قرعة */
    if (draw.length === 0) {
        if (isAdmin) {
            html += '<div class="champions-empty">';
            html += xIcon('trophy', 'duotone');
            html += '<div>لا توجد قرعة — اضغط "ابدأ القرعة"</div>';
            html += '</div>';
        } else {
            html += '<div class="champions-empty">';
            html += xIcon('hourglass', 'duotone');
            html += '<div>القرعة لم تُسحب بعد</div>';
            html += '</div>';
        }

        container.innerHTML = html;
        attachChampHiddenBtns();
        return;
    }

    /* ⭐ 2 Tabs */
    if (draw.length > 0) {
        html += '<div class="champ-view-tabs">';

        html += '<button class="champ-view-btn ' + (champCurrentView === 'matches' ? 'active' : '') + '" ';
        html += 'data-view="matches" onclick="champSwitchView(\'matches\')">';
        html += xIcon('soccer-ball', 'bold') + ' <span>المواجهات</span>';
        html += '</button>';

        html += '<button class="champ-view-btn ' + (champCurrentView === 'standings' ? 'active' : '') + '" ';
        html += 'data-view="standings" onclick="champSwitchView(\'standings\')">';
        html += xIcon('chart-bar', 'bold') + ' <span>الترتيب</span>';
        html += '</button>';

        html += '</div>';

        /* Panel: Matches */
        if (meta.current_stage === 'groups' || !meta.started) {
            html += '<div class="champ-view-panel" data-panel="matches" style="display:' + (champCurrentView === 'matches' ? 'block' : 'none') + ';">';
            html += renderGroupsMatches(matches, meta);
            html += '</div>';
        } else {
            html += '<div class="champ-view-panel" data-panel="matches" style="display:' + (champCurrentView === 'matches' ? 'block' : 'none') + ';">';
            html += renderKnockoutBracket(matches, meta);
            html += '</div>';
        }

        /* Panel: Standings */
        html += '<div class="champ-view-panel" data-panel="standings" style="display:' + (champCurrentView === 'standings' ? 'block' : 'none') + ';">';
        html += renderGroupsSection(draw, matches, meta);
        html += '</div>';
    }

    /* ⭐ للأدمن — زر Sync في الأسفل */
    if (isAdmin && meta.started) {
        html += '<div class="champ-admin-footer">';
        html += '<button class="champ-admin-btn-small" onclick="champSyncNow()">';
        html += xIcon('arrows-clockwise', 'bold') + ' <span>تحديث النتائج</span>';
        html += '</button>';
        html += '</div>';
    }

    container.innerHTML = html;
    attachChampHiddenBtns();
}

/* =========================================================
   Render Groups Section
========================================================= */

function renderGroupsSection(draw, matches, meta) {
    let html = '<div class="champions-groups-section">';
    html += '<div class="champions-section-title">' + xIcon('squares-four', 'bold') + ' <span>Groups</span></div>';
    html += '<div class="champions-groups-grid">';

    CHAMP_GROUPS.forEach(function(gName) {
        const standings = computeGroupStandings(draw, matches, gName);

        html += '<div class="champions-group-card">';
        html += '<div class="champions-group-card-header">' + xIcon('shield-star', 'fill') + ' GROUP ' + gName + '</div>';
        html += '<table class="champions-group-table">';
        html += '<thead><tr>';
        html += '<th>#</th><th style="text-align:right;">Team</th>';
        html += '<th>P</th><th>W</th><th>D</th><th>L</th>';
        html += '<th>GD</th><th>Pts</th>';
        html += '</tr></thead><tbody>';

        standings.forEach(function(t, idx) {
            const logoFile = champGetTeamLogo(t.team);
            const teamName = champGetTeamName(t.team);
            const isQualified = idx < 2 && meta.current_stage !== 'groups';

            html += '<tr class="' + (isQualified ? 'qualified' : '') + '">';
            html += '<td>' + (idx + 1) + '</td>';
            html += '<td><div class="team-cell-mini">';
            if (logoFile) {
                html += '<img src="./' + logoFile + '" onerror="this.style.display=\'none\'">';
            }
            html += '<span>' + teamName + '</span>';
            html += '</div></td>';
            html += '<td>' + t.played + '</td>';
            html += '<td>' + t.won + '</td>';
            html += '<td>' + t.drawn + '</td>';
            html += '<td>' + t.lost + '</td>';
            html += '<td>' + (t.gd > 0 ? '+' + t.gd : t.gd) + '</td>';
            html += '<td><strong>' + t.points + '</strong></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    });

    html += '</div></div>';
    return html;
}

/* =========================================================
   Render Matches
========================================================= */

function renderGroupsMatches(matches, meta) {
    const groupMatches = matches.filter(function(m) { return m.stage === 'groups'; });
    if (groupMatches.length === 0) return '';

    let html = '<div class="champions-round-section">';
    html += '<div class="champions-section-title">' + xIcon('soccer-ball', 'bold') + ' <span>Group Matches</span></div>';

    for (let r = 1; r <= 4; r++) {
        const roundMatches = groupMatches.filter(function(m) { return m.round_num === r; });
        if (roundMatches.length === 0) continue;

        html += '<div class="champ-round-label">Round ' + r + '</div>';
        roundMatches.forEach(function(m) { html += renderMatchRow(m); });
    }

    html += '</div>';
    return html;
}

/* =========================================================
   Render Knockout
========================================================= */

function renderKnockoutBracket(matches, meta) {
    const qfMatches = matches.filter(function(m) { return m.stage === 'qf'; });
    const sfMatches = matches.filter(function(m) { return m.stage === 'sf'; });
    const finalMatches = matches.filter(function(m) { return m.stage === 'final'; });

    let html = '<div class="champions-round-section">';
    html += '<div class="champions-section-title">' + xIcon('trophy', 'fill') + ' <span>Knockout Stage</span></div>';
    html += '<div class="champions-bracket">';

    if (qfMatches.length > 0) {
        html += '<div class="champions-bracket-round">';
        html += '<div class="champions-bracket-round-label">Quarter Finals</div>';
        qfMatches.forEach(function(m) { html += renderBracketMatch(m); });
        html += '</div>';
    }

    if (sfMatches.length > 0) {
        html += '<div class="champions-bracket-round">';
        html += '<div class="champions-bracket-round-label">Semi Finals</div>';
        sfMatches.forEach(function(m) { html += renderBracketMatch(m); });
        html += '</div>';
    }

    if (finalMatches.length > 0) {
        html += '<div class="champions-bracket-round">';
        html += '<div class="champions-bracket-round-label">Final</div>';
        finalMatches.forEach(function(m) { html += renderBracketMatch(m); });
        html += '</div>';
    }

    html += '</div>';

    if (meta.champion) {
        const logoFile = champGetTeamLogo(meta.champion);
        const champName = champGetTeamName(meta.champion);
        html += '<div class="champ-champion-card">';
        html += '<div class="champ-champion-label">' + xIcon('crown', 'fill') + ' CHAMPION</div>';
        if (logoFile) {
            html += '<img src="./' + logoFile + '" class="champ-champion-logo" onerror="this.style.display=\'none\'">';
        }
        html += '<div class="champ-champion-name">' + champName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function renderBracketMatch(m) {
    const homeLogo = champGetTeamLogo(m.home_team);
    const awayLogo = champGetTeamLogo(m.away_team);
    const homeName = champGetTeamName(m.home_team);
    const awayName = champGetTeamName(m.away_team);
    const homeWin = m.winner === m.home_team;
    const awayWin = m.winner === m.away_team;

    return '<div class="champions-bracket-match">' +
        '<div class="champions-bracket-team' + (homeWin ? ' winner' : '') + '">' +
            (homeLogo ? '<img src="./' + homeLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span class="champions-bracket-team-name">' + homeName + '</span>' +
            '<span class="champions-bracket-score">' + (m.is_played ? m.home_score : '-') + '</span>' +
        '</div>' +
        '<div class="champions-bracket-team' + (awayWin ? ' winner' : '') + '">' +
            (awayLogo ? '<img src="./' + awayLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span class="champions-bracket-team-name">' + awayName + '</span>' +
            '<span class="champions-bracket-score">' + (m.is_played ? m.away_score : '-') + '</span>' +
        '</div>' +
    '</div>';
}

function renderMatchRow(m) {
    const homeLogo = champGetTeamLogo(m.home_team);
    const awayLogo = champGetTeamLogo(m.away_team);
    const homeName = champGetTeamName(m.home_team);
    const awayName = champGetTeamName(m.away_team);

    let scoreHtml = '';
    if (m.is_played && m.home_score !== null && m.away_score !== null) {
        scoreHtml = m.home_score + ' - ' + m.away_score;
    } else {
        scoreHtml = '<span class="pending">VS</span>';
    }

    return '<div class="champions-match-row">' +
        '<div class="champions-match-team home">' +
            '<span>' + homeName + '</span>' +
            (homeLogo ? '<img src="./' + homeLogo + '" onerror="this.style.display=\'none\'">' : '') +
        '</div>' +
        '<div class="champions-match-score' + (!m.is_played ? ' pending' : '') + '">' + scoreHtml + '</div>' +
        '<div class="champions-match-team away">' +
            (awayLogo ? '<img src="./' + awayLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + awayName + '</span>' +
        '</div>' +
    '</div>';
}

/* =========================================================
   Start Tournament (Admin)
========================================================= */

async function champStartTournament() {
    if (!isChampAdmin()) return;

    if (typeof currentRound === 'undefined') {
        if (typeof showToast === 'function') showToast('currentRound not available', false);
        return;
    }

    const startGw = (currentRound || 1) + 1;

    const ok = await saveChampionsMeta({
        started: true,
        start_gw: startGw,
        current_stage: 'groups',
        current_round: 1
    });

    if (ok) {
        if (typeof showToast === 'function') showToast('Tournament started from GW' + startGw, true, 3000);
        champLoaded = false;
        loadChampions();
    }
}
window.champStartTournament = champStartTournament;

/* =========================================================
   🔐 Hidden Admin Button — على "Aqeel Al Rowai"
========================================================= */

function attachChampHiddenBtns() {
    const btns = [
        document.getElementById('hiddenEditBtn'),
        document.getElementById('hiddenEditBtn2')
    ];

    btns.forEach(function(btn) {
        if (!btn) return;
        if (btn.dataset.champAdminAttached === '1') return;
        btn.dataset.champAdminAttached = '1';

        let pressTimer = null;
        const DURATION = 5000;

        const startPress = function() {
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = setTimeout(function() {
                champPromptAdmin();
            }, DURATION);
        };

        const cancelPress = function() {
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = null;
        };

        btn.addEventListener('touchstart', startPress, { passive: true });
        btn.addEventListener('touchend', cancelPress);
        btn.addEventListener('touchcancel', cancelPress);
        btn.addEventListener('mousedown', startPress);
        btn.addEventListener('mouseup', cancelPress);
        btn.addEventListener('mouseleave', cancelPress);
        btn.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    });
}

function champPromptAdmin() {
    const pin = prompt('أدخل الرمز:');
    if (pin === null) return;

    if (pin !== CHAMP_PIN) {
        if (typeof showToast === 'function') showToast('الرمز خطأ', false, 2500);
        return;
    }

    const confirmMsg = isChampAdmin()
        ? 'هل تريد الخروج من وضع الأدمن؟'
        : 'هل تريد الدخول كأدمن؟';

    const yes = confirm(confirmMsg);

    if (yes) {
        if (isChampAdmin()) {
            clearChampAdmin();
            if (typeof showToast === 'function') showToast('تم الخروج من وضع الأدمن', true, 2500);
        } else {
            setChampAdmin();
            if (typeof showToast === 'function') showToast('مرحباً بك كأدمن ✅', true, 2500);
        }

        champLoaded = false;
        loadChampions();
    }
}
window.champPromptAdmin = champPromptAdmin;

/* =========================================================
   Admin Sync
========================================================= */

async function champSyncNow() {
    if (!isChampAdmin()) return;

    if (typeof showToast === 'function') showToast('جاري التحديث...', false);

    const meta = champData.meta || {};
    let updated = 0;

    if (meta.current_stage === 'groups') updated = await syncGroupResults();
    else updated = await syncKnockoutResults();

    if (updated > 0) {
        if (typeof showToast === 'function') showToast('تم تحديث ' + updated + ' مباراة', true, 2500);
    } else {
        if (typeof showToast === 'function') showToast('لا نتائج جديدة', false, 2500);
    }

    champLoaded = false;
    loadChampions();
}
window.champSyncNow = champSyncNow;

async function champStartKnockout() {
    if (!isChampAdmin()) return;

    const meta = champData.meta || {};
    if (!meta.started) { alert('Tournament not started'); return; }
    if (meta.current_stage !== 'groups') { alert('Knockout already started'); return; }

    const groupMatches = champData.matches.filter(function(m) { return m.stage === 'groups'; });
    const allPlayed = groupMatches.every(function(m) { return m.is_played; });
    if (!allPlayed) { alert('Group matches still pending'); return; }
    if (!confirm('Start Knockout from next round?')) return;

    const startGw = (currentRound || 1) + 1;
    const ok = await buildKnockoutStage(startGw);

    if (ok) {
        if (typeof showToast === 'function') showToast('بدأ الإقصائيات من GW' + startGw, true, 3000);
        champLoaded = false;
        loadChampions();
    }
}
window.champStartKnockout = champStartKnockout;

function champRequestReset() {
    if (!isChampAdmin()) return;
    if (!confirm('هل أنت متأكد؟ سيتم حذف القرعة والمباريات والبدء من جديد.')) return;

    resetChampions().then(function(ok) {
        if (ok) {
            if (typeof showToast === 'function') showToast('تم حذف القرعة', true, 2500);
            champData = { meta: null, draw: [], matches: [], pendingDraw: null };
            champLoaded = false;
            loadChampions();
        } else {
            if (typeof showToast === 'function') showToast('فشل', false);
        }
    });
}
window.champRequestReset = champRequestReset;

/* =========================================================
   Save Draw (يستخدم من draw.js)
========================================================= */

async function champSaveDraw(drawRows) {
    await saveChampionsDraw(drawRows);
    champData.draw = drawRows;

    const groups = { A: [], B: [], C: [], D: [] };
    drawRows.forEach(function(r) { groups[r.group_name].push(r); });

    const matches = buildRoundRobin(groups);
    await saveChampionsMatches(matches);
    champData.matches = matches;
}
window.champSaveDraw = champSaveDraw;

/* =========================================================
   Load
========================================================= */

async function loadChampions() {
    const container = document.getElementById('championsContent');
    if (!container) return;

    if (!window.sbClient) {
        container.innerHTML = '<div class="champions-empty">' + xIcon('warning-circle', 'duotone') + '<div>Supabase not available</div></div>';
        return;
    }

    if (champLoaded) { renderChampionsMain(); return; }

    container.innerHTML = '<div class="champions-empty">' + xIcon('hourglass', 'duotone') + '<div>Loading Champions Cup...</div></div>';

    try {
        const [meta, draw, matches] = await Promise.all([
            loadChampionsMeta(),
            loadChampionsDraw(),
            loadChampionsMatches()
        ]);

        champData.meta = meta || { started: false };
        champData.draw = draw;
        champData.matches = matches;
        champLoaded = true;

        renderChampionsMain();
    } catch (e) {
        console.error('[Champions] load error:', e);
        container.innerHTML = '<div class="champions-empty">' + xIcon('warning-circle', 'duotone') + '<div>Load failed</div></div>';
    }
}
window.loadChampions = loadChampions;

window.championsReload = function() {
    champLoaded = false;
    loadChampions();
};

/* =========================================================
   Window Exports
========================================================= */

window.champGoToTab = champGoToTab;
window.champSwitchView = champSwitchView;
window.champShowAdminMenu = champPromptAdmin;
window.champStartKnockout = champStartKnockout;
window.champRequestReset = champRequestReset;
window.champSyncNow = champSyncNow;
window.champStartTournament = champStartTournament;

console.log('[Champions] v=12 loaded ✅');
