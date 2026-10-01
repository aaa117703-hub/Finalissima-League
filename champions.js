/* =========================================================
   champions.js — FINALISSIMA LEAGUE CHAT (v=9)
   ========================================================= */

const CHAMP_PIN = '024680';
const CHAMP_GROUPS = ['A', 'B', 'C', 'D'];
const CHAMP_POT_SIZE = 4;
const CHAMP_GROUP_SIZE = 5;

let champData = { meta: null, draw: [], matches: [], pendingDraw: null };
let champLoaded = false;
let champDrawAnimating = false;

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

function champGetTeamLogo(code) {
    if (typeof teamsMap !== 'undefined' && teamsMap[code]) {
        return teamsMap[code].logo || '';
    }
    return '';
}

function champWait(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
}

function champShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
}

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

async function saveChampionsMeta(updates) {
    if (!window.sbClient) return false;
    try {
        const payload = Object.assign({ id: 1, updated_at: new Date().toISOString() }, updates);
        const { error } = await window.sbClient
            .from('champions_meta').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}

async function saveChampionsDraw(rows) {
    if (!window.sbClient) return false;
    try {
        await window.sbClient.from('champions_draw').delete().neq('id', 0);
        const { error } = await window.sbClient.from('champions_draw').insert(rows);
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}

async function saveChampionsMatches(rows) {
    if (!window.sbClient) return false;
    try {
        await window.sbClient.from('champions_matches').delete().neq('id', 0);
        const { error } = await window.sbClient.from('champions_matches').insert(rows);
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}

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
    } catch (e) { return {}; }
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
   Render Main
========================================================= */

function renderChampionsMain() {
    const container = document.getElementById('championsContent');
    if (!container) return;

    const meta = champData.meta || {};
    const draw = champData.draw || [];
    const matches = champData.matches || [];

    let html = '';

    if (!meta.started) {
        if (draw.length === 0) {
            html += '<div class="champions-start-area">';
            html += '<button class="champions-start-btn" onclick="champPerformDraw()">';
            html += xIcon('shuffle', 'bold') + ' <span>Start Draw</span>';
            html += '</button>';
            html += '<div class="champions-status-text">Press to start the draw</div>';
            html += '</div>';
        } else {
            html += '<div class="champions-start-area">';
            html += '<button class="champions-start-btn" onclick="champStartTournament()">';
            html += xIcon('play-circle', 'fill') + ' <span>Start Tournament</span>';
            html += '</button>';
            html += '<div class="champions-status-text">Starts from the <strong>next round</strong></div>';
            html += '</div>';
        }
    } else {
        let stageText = '';
        if (meta.current_stage === 'groups') stageText = 'Group Stage';
        else if (meta.current_stage === 'qf') stageText = 'Quarter Finals';
        else if (meta.current_stage === 'sf') stageText = 'Semi Finals';
        else if (meta.current_stage === 'final') stageText = 'Final';
        else if (meta.current_stage === 'done') stageText = 'Finished';

        html += '<div class="champions-start-area">';
        html += '<div class="champions-status-text">';
        html += xIcon('trophy', 'fill') + ' ' + stageText + ' - GW<strong>' + meta.start_gw + '</strong>';
        html += '</div></div>';
    }

    if (draw.length > 0) {
        html += renderGroupsSection(draw, matches, meta);
        if (meta.started) {
            if (meta.current_stage === 'groups') {
                html += renderGroupsMatches(matches, meta);
            } else {
                html += renderKnockoutBracket(matches, meta);
            }
        }
    } else {
        html += '<div class="champions-empty">';
        html += xIcon('trophy', 'duotone');
        html += '<div>Ready to Start</div>';
        html += '</div>';
    }

    container.innerHTML = html;
    attachChampHiddenBtns();
}

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

function renderGroupsMatches(matches, meta) {
    const groupMatches = matches.filter(function(m) { return m.stage === 'groups'; });
    if (groupMatches.length === 0) return '';

    const startGw = meta.start_gw || 6;

    let html = '<div class="champions-round-section">';
    html += '<div class="champions-section-title">' + xIcon('soccer-ball', 'bold') + ' <span>Group Matches</span></div>';

    for (let r = 1; r <= 4; r++) {
        const roundMatches = groupMatches.filter(function(m) { return m.round_num === r; });
        if (roundMatches.length === 0) continue;

        const gw = startGw + (r - 1);
        html += '<div class="champ-round-label">Round ' + r + ' <span class="champ-gw">GW' + gw + '</span></div>';
        roundMatches.forEach(function(m) { html += renderMatchRow(m); });
    }

    html += '</div>';
    return html;
}

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
   🎬 CINEMATIC DRAW
========================================================= */

async function champPerformDraw() {
    if (champDrawAnimating) return;
    champDrawAnimating = true;

    if (typeof gsap === 'undefined') {
        champDrawAnimating = false;
        if (typeof showToast === 'function') showToast('GSAP not loaded', false);
        return;
    }

    const pots = await buildPots();
    if (!pots) {
        champDrawAnimating = false;
        if (typeof showToast === 'function') showToast('Failed to build pots', false);
        return;
    }

    const drawRows = champGenerateRandomDraw(pots);
    champData.pendingDraw = drawRows;

    champBuildDrawScreen();

    await champRunCinematicDraw(drawRows, pots);

    champDrawAnimating = false;
}

function champBuildDrawScreen() {
    const old = document.getElementById('champDrawScreen');
    if (old) old.remove();

    const screen = document.createElement('div');
    screen.className = 'champions-draw-screen';
    screen.id = 'champDrawScreen';

    let html = '';

    /* Title */
    html += '<div class="champ-draw-header" id="champDrawHeader">';
    html += '<div class="champ-draw-title" id="champDrawTitle">قرعة كأس أبطال الفيناليغ</div>';
    html += '</div>';

    /* Banner + Cards Stage */
    html += '<div class="champ-banner-stage" id="champBannerStage">';

    /* Original Banner */
    html += '<div class="champ-banner-original" id="champBannerOriginal">';
    html += '<img src="./banner-fina.png" alt="Champions Cup">';
    html += '</div>';

    /* Cards (4 pieces from banner) */
    html += '<div class="champ-cards-stage" id="champCardsStage" style="display:none;">';
    for (let i = 0; i < 4; i++) {
        const bgPos = (i * 33.33) + '% 0%';

        html += '<div class="champ-card" id="champCard' + i + '" data-index="' + i + '">';
        html += '<div class="champ-card-inner">';

        /* FRONT: piece of banner */
        html += '<div class="champ-card-front" ';
        html += 'style="background-image:url(./banner-fina.png);';
        html += 'background-size:400% 100%;';
        html += 'background-position:' + bgPos + ';';
        html += 'background-repeat:no-repeat;"></div>';

        /* BACK: team logo + name */
        html += '<div class="champ-card-back">';
        html += '<div class="champ-card-back-team" id="champCardTeam' + i + '"></div>';
        html += '</div>';

        html += '</div></div>';
    }
    html += '</div>';

    /* Groups */
    html += '<div class="champ-groups-stage" id="champGroupsStage">';
    CHAMP_GROUPS.forEach(function(g) {
        html += '<div class="champ-group-target" id="champGroupTarget' + g + '" data-group="' + g + '">';
        html += '<div class="champ-group-target-label">' + g + '</div>';
        html += '<div class="champ-group-target-teams" id="champGroupTeams' + g + '"></div>';
        html += '</div>';
    });
    html += '</div>';

    html += '</div>';

    screen.innerHTML = html;
    document.body.appendChild(screen);
}
/* =========================================================
   🎬 Cinematic Draw Sequence
========================================================= */

async function champRunCinematicDraw(drawRows, pots) {
    const banner = document.getElementById('champBannerOriginal');
    const cardsStage = document.getElementById('champCardsStage');
    const cardInners = document.querySelectorAll('.champ-card-inner');
    const cards = document.querySelectorAll('.champ-card');
    const header = document.getElementById('champDrawHeader');

    /* ⭐ المشهد 1: العنوان + البنر */
    gsap.set(header, { opacity: 0, y: -30 });
    gsap.set(banner, { opacity: 0, scale: 0.85 });

    await new Promise(function(resolve) {
        gsap.timeline({ onComplete: resolve })
            .to(header, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' })
            .to(banner, { opacity: 1, scale: 1, duration: 1.4, ease: 'power3.out' }, '-=0.8');
    });

    await champWait(1200);

    /* ⭐ المشهد 2: الانقسام */
    await new Promise(function(resolve) {
        gsap.to(banner, {
            opacity: 0,
            duration: 0.4,
            onComplete: function() {
                banner.style.display = 'none';
                cardsStage.style.display = 'flex';
                resolve();
            }
        });
    });

    gsap.set(cards, { opacity: 0, scale: 0.9 });

    await new Promise(function(resolve) {
        gsap.to(cards, {
            opacity: 1,
            scale: 1,
            duration: 0.9,
            stagger: 0.12,
            ease: 'back.out(1.4)',
            onComplete: resolve
        });
    });

    await champWait(800);

    /* ⭐ المشهد 3: قلب البطاقات */
    await new Promise(function(resolve) {
        gsap.to(cardInners, {
            rotationY: 180,
            duration: 1.2,
            stagger: 0.15,
            ease: 'power2.inOut',
            onComplete: resolve
        });
    });

    await champWait(600);

    /* ⭐ المشهد 4: كل Pot */
    const potGroups = {};
    drawRows.forEach(function(row) {
        if (!potGroups[row.pot_number]) potGroups[row.pot_number] = [];
        potGroups[row.pot_number].push(row);
    });

    for (let potNum = 1; potNum <= 5; potNum++) {
        const potRows = potGroups[potNum] || [];
        if (potRows.length === 0) continue;

        potRows.sort(function(a, b) { return a.slot_index - b.slot_index; });

        await champShowPotTeams(potNum, potRows);

        for (let i = 0; i < potRows.length; i++) {
            await champDistributeTeam(potRows[i], i);
        }

        /* استنى قبل Pot الجديد */
        if (potNum < 5) {
            await champResetCardsForNextPot();
        }

        await champWait(400);
    }

    /* ⭐ المشهد 5: النهاية */
    await champFinale();
}

/* =========================================================
   Show Pot Teams
========================================================= */

async function champShowPotTeams(potNum, potRows) {
    const titleEl = document.getElementById('champDrawTitle');
    if (titleEl) {
        titleEl.textContent = 'POT ' + potNum;
        gsap.fromTo(titleEl,
            { opacity: 0.5, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }
        );
    }

    const cardInners = document.querySelectorAll('.champ-card-inner');
    const cards = document.querySelectorAll('.champ-card');

    /* تأكد البطاقات مقلوبة للظهر */
    gsap.set(cardInners, { rotationY: 180 });

    for (let i = 0; i < 4; i++) {
        const card = cards[i];
        const teamSlot = document.getElementById('champCardTeam' + i);
        if (!card || !teamSlot) continue;

        const row = potRows[i];
        if (!row) continue;

        const teamName = champGetTeamName(row.team);
        const teamLogo = champGetTeamLogo(row.team);

        teamSlot.innerHTML =
            (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + teamName + '</span>';

        card.dataset.team = row.team;
        card.dataset.group = row.group_name;
    }

    await champWait(900);
}

/* =========================================================
   Distribute One Team — UEFA Trail Animation
========================================================= */

async function champDistributeTeam(row, slotIndex) {
    const card = document.getElementById('champCard' + slotIndex);
    const groupTarget = document.getElementById('champGroupTarget' + row.group_name);
    const groupTeamsEl = document.getElementById('champGroupTeams' + row.group_name);

    if (!card || !groupTarget || !groupTeamsEl) return;

    const allCards = document.querySelectorAll('.champ-card');

    /* ⭐ Spotlight — 3 دورات */
    for (let cycle = 0; cycle < 3; cycle++) {
        for (let c = 0; c < 4; c++) {
            gsap.to(allCards, { boxShadow: 'none', scale: 1, duration: 0.1 });
            gsap.to(allCards[c], {
                boxShadow: '0 0 45px rgba(212,183,122,0.9)',
                scale: 1.06,
                duration: 0.13
            });
            await champWait(110);
        }
    }

    /* ⭐ توقف على البطاقة */
    gsap.to(allCards, { boxShadow: 'none', scale: 1, duration: 0.2 });
    gsap.to(card, {
        boxShadow: '0 0 70px rgba(212,183,122,1)',
        scale: 1.18,
        duration: 0.35,
        ease: 'power2.out'
    });

    await champWait(550);

    /* ⭐ بيانات */
    const teamName = champGetTeamName(row.team);
    const teamLogo = champGetTeamLogo(row.team);

    const cardRect = card.getBoundingClientRect();
    const groupRect = groupTarget.getBoundingClientRect();

    const startX = cardRect.left + cardRect.width / 2;
    const startY = cardRect.top + cardRect.height / 2;
    const endX = groupRect.left + groupRect.width / 2;
    const endY = groupRect.top + groupRect.height / 2;

    /* ⭐ LED */
    const led = document.createElement('div');
    led.className = 'champ-led';
    led.innerHTML =
        (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
        '<span>' + teamName + '</span>';
    led.style.position = 'fixed';
    led.style.left = '0';
    led.style.top = '0';
    led.style.zIndex = '9999999';
    led.style.pointerEvents = 'none';
    led.style.transform = 'translate(' + (startX - 60) + 'px, ' + (startY - 30) + 'px) scale(0.3)';
    led.style.opacity = '0';
    document.body.appendChild(led);

    /* fade البطاقة */
    const cardTeam = card.querySelector('.champ-card-back-team');
    if (cardTeam) {
        gsap.to(cardTeam, {
            opacity: 0,
            scale: 0.5,
            duration: 0.4
        });
    }

    /* ظهور LED */
    await new Promise(function(resolve) {
        gsap.to(led, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(1.5)',
            onComplete: resolve
        });
    });

    await champWait(300);

    /* ⭐ الطيران UEFA Trail */
    await new Promise(function(resolve) {
        const duration = 1.6;
        const startTime = performance.now();
        const midX = (startX + endX) / 2;
        const midY = Math.min(startY, endY) - 180;

        let lastTrailTime = 0;

        function animate(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const mt = 1 - eased;
            const x = mt*mt*mt*startX + 3*mt*mt*eased*midX + 3*mt*eased*eased*midX + eased*eased*eased*endX;
            const y = mt*mt*mt*startY + 3*mt*mt*eased*midY + 3*mt*eased*eased*midY + eased*eased*eased*endY;

            const sc = 1 + Math.sin(eased * Math.PI) * 0.4;
            const rot = eased * 720;

            led.style.transform =
                'translate(' + (x - 60) + 'px, ' + (y - 30) + 'px) ' +
                'rotate(' + rot + 'deg) scale(' + sc + ')';

            if (now - lastTrailTime > 25) {
                lastTrailTime = now;
                champSpawnTrail(x, y);
            }

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(animate);
    });

    /* ⭐ الوصول */
    led.remove();
    champSpawnShockwave(endX, endY);

    gsap.timeline()
        .to(groupTarget, {
            scale: 1.18,
            boxShadow: '0 0 70px rgba(212,183,122,1), inset 0 0 40px rgba(212,183,122,0.4)',
            borderColor: '#D4B77A',
            duration: 0.3,
            ease: 'power2.out'
        })
        .to(groupTarget, {
            scale: 1,
            duration: 0.6,
            ease: 'elastic.out(1, 0.5)'
        })
        .to(groupTarget, {
            boxShadow: '0 0 0 rgba(212,183,122,0)',
            borderColor: 'rgba(212,183,122,0.5)',
            duration: 0.5
        }, '-=0.4');

    /* ⭐ Add team */
    const teamHtml =
        '<div class="champ-group-team-item">' +
            (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + teamName + '</span>' +
        '</div>';
    groupTeamsEl.insertAdjacentHTML('beforeend', teamHtml);

    const newTeam = groupTeamsEl.lastElementChild;
    gsap.fromTo(newTeam,
        { opacity: 0, scale: 0.5, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.7)' }
    );

    /* ⭐ Reset card */
    gsap.to(card, {
        boxShadow: 'none',
        scale: 1,
        duration: 0.4
    });

    if (cardTeam) {
        gsap.to(cardTeam, {
            opacity: 1,
            scale: 1,
            duration: 0.3
        });
    }

    await champWait(400);
}

/* =========================================================
   Reset Cards for Next Pot
========================================================= */

async function champResetCardsForNextPot() {
    const cardInners = document.querySelectorAll('.champ-card-inner');
    const teamSlots = document.querySelectorAll('.champ-card-back-team');

    /* ⭐ نظف */
    teamSlots.forEach(function(el) { el.innerHTML = ''; });

    /* ⭐ ارجع للواجهة */
    await new Promise(function(resolve) {
        gsap.to(cardInners, {
            rotationY: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power2.inOut',
            onComplete: resolve
        });
    });

    await champWait(400);

    /* ⭐ اقلب للظهر مرة ثانية */
    await new Promise(function(resolve) {
        gsap.to(cardInners, {
            rotationY: 180,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power2.inOut',
            onComplete: resolve
        });
    });

    await champWait(300);
}

/* =========================================================
   Finale
========================================================= */

async function champFinale() {
    champSpawnConfetti(80);

    const titleEl = document.getElementById('champDrawTitle');
    if (titleEl) {
        gsap.to(titleEl, {
            opacity: 0,
            y: -20,
            duration: 0.4,
            onComplete: function() {
                titleEl.textContent = 'اكتملت القرعة';
                gsap.to(titleEl, { opacity: 1, y: 0, duration: 0.6 });
            }
        });
    }

    await champWait(1200);

    /* ⭐ أظهر أزرار التحكم */
    champShowDrawButtons();
}

/* =========================================================
   Draw Buttons — Save + Reset
========================================================= */

function champShowDrawButtons() {
    const old = document.getElementById('champDrawActions');
    if (old) return;

    const groupsStage = document.getElementById('champGroupsStage');
    if (!groupsStage) return;

    const actions = document.createElement('div');
    actions.className = 'champ-draw-actions';
    actions.id = 'champDrawActions';

    actions.innerHTML =
        '<button class="champ-btn-save" id="champBtnSave" onclick="champSaveAndClose()">' +
            xIcon('floppy-disk', 'fill') + ' <span>حفظ القرعة</span>' +
        '</button>' +
        '<button class="champ-btn-reset" id="champBtnReset" onclick="champResetFromDraw()">' +
            xIcon('arrows-clockwise', 'bold') + ' <span>إعادة القرعة</span>' +
        '</button>';

    groupsStage.parentElement.appendChild(actions);

    gsap.fromTo(actions,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.3 }
    );
}

async function champSaveAndClose() {
    const saveBtn = document.getElementById('champBtnSave');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = xIcon('hourglass', 'bold') + ' <span>جاري الحفظ...</span>';
    }

    const drawRows = champData.pendingDraw || [];

    if (drawRows.length > 0) {
        await champSaveDraw(drawRows);
        champData.pendingDraw = null;
        if (typeof showToast === 'function') {
            showToast('تم حفظ القرعة', true, 2500);
        }
    }

    const screen = document.getElementById('champDrawScreen');
    if (screen) {
        gsap.to(screen, {
            opacity: 0,
            duration: 0.4,
            onComplete: function() {
                screen.remove();
                champLoaded = false;
                loadChampions();
            }
        });
    }
}

function champResetFromDraw() {
    if (!confirm('هل أنت متأكد؟ سيتم حذف القرعة الحالية والبدء من جديد.')) return;

    const screen = document.getElementById('champDrawScreen');
    if (screen) {
        gsap.to(screen, {
            opacity: 0,
            duration: 0.4,
            onComplete: function() {
                screen.remove();
                champData.pendingDraw = null;

                setTimeout(function() {
                    champPerformDraw();
                }, 300);
            }
        });
    }
}

window.champSaveAndClose = champSaveAndClose;
window.champResetFromDraw = champResetFromDraw;

/* =========================================================
   Effects
========================================================= */

function champSpawnTrail(x, y) {
    const p = document.createElement('div');
    p.className = 'champ-trail-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);

    gsap.fromTo(p,
        { opacity: 0.9, scale: 1 },
        { opacity: 0, scale: 0.2, duration: 0.6, onComplete: function() { p.remove(); } }
    );
}

function champSpawnShockwave(x, y) {
    const w = document.createElement('div');
    w.className = 'champ-shockwave';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    document.body.appendChild(w);

    gsap.fromTo(w,
        { opacity: 0.8, scale: 0 },
        { opacity: 0, scale: 4, duration: 0.9, onComplete: function() { w.remove(); } }
    );
}

function champSpawnConfetti(count) {
    const colors = ['#D4B77A', '#8B1A2F', '#FAF6F0', '#2A2A2A'];
    for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'champ-confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.top = '-20px';
        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        c.style.width = (6 + Math.random() * 8) + 'px';
        c.style.height = (6 + Math.random() * 8) + 'px';
        document.body.appendChild(c);

        gsap.to(c, {
            y: window.innerHeight + 40,
            x: (Math.random() - 0.5) * 200,
            rotation: Math.random() * 720 - 360,
            opacity: 0,
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 1.5,
            ease: 'power1.in',
            onComplete: function() { c.remove(); }
        });
    }
}

/* =========================================================
   Save + Close
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

/* =========================================================
   Start Tournament
========================================================= */

async function champStartTournament() {
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
    } else {
        if (typeof showToast === 'function') showToast('Failed to start', false);
    }
}

/* =========================================================
   Admin Menu
========================================================= */

function attachChampHiddenBtns() {
    const banner = document.querySelector('.text-slide[data-tab="champions"]');
    if (!banner) return;
    if (banner.dataset.champAdminAttached === '1') return;
    banner.dataset.champAdminAttached = '1';

    banner.style.cursor = 'pointer';
    banner.style.userSelect = 'none';
    banner.style.webkitUserSelect = 'none';
    banner.style.webkitTouchCallout = 'none';

    let pressTimer = null;

    const startPress = function() {
        pressTimer = setTimeout(function() { champShowAdminMenu(); }, 1500);
    };
    const cancelPress = function() {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
    };

    banner.addEventListener('touchstart', startPress, { passive: true });
    banner.addEventListener('touchend', cancelPress);
    banner.addEventListener('touchcancel', cancelPress);
    banner.addEventListener('mousedown', startPress);
    banner.addEventListener('mouseup', cancelPress);
    banner.addEventListener('mouseleave', cancelPress);
    banner.addEventListener('contextmenu', function(e) { e.preventDefault(); });
}

function champShowAdminMenu() {
    const pin = prompt('Enter PIN:');
    if (pin === null) return;
    if (pin !== CHAMP_PIN) { alert('Wrong PIN'); return; }

    const choice = prompt(
        'Choose action:\n' +
        '1 - Sync Results\n' +
        '2 - Start Knockout\n' +
        '3 - Reset Draw\n' +
        '0 - Cancel'
    );

    if (choice === '1') champSyncNow();
    else if (choice === '2') champStartKnockout();
    else if (choice === '3') champRequestReset();
}

async function champSyncNow() {
    if (typeof showToast === 'function') showToast('Syncing...', false);

    const meta = champData.meta || {};
    let updated = 0;

    if (meta.current_stage === 'groups') updated = await syncGroupResults();
    else updated = await syncKnockoutResults();

    if (updated > 0) {
        if (typeof showToast === 'function') showToast('Updated ' + updated + ' matches', true, 2500);
    } else {
        if (typeof showToast === 'function') showToast('No new results', false, 2500);
    }

    champLoaded = false;
    loadChampions();
}

async function champStartKnockout() {
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
        if (typeof showToast === 'function') showToast('Knockout started from GW' + startGw, true, 3000);
        champLoaded = false;
        loadChampions();
    } else {
        alert('Failed to build knockout');
    }
}

function champRequestReset() {
    if (!confirm('Reset draw and all matches?')) return;
    resetChampions().then(function(ok) {
        if (ok) {
            if (typeof showToast === 'function') showToast('Draw reset', true, 2500);
            champData = { meta: null, draw: [], matches: [], pendingDraw: null };
            champLoaded = false;
            loadChampions();
        } else {
            if (typeof showToast === 'function') showToast('Failed', false);
        }
    });
}

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
window.champPerformDraw = champPerformDraw;
window.champStartTournament = champStartTournament;
window.champRequestReset = champRequestReset;
window.champSyncNow = champSyncNow;
window.champStartKnockout = champStartKnockout;
window.champShowAdminMenu = champShowAdminMenu;
window.champGoToTab = champGoToTab;
window.championsReload = function() {
    champLoaded = false;
    loadChampions();
};
