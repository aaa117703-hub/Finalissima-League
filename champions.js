/* =========================================================
   champions.js — FINALISSIMA LEAGUE CHAT (v=5)
   🏆 Champions Cup — Cinematic Edition
   GSAP + Bezier Flight + Trail + Shockwave
========================================================= */

const CHAMP_PIN = '024680';
const CHAMP_GROUPS = ['A', 'B', 'C', 'D'];
const CHAMP_POT_SIZE = 4;
const CHAMP_GROUP_SIZE = 5;
const CHAMP_GS_GWS = [6, 7, 8, 9];

let champData = { meta: null, draw: [], matches: [] };
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
    if (typeof switchTab === 'function') {
        switchTab('champions');
    }
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
    } catch (e) {
        console.warn('[Champions] loadMeta:', e.message);
        return null;
    }
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
    } catch (e) {
        console.warn('[Champions] loadDraw:', e.message);
        return [];
    }
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
    } catch (e) {
        console.warn('[Champions] loadMatches:', e.message);
        return [];
    }
}

async function saveChampionsMeta(updates) {
    if (!window.sbClient) return false;
    try {
        const payload = Object.assign({ id: 1, updated_at: new Date().toISOString() }, updates);
        const { error } = await window.sbClient
            .from('champions_meta').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('[Champions] saveMeta:', e.message);
        return false;
    }
}

async function saveChampionsDraw(rows) {
    if (!window.sbClient) return false;
    try {
        await window.sbClient.from('champions_draw').delete().neq('id', 0);
        const { error } = await window.sbClient.from('champions_draw').insert(rows);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('[Champions] saveDraw:', e.message);
        return false;
    }
}

async function saveChampionsMatches(rows) {
    if (!window.sbClient) return false;
    try {
        await window.sbClient.from('champions_matches').delete().neq('id', 0);
        const { error } = await window.sbClient.from('champions_matches').insert(rows);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('[Champions] saveMatches:', e.message);
        return false;
    }
}

async function updateChampionsMatch(id, updates) {
    if (!window.sbClient) return false;
    try {
        const payload = Object.assign({ updated_at: new Date().toISOString() }, updates);
        const { error } = await window.sbClient
            .from('champions_matches').update(payload).eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('[Champions] updateMatch:', e.message);
        return false;
    }
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
    } catch (e) {
        console.error('[Champions] reset:', e.message);
        return false;
    }
}

/* =========================================================
   Fetch team scores
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
    } catch (e) {
        console.warn('[Champions] fetchTeamScores GW' + gw + ':', e.message);
        return {};
    }
}

/* =========================================================
   Pots — v5 (uses item.key + item.pts)
========================================================= */

async function buildPots() {
    let sortedTeams = [];

    /* ⭐ محاولة استخدام calculateStandingsUpToRound */
    if (typeof calculateStandingsUpToRound === 'function') {
        try {
            const standings = await calculateStandingsUpToRound(38);

            if (standings && standings.length > 0) {
                sortedTeams = standings.map(function(s) {
                    return s.key || s.team;
                }).filter(function(t) { return t && t.length > 0; });
                console.log('[Champions] standings loaded:', sortedTeams.length, 'teams');
            }
        } catch (e) {
            console.warn('[Champions] standings failed:', e.message);
        }
    }

    /* ⭐ Fallback: teamsMap */
    if (sortedTeams.length === 0 && typeof teamsMap !== 'undefined') {
        sortedTeams = Object.keys(teamsMap);
        console.log('[Champions] fallback to teamsMap:', sortedTeams.length, 'teams');
    }

    /* ⭐ إذا ما زال فاضي → خطأ */
    if (sortedTeams.length === 0) {
        console.error('[Champions] No teams available!');
        return null;
    }

    /* ⭐ تأكد 20 فريق */
    if (sortedTeams.length < 20) {
        console.warn('[Champions] Only', sortedTeams.length, 'teams — padding with teamsMap');
        if (typeof teamsMap !== 'undefined') {
            Object.keys(teamsMap).forEach(function(t) {
                if (sortedTeams.indexOf(t) === -1) {
                    sortedTeams.push(t);
                }
            });
        }
    }

    /* ⭐ ابني 5 Pots */
    const pots = [[], [], [], [], []];
    sortedTeams.slice(0, 20).forEach(function(team, idx) {
        const potIdx = Math.floor(idx / CHAMP_POT_SIZE);
        if (potIdx < 5) pots[potIdx].push(team);
    });

    console.log('[Champions] Pots:', pots.map(function(p) { return p.length; }));

    return pots;
}

/* =========================================================
   Draw
========================================================= */

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
}

function performDraw(pots) {
    const groups = { A: [], B: [], C: [], D: [] };
    pots.forEach(function(potTeams, potIdx) {
        const shuffled = shuffleArray(potTeams);
        shuffled.forEach(function(team, idx) {
            const groupLetter = CHAMP_GROUPS[idx % CHAMP_GROUPS.length];
            groups[groupLetter].push({
                pot_number: potIdx + 1,
                group_name: groupLetter,
                team: team,
                position: groups[groupLetter].length + 1
            });
        });
    });
    const allRows = [];
    CHAMP_GROUPS.forEach(function(g) {
        groups[g].forEach(function(row) { allRows.push(row); });
    });
    return allRows;
}

/* =========================================================
   Round Robin (5 teams + BYE)
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
                if (r % 2 === 0) {
                    roundMatches.push({ home: fixed, away: opp });
                } else {
                    roundMatches.push({ home: opp, away: fixed });
                }
            }

            for (let i = 0; i < halfSize - 1; i++) {
                const t1 = rotating[i];
                const t2 = rotating[rotating.length - 2 - i];
                if (t1 === '__BYE__' || t2 === '__BYE__') continue;
                if (r % 2 === 0) {
                    roundMatches.push({ home: t1, away: t2 });
                } else {
                    roundMatches.push({ home: t2, away: t1 });
                }
            }

            rotating.unshift(rotating.pop());

            const roundNum = r + 1;
            roundMatches.forEach(function(m) {
                matches.push({
                    stage: 'groups',
                    group_name: gName,
                    round_num: roundNum,
                    gw: null,
                    home_team: m.home,
                    away_team: m.away,
                    home_score: null, away_score: null,
                    winner: null, is_played: false
                });
            });
        }
    });

    return matches;
}

/* =========================================================
   Sync Group Results
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
            m.gw = gw;
            m.home_score = hs;
            m.away_score = as;
            m.winner = winner;
            m.is_played = true;
            updated++;
        }
    }
    return updated;
}

/* =========================================================
   Group Standings
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

/* =========================================================
   Build Knockout
========================================================= */

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
   Sync Knockout
========================================================= */

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
        } catch (e) {
            console.warn('[Champions] rankMap failed:', e.message);
        }
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
            m.home_score = hs;
            m.away_score = as;
            m.winner = winner;
            m.is_played = true;
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
        html += '</div>';
        html += '</div>';
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

/* =========================================================
   Render Groups
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
            const rowClass = isQualified ? 'qualified' : '';

            html += '<tr class="' + rowClass + '">';
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

        html += '</tbody></table>';
        html += '</div>';
    });

    html += '</div></div>';
    return html;
}

/* =========================================================
   Render Group Matches
========================================================= */

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

        roundMatches.forEach(function(m) {
            html += renderMatchRow(m);
        });
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
   🎬 CINEMATIC DRAW — GSAP Edition
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

    const drawRows = performDraw(pots);

    champBuildDrawScreen(pots);

    /* ⭐ شغل التسلسل السينمائي */
    await champRunCinematicSequence(drawRows);

    /* ⭐ احفظ النتائج */
    await saveChampionsDraw(drawRows);
    champData.draw = drawRows;

    const groups = { A: [], B: [], C: [], D: [] };
    drawRows.forEach(function(r) { groups[r.group_name].push(r); });
    const matches = buildRoundRobin(groups);
    await saveChampionsMatches(matches);
    champData.matches = matches;

    champDrawAnimating = false;
}

/* =========================================================
   Build Draw Screen HTML
========================================================= */

function champBuildDrawScreen(pots) {
    const old = document.getElementById('champDrawScreen');
    if (old) old.remove();

    const screen = document.createElement('div');
    screen.className = 'champions-draw-screen';
    screen.id = 'champDrawScreen';

    /* ⭐ Stars background */
    let starsHtml = '<div class="champ-stars-bg" id="champStarsBg"></div>';

    /* ⭐ Intro overlay */
    let introHtml = '<div class="champ-intro" id="champIntro">' +
        '<div class="champ-intro-text" id="champIntroText"></div>' +
    '</div>';

    /* ⭐ Main content */
    let potsHtml = '';
    pots.forEach(function(potTeams, idx) {
        potsHtml += '<div class="champions-pot" id="champPot' + (idx + 1) + '">';
        potsHtml += '<div class="champions-pot-label">Pot ' + (idx + 1) + '</div>';
        potsHtml += '<div class="champions-pot-teams">';
        potTeams.forEach(function(code) {
            const name = champGetTeamName(code);
            const logo = champGetTeamLogo(code);
            potsHtml += '<div class="champions-pot-team" data-team="' + code + '">';
            if (logo) {
                potsHtml += '<img src="./' + logo + '" onerror="this.style.display=\'none\'">';
            }
            potsHtml += '<span>' + name + '</span>';
            potsHtml += '</div>';
        });
        potsHtml += '</div></div>';
    });

    let groupsHtml = '';
    CHAMP_GROUPS.forEach(function(g) {
        groupsHtml += '<div class="champions-group-box" id="champGroup' + g + '">';
        groupsHtml += '<div class="champions-group-label">' + g + '</div>';
        groupsHtml += '<div class="champions-group-teams" id="champTeams' + g + '"></div>';
        groupsHtml += '</div>';
    });

    screen.innerHTML =
        starsHtml +
        introHtml +
        '<div class="champ-stage" id="champStage">' +
            '<div class="champions-draw-title" id="champDrawTitle">' +
                xIcon('trophy', 'fill') + ' <span>CHAMPIONS CUP DRAW</span>' +
            '</div>' +
            '<div class="champions-pots-row">' + potsHtml + '</div>' +
            '<div class="champions-ball-area">' +
                '<div class="champions-ball" id="champBall">' +
                    xIcon('soccer-ball', 'fill') +
                '</div>' +
                '<div class="champ-ball-glow" id="champBallGlow"></div>' +
            '</div>' +
            '<div class="champions-groups-row">' + groupsHtml + '</div>' +
        '</div>';

    document.body.appendChild(screen);

    champSpawnStars(60);
}

/* =========================================================
   Stars Background
========================================================= */

function champSpawnStars(count) {
    const bg = document.getElementById('champStarsBg');
    if (!bg) return;
    bg.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'champ-star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = (Math.random() * 3) + 's';
        star.style.animationDuration = (2 + Math.random() * 3) + 's';
        bg.appendChild(star);
    }
}

/* =========================================================
   🎬 Cinematic Sequence
========================================================= */

async function champRunCinematicSequence(drawRows) {
    if (typeof gsap === 'undefined') return;

    const intro = document.getElementById('champIntro');
    const introText = document.getElementById('champIntroText');
    const stage = document.getElementById('champStage');
    const ball = document.getElementById('champBall');
    const ballGlow = document.getElementById('champBallGlow');

    /* ═══════════════════════════════════════════════════════
       SCENE 1: INTRO
       ═══════════════════════════════════════════════════════ */

    gsap.set(stage, { opacity: 0 });
    gsap.set(intro, { opacity: 1 });

    /* "CHAMPIONS" */
    introText.innerHTML = '<div class="champ-intro-line">CHAMPIONS</div>';
    const line1 = introText.querySelector('.champ-intro-line');
    gsap.set(line1, { opacity: 0, y: 80, scale: 0.7, filter: 'blur(20px)' });

    await new Promise(function(resolve) {
        gsap.to(line1, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 1.5,
            ease: 'power4.out',
            onComplete: resolve
        });
    });

    await champWait(500);

    /* Flash + "CUP" */
    gsap.to(line1, {
        scale: 1.5,
        opacity: 0,
        filter: 'blur(30px)',
        duration: 0.4,
        ease: 'power2.in'
    });

    await champWait(200);

    introText.innerHTML = '<div class="champ-intro-line champ-intro-cup">CUP</div>';
    const line2 = introText.querySelector('.champ-intro-line');
    gsap.set(line2, { opacity: 0, scale: 2, filter: 'blur(40px)' });

    await new Promise(function(resolve) {
        gsap.to(line2, {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power3.out',
            onComplete: resolve
        });
    });

    await champWait(800);

    /* Fade out intro */
    await new Promise(function(resolve) {
        gsap.to(intro, {
            opacity: 0,
            duration: 0.6,
            onComplete: resolve
        });
    });

    intro.remove();

    /* ═══════════════════════════════════════════════════════
       SCENE 2: BALL ENTRY
       ═══════════════════════════════════════════════════════ */

    gsap.set(stage, { opacity: 1 });

    /* Ball drop from top */
    gsap.set(ball, { y: -400, opacity: 0, scale: 0.5 });
    gsap.set(ballGlow, { opacity: 0, scale: 0.5 });

    await new Promise(function(resolve) {
        const tl = gsap.timeline({ onComplete: resolve });

        tl.to(ball, {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: 'bounce.out'
        })
        .to(ballGlow, {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power2.out'
        }, '-=0.5')
        .to(ballGlow, {
            scale: 1.3,
            opacity: 0.7,
            duration: 1.2,
            repeat: 2,
            yoyo: true,
            ease: 'power1.inOut'
        }, '-=0.3');
    });

    /* ═══════════════════════════════════════════════════════
       SCENE 3: POTS SPOTLIGHT
       ═══════════════════════════════════════════════════════ */

    for (let p = 1; p <= 5; p++) {
        const potEl = document.getElementById('champPot' + p);
        if (!potEl) continue;

        await new Promise(function(resolve) {
            gsap.timeline({ onComplete: resolve })
                .to(potEl, {
                    boxShadow: '0 0 40px rgba(212, 183, 122, 1)',
                    borderColor: '#D4B77A',
                    scale: 1.05,
                    duration: 0.4,
                    ease: 'power2.out'
                })
                .to(potEl, {
                    boxShadow: '0 0 0 rgba(212, 183, 122, 0)',
                    borderColor: 'rgba(212, 183, 122, 0.4)',
                    scale: 1,
                    duration: 0.5,
                    delay: 0.2,
                    ease: 'power2.in'
                });
        });

        await champWait(100);
    }

    await champWait(400);

    /* ═══════════════════════════════════════════════════════
       SCENE 4-5: PICK + FLIGHT (لكل فريق)
       ═══════════════════════════════════════════════════════ */

    const sorted = drawRows.slice().sort(function(a, b) {
        if (a.pot_number !== b.pot_number) return a.pot_number - b.pot_number;
        return a.position - b.position;
    });

    for (let i = 0; i < sorted.length; i++) {
        const row = sorted[i];
        await champAnimateOnePick(row, i + 1);
    }

    /* ═══════════════════════════════════════════════════════
       SCENE 6: FINALE
       ═══════════════════════════════════════════════════════ */

    await champFinale();
}

/* =========================================================
   🎯 Animate One Pick — Scene 4 + Scene 5
========================================================= */

async function champAnimateOnePick(row, index) {
    const ball = document.getElementById('champBall');
    const ballGlow = document.getElementById('champBallGlow');
    const potEl = document.getElementById('champPot' + row.pot_number);
    const groupBox = document.getElementById('champGroup' + row.group_name);
    const groupTeamsEl = document.getElementById('champTeams' + row.group_name);

    if (!ball || !potEl || !groupBox || !groupTeamsEl) return;

    const teamName = champGetTeamName(row.team);
    const teamLogo = champGetTeamLogo(row.team);

    /* ═══ SCENE 4: SHAKE + REVEAL ═══ */

    /* Highlight POT */
    gsap.to(potEl, {
        boxShadow: '0 0 40px rgba(212, 183, 122, 1)',
        borderColor: '#D4B77A',
        scale: 1.08,
        duration: 0.3,
        ease: 'power2.out'
    });

    /* Highlight source team in pot */
    const teamEl = potEl.querySelector('[data-team="' + row.team + '"]');
    if (teamEl) {
        gsap.to(teamEl, {
            backgroundColor: 'rgba(212, 183, 122, 0.3)',
            scale: 1.1,
            duration: 0.3
        });
    }

    /* Ball shake */
    await new Promise(function(resolve) {
        const tl = gsap.timeline({ onComplete: resolve });
        tl.to(ball, {
            x: 6,
            duration: 0.05,
            repeat: 7,
            yoyo: true,
            ease: 'power1.inOut'
        })
        .to(ball, {
            rotate: 720,
            scale: 1.15,
            duration: 0.5,
            ease: 'power2.inOut'
        }, '-=0.4');
    });

    /* ═══ LIGHT BURST ═══ */

    /* Flash */
    const flash = document.createElement('div');
    flash.className = 'champ-flash';
    document.body.appendChild(flash);
    gsap.fromTo(flash, { opacity: 1 }, {
        opacity: 0,
        duration: 0.4,
        onComplete: function() { flash.remove(); }
    });

    /* Particles explosion */
    champExplodeParticles(ball, 30);

    /* Show team name inside ball */
    const nameLabel = document.createElement('div');
    nameLabel.className = 'champions-ball-team';
    nameLabel.textContent = teamName;
    ball.appendChild(nameLabel);

    gsap.fromTo(nameLabel,
        { opacity: 0, scale: 0.5, y: 20 },
        { opacity: 1, scale: 1.2, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
    );

    /* Glow intensify */
    gsap.to(ballGlow, {
        scale: 2,
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out'
    });

    await champWait(600);

    /* ═══ SCENE 5: FLIGHT (Bezier) ═══ */

    /* Ball position (source) */
    const ballRect = ball.getBoundingClientRect();
    const startX = ballRect.left + ballRect.width / 2;
    const startY = ballRect.top + ballRect.height / 2;

    /* Destination: group box */
    const groupRect = groupBox.getBoundingClientRect();
    const endX = groupRect.left + groupRect.width / 2;
    const endY = groupRect.top + groupRect.height / 2;

    /* Create flying team element */
    const flyingTeam = document.createElement('div');
    flyingTeam.className = 'champ-flying-team';
    flyingTeam.innerHTML =
        (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
        '<span>' + teamName + '</span>';
    flyingTeam.style.position = 'fixed';
    flyingTeam.style.left = '0';
    flyingTeam.style.top = '0';
    flyingTeam.style.transform = 'translate(' + (startX - 80) + 'px, ' + (startY - 30) + 'px)';
    flyingTeam.style.zIndex = '9999999';
    flyingTeam.style.pointerEvents = 'none';
    document.body.appendChild(flyingTeam);

    /* Fade out name inside ball */
    gsap.to(nameLabel, { opacity: 0, scale: 0.5, duration: 0.3 });
    gsap.to(ballGlow, { scale: 1, opacity: 0.5, duration: 0.3 });

    /* ⭐ FLIGHT with custom bezier */
    await new Promise(function(resolve) {
        const flightDuration = 1.5;
        const startTime = performance.now();

        /* Bezier control point — arc above */
        const midX = (startX + endX) / 2;
        const midY = Math.min(startY, endY) - 180;

        /* Trail array */
        const trail = [];

        function animateFlight(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / flightDuration, 1);
            const eased = champEaseInOutCubic(t);

            /* Cubic Bezier */
            const mt = 1 - eased;
            const x = mt * mt * mt * startX +
                      3 * mt * mt * eased * midX +
                      3 * mt * eased * eased * midX +
                      eased * eased * eased * endX;
            const y = mt * mt * mt * startY +
                      3 * mt * mt * eased * midY +
                      3 * mt * eased * eased * midY +
                      eased * eased * eased * endY;

            const rot = eased * 360;
            const sc = 1.3 - eased * 0.3;

            flyingTeam.style.transform =
                'translate(' + (x - 80) + 'px, ' + (y - 30) + 'px) rotate(' + rot + 'deg) scale(' + sc + ')';
            flyingTeam.style.filter = 'brightness(' + (2 - eased * 1) + ') drop-shadow(0 0 ' + (20 - eased * 20) + 'px #D4B77A)';

            /* Trail particle */
            if (index % 2 === 0 || t < 1) {
                if (!trail.lastTime || now - trail.lastTime > 30) {
                    champSpawnTrailParticle(x, y);
                    trail.lastTime = now;
                }
            }

            if (t < 1) {
                requestAnimationFrame(animateFlight);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(animateFlight);
    });

    /* ═══ IMPACT + SHOCKWAVE ═══ */

    /* Remove flying team */
    flyingTeam.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    flyingTeam.style.opacity = '0';
    flyingTeam.style.transform += ' scale(0.5)';
    setTimeout(function() { flyingTeam.remove(); }, 250);

    /* Shockwave */
    champSpawnShockwave(endX, endY);

    /* Group pulse */
    gsap.timeline()
        .to(groupBox, {
            scale: 1.15,
            boxShadow: '0 0 60px rgba(212, 183, 122, 1), inset 0 0 40px rgba(212, 183, 122, 0.5)',
            borderColor: '#D4B77A',
            duration: 0.25,
            ease: 'power2.out'
        })
        .to(groupBox, {
            scale: 1,
            duration: 0.5,
            ease: 'elastic.out(1, 0.5)'
        })
        .to(groupBox, {
            boxShadow: '0 0 0 rgba(212, 183, 122, 0)',
            borderColor: 'rgba(212, 183, 122, 0.5)',
            duration: 0.6
        }, '-=0.3');

    /* Add team to group */
    const teamHtml =
        '<div class="champions-group-team">' +
            (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + teamName + '</span>' +
        '</div>';
    groupTeamsEl.insertAdjacentHTML('beforeend', teamHtml);

    const newTeam = groupTeamsEl.lastElementChild;
    gsap.fromTo(newTeam,
        { opacity: 0, scale: 0.5, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
    );

    /* Reset ball */
    gsap.to(ball, {
        rotate: 0,
        scale: 1,
        x: 0,
        duration: 0.4,
        ease: 'power2.out'
    });

    /* Mark source as drawn */
    if (teamEl) {
        gsap.to(teamEl, {
            opacity: 0.3,
            scale: 1,
            backgroundColor: 'rgba(0,0,0,0)',
            duration: 0.4
        });
    }

    /* Un-highlight POT */
    gsap.to(potEl, {
        boxShadow: '0 0 0 rgba(212, 183, 122, 0)',
        borderColor: 'rgba(212, 183, 122, 0.4)',
        scale: 1,
        duration: 0.5
    });

    /* Clear ball content (after flight) */
    await champWait(400);
    ball.innerHTML = xIcon('soccer-ball', 'fill');
}

/* =========================================================
   🎉 Finale
========================================================= */

async function champFinale() {
    /* Confetti */
    champSpawnConfetti(80);

    await champWait(1500);

    /* Show "DRAW COMPLETE" */
    const stage = document.getElementById('champStage');
    if (stage) {
        const completeEl = document.createElement('div');
        completeEl.className = 'champ-complete';
        completeEl.innerHTML = xIcon('check-circle', 'fill') + ' <span>DRAW COMPLETE</span>';
        stage.appendChild(completeEl);

        gsap.fromTo(completeEl,
            { opacity: 0, scale: 0.5, y: 40 },
            { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }
        );
    }

    await champWait(2000);

    /* Show Close button */
    const closeBtn = document.createElement('button');
    closeBtn.className = 'champions-draw-close';
    closeBtn.innerHTML = xIcon('check-circle', 'bold') + ' <span>Done</span>';
    closeBtn.onclick = champCloseDraw;

    const stageEl = document.getElementById('champStage');
    if (stageEl) {
        stageEl.appendChild(closeBtn);
        gsap.fromTo(closeBtn,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5 }
        );
    }
}

/* =========================================================
   Effects (Trail, Particles, Shockwave, Confetti)
========================================================= */

function champSpawnTrailParticle(x, y) {
    const p = document.createElement('div');
    p.className = 'champ-trail-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);

    gsap.fromTo(p,
        { opacity: 0.9, scale: 1 },
        {
            opacity: 0,
            scale: 0.2,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: function() { p.remove(); }
        }
    );
}

function champExplodeParticles(source, count) {
    const rect = source.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'champ-burst-particle';
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        document.body.appendChild(p);

        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const distance = 80 + Math.random() * 100;

        gsap.fromTo(p,
            { opacity: 1, scale: 1, x: 0, y: 0 },
            {
                opacity: 0,
                scale: 0.3,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                duration: 0.8 + Math.random() * 0.4,
                ease: 'power2.out',
                onComplete: function() { p.remove(); }
            }
        );
    }
}

function champSpawnShockwave(x, y) {
    const w = document.createElement('div');
    w.className = 'champ-shockwave';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    document.body.appendChild(w);

    gsap.fromTo(w,
        { opacity: 0.8, scale: 0 },
        {
            opacity: 0,
            scale: 4,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: function() { w.remove(); }
        }
    );
}

function champSpawnConfetti(count) {
    const colors = ['#D4B77A', '#8B1A2F', '#FAF6F0', '#E5D4A5', '#6B0F1F'];

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
   Easing
========================================================= */

function champEaseInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* =========================================================
   Close Draw
========================================================= */

function champCloseDraw() {
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
    } else {
        champLoaded = false;
        loadChampions();
    }
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
        if (typeof showToast === 'function') {
            showToast('Tournament started from GW' + startGw, true, 3000);
        }
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
        pressTimer = setTimeout(function() {
            champShowAdminMenu();
        }, 1500);
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
    if (pin !== CHAMP_PIN) {
        alert('Wrong PIN');
        return;
    }

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

    if (meta.current_stage === 'groups') {
        updated = await syncGroupResults();
    } else {
        updated = await syncKnockoutResults();
    }

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
    if (!meta.started) {
        alert('Tournament not started');
        return;
    }
    if (meta.current_stage !== 'groups') {
        alert('Knockout already started');
        return;
    }

    const groupMatches = champData.matches.filter(function(m) { return m.stage === 'groups'; });
    const allPlayed = groupMatches.every(function(m) { return m.is_played; });

    if (!allPlayed) {
        alert('Group matches still pending');
        return;
    }

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
            champData = { meta: null, draw: [], matches: [] };
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

    if (champLoaded) {
        renderChampionsMain();
        return;
    }

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
window.champCloseDraw = champCloseDraw;
window.champRequestReset = champRequestReset;
window.champSyncNow = champSyncNow;
window.champStartKnockout = champStartKnockout;
window.champShowAdminMenu = champShowAdminMenu;
window.champGoToTab = champGoToTab;
window.championsReload = function() {
    champLoaded = false;
    loadChampions();
};
