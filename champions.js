/* =========================================================
   champions.js — FINALISSIMA LEAGUE CHAT (v=2)
   🏆 Champions Cup — البطولة الكاملة
   - القرعة UEFA Style
   - مجموعات + إقصائيات + بطل
   - يحسب النتائج تلقائياً من match_results
========================================================= */

const CHAMP_PIN = '024680';
const CHAMP_GROUPS = ['A', 'B', 'C', 'D'];
const CHAMP_POT_SIZE = 4;
const CHAMP_GROUP_SIZE = 5;
const CHAMP_GS_GWS = [6, 7, 8, 9];

let champData = {
    meta: null,
    draw: [],
    matches: []
};

let champLoaded = false;
let champDrawAnimating = false;

/* ---------- Phosphor Icons Helper ---------- */
function xIcon(name, variant) {
    variant = variant || 'regular';
    const variantClass = variant === 'fill' ? 'ph-fill' :
                         variant === 'bold' ? 'ph-bold' :
                         variant === 'duotone' ? 'ph-duotone' :
                         'ph';
    return '<i class="' + variantClass + ' ph-' + name + '"></i>';
}

/* =========================================================
   Supabase — تحميل وحفظ
========================================================= */

async function loadChampionsMeta() {
    if (!window.sbClient) return null;
    try {
        const { data, error } = await window.sbClient
            .from('champions_meta')
            .select('*')
            .eq('id', 1)
            .single();
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
            .from('champions_draw')
            .select('*')
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
            .from('champions_matches')
            .select('*')
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
            .from('champions_meta')
            .upsert(payload, { onConflict: 'id' });
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
            .from('champions_matches')
            .update(payload)
            .eq('id', id);
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
            id: 1,
            started: false,
            start_gw: null,
            current_stage: 'groups',
            current_round: 0,
            champion: null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        return true;
    } catch (e) {
        console.error('[Champions] reset:', e.message);
        return false;
    }
}

/* =========================================================
   جلب نقاط المنتخبات من match_results
========================================================= */

async function fetchTeamScoresForRound(gw) {
    if (!window.sbClient) return {};

    try {
        const { data, error } = await window.sbClient
            .from('match_results')
            .select('home_team, away_team, home_score, away_score')
            .eq('round', gw);

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
   التصنيف — Pots
========================================================= */

async function buildPots() {
    if (typeof calculateStandingsUpToRound !== 'function') return null;

    let standings = [];
    try {
        standings = await calculateStandingsUpToRound(38);
    } catch (e) {
        console.warn('[Champions] buildPots standings:', e.message);
    }

    if (!standings || standings.length === 0) {
        if (typeof TEAMS_LOGOS !== 'undefined') {
            standings = Object.keys(TEAMS_LOGOS).map(function(t) {
                return { team: t, points: 0 };
            });
        }
    }

    const sorted = standings.slice().sort(function(a, b) {
        return (b.points || 0) - (a.points || 0);
    });

    const pots = [[], [], [], [], []];
    sorted.forEach(function(item, idx) {
        const potIdx = Math.floor(idx / CHAMP_POT_SIZE);
        if (potIdx < 5) pots[potIdx].push(item.team);
    });

    return pots;
}

/* =========================================================
   القرعة
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
   Round Robin
========================================================= */

function buildRoundRobin(groups) {
    const matches = [];

    CHAMP_GROUPS.forEach(function(gName) {
        const teams = (groups[gName] || []).map(function(r) { return r.team; });
        if (teams.length < 5) return;

        const n = teams.length;
        const ids = teams.map(function(_, i) { return i; });

        const rounds = [];
        for (let r = 0; r < n - 1; r++) {
            const round = [];
            for (let i = 0; i < n / 2; i++) {
                const home = ids[i];
                const away = ids[n - 1 - i];
                if (r % 2 === 0) {
                    round.push({ home: teams[home], away: teams[away] });
                } else {
                    round.push({ home: teams[away], away: teams[home] });
                }
            }
            rounds.push(round);

            const fixed = ids[0];
            const rest = ids.slice(1);
            rest.unshift(rest.pop());
            ids.length = 0;
            ids.push(fixed);
            rest.forEach(function(x) { ids.push(x); });
        }

        let roundNum = 1;
        rounds.forEach(function(round) {
            round.forEach(function(m) {
                matches.push({
                    stage: 'groups',
                    group_name: gName,
                    round_num: roundNum,
                    gw: null,
                    home_team: m.home,
                    away_team: m.away,
                    home_score: null,
                    away_score: null,
                    home_real: null,
                    away_real: null,
                    home_gf: null,
                    away_gf: null,
                    winner: null,
                    is_played: false
                });
            });
            roundNum++;
        });
    });

    return matches;
}

/* =========================================================
   الحساب — نتائج المجموعات
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
        const gw = startGw + (m.round_num - 1);
        gwsNeeded[gw] = true;
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

        let winner = null;
        if (hs > as) winner = m.home_team;
        else if (as > hs) winner = m.away_team;
        else winner = 'draw';

        const ok = await updateChampionsMatch(m.id, {
            gw: gw,
            home_score: hs,
            away_score: as,
            winner: winner,
            is_played: true
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
   ترتيب المجموعة
========================================================= */

function computeGroupStandings(draw, matches, groupName) {
    const teams = draw.filter(function(r) { return r.group_name === groupName; });

    const table = {};
    teams.forEach(function(t) {
        table[t.team] = {
            team: t.team,
            played: 0, won: 0, drawn: 0, lost: 0,
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
            h.won++; a.lost++;
            h.points += 3;
        } else if (m.away_score > m.home_score) {
            a.won++; h.lost++;
            a.points += 3;
        } else {
            h.drawn++; a.drawn++;
            h.points += 1; a.points += 1;
        }
    });

    Object.values(table).forEach(function(t) {
        t.gd = t.gf - t.ga;
    });

    return Object.values(table).sort(function(x, y) {
        if (y.points !== x.points) return y.points - x.points;
        if (y.gd !== x.gd) return y.gd - x.gd;
        if (y.gf !== x.gf) return y.gf - x.gf;
        return x.team.localeCompare(y.team);
    });
}

/* =========================================================
   بناء الإقصائيات
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
            stage: 'qf',
            group_name: null,
            round_num: idx + 1,
            gw: startGw,
            home_team: p.home,
            away_team: p.away,
            home_score: null, away_score: null,
            home_real: null, away_real: null,
            home_gf: null, away_gf: null,
            winner: null,
            is_played: false
        };
    });

    await window.sbClient.from('champions_matches').insert(qfMatches);

    await saveChampionsMeta({
        current_stage: 'qf',
        current_round: 1
    });

    return true;
}

/* =========================================================
   حساب الإقصائيات
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

    let updated = 0;

    for (const m of knockoutMatches) {
        const scores = scoresByGw[m.gw] || {};
        const hs = scores[m.home_team];
        const as = scores[m.away_team];

        if (hs === undefined || as === undefined) continue;

        let winner = null;
        if (hs > as) winner = m.home_team;
        else if (as > hs) winner = m.away_team;
        else winner = m.home_team;

        const ok = await updateChampionsMatch(m.id, {
            home_score: hs,
            away_score: as,
            winner: winner,
            is_played: true
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
        if (nextStage === 'sf') {
            if (winners.length >= 4) {
                newMatches.push({
                    stage: 'sf', group_name: null, round_num: 1, gw: gw,
                    home_team: winners[0], away_team: winners[1],
                    home_score: null, away_score: null, home_real: null, away_real: null,
                    home_gf: null, away_gf: null, winner: null, is_played: false
                });
                newMatches.push({
                    stage: 'sf', group_name: null, round_num: 2, gw: gw,
                    home_team: winners[2], away_team: winners[3],
                    home_score: null, away_score: null, home_real: null, away_real: null,
                    home_gf: null, away_gf: null, winner: null, is_played: false
                });
            }
        } else if (nextStage === 'final') {
            if (winners.length >= 2) {
                newMatches.push({
                    stage: 'final', group_name: null, round_num: 1, gw: gw,
                    home_team: winners[0], away_team: winners[1],
                    home_score: null, away_score: null, home_real: null, away_real: null,
                    home_gf: null, away_gf: null, winner: null, is_played: false
                });
            }
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
   Render — الشاشة الرئيسية
========================================================= */

function renderChampionsMain() {
    const container = document.getElementById('championsContent');
    if (!container) return;

    const meta = champData.meta || {};
    const draw = champData.draw || [];
    const matches = champData.matches || [];

    let html = '';

    html += '<div class="champions-banner" id="champBanner">';
    html += '<div class="champions-banner-inner">';
    html += '<img class="champions-banner-img" src="./banner-fina.png" alt="Champions Cup">';
    html += '</div>';
    html += '</div>';

    if (!meta.started) {
        if (draw.length === 0) {
            html += '<div class="champions-start-area">';
            html += '<button class="champions-start-btn" onclick="champPerformDraw()">';
            html += xIcon('shuffle', 'bold') + ' بدء القرعة';
            html += '</button>';
            html += '<div class="champions-status-text">اضغط لبدء قرعة البطولة</div>';
            html += '</div>';
        } else {
            html += '<div class="champions-start-area">';
            html += '<button class="champions-start-btn" onclick="champStartTournament()">';
            html += xIcon('play-circle', 'fill') + ' ابدأ البطولة';
            html += '</button>';
            html += '<div class="champions-status-text">البطولة راح تبدأ من <strong>الجولة القادمة</strong></div>';
            html += '</div>';
        }
    } else {
        let stageText = '';
        if (meta.current_stage === 'groups') stageText = 'دور المجموعات';
        else if (meta.current_stage === 'qf') stageText = 'ربع النهائي';
        else if (meta.current_stage === 'sf') stageText = 'نصف النهائي';
        else if (meta.current_stage === 'final') stageText = 'النهائي';
        else if (meta.current_stage === 'done') stageText = 'البطولة انتهت';

        html += '<div class="champions-start-area">';
        html += '<div class="champions-status-text">';
        html += xIcon('trophy', 'fill') + ' ' + stageText + ' — من GW<strong>' + meta.start_gw + '</strong>';
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
        html += '<div>البطولة جاهزة للانطلاق</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    attachChampHiddenBtns();
}

/* =========================================================
   Render — المجموعات
========================================================= */

function renderGroupsSection(draw, matches, meta) {
    let html = '<div class="champions-groups-section">';
    html += '<div class="champions-section-title">' + xIcon('squares-four', 'bold') + ' المجموعات</div>';
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
            const logoFile = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[t.team]) || '';
            const isQualified = idx < 2 && meta.current_stage !== 'groups';
            const rowClass = isQualified ? 'qualified' : '';

            html += '<tr class="' + rowClass + '">';
            html += '<td>' + (idx + 1) + '</td>';
            html += '<td><div class="team-cell-mini">';
            if (logoFile) {
                html += '<img src="./' + logoFile + '" onerror="this.style.display=\'none\'">';
            }
            html += '<span>' + t.team + '</span>';
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
   Render — مباريات المجموعات
========================================================= */

function renderGroupsMatches(matches, meta) {
    const groupMatches = matches.filter(function(m) { return m.stage === 'groups'; });
    if (groupMatches.length === 0) return '';

    const startGw = meta.start_gw || 6;

    let html = '<div class="champions-round-section">';
    html += '<div class="champions-section-title">' + xIcon('soccer-ball', 'bold') + ' مباريات المجموعات</div>';

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
   Render — شجرة الإقصائيات
========================================================= */

function renderKnockoutBracket(matches, meta) {
    const qfMatches = matches.filter(function(m) { return m.stage === 'qf'; });
    const sfMatches = matches.filter(function(m) { return m.stage === 'sf'; });
    const finalMatches = matches.filter(function(m) { return m.stage === 'final'; });

    let html = '<div class="champions-round-section">';
    html += '<div class="champions-section-title">' + xIcon('trophy', 'fill') + ' الأدوار الإقصائية</div>';

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
        const logoFile = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[meta.champion]) || '';
        html += '<div class="champ-champion-card">';
        html += '<div class="champ-champion-label">' + xIcon('crown', 'fill') + ' CHAMPION</div>';
        if (logoFile) {
            html += '<img src="./' + logoFile + '" class="champ-champion-logo" onerror="this.style.display=\'none\'">';
        }
        html += '<div class="champ-champion-name">' + meta.champion + '</div>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function renderBracketMatch(m) {
    const homeLogo = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[m.home_team]) || '';
    const awayLogo = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[m.away_team]) || '';

    const homeWin = m.winner === m.home_team;
    const awayWin = m.winner === m.away_team;

    return '<div class="champions-bracket-match">' +
        '<div class="champions-bracket-team' + (homeWin ? ' winner' : '') + '">' +
            (homeLogo ? '<img src="./' + homeLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span class="champions-bracket-team-name">' + m.home_team + '</span>' +
            '<span class="champions-bracket-score">' + (m.is_played ? m.home_score : '-') + '</span>' +
        '</div>' +
        '<div class="champions-bracket-team' + (awayWin ? ' winner' : '') + '">' +
            (awayLogo ? '<img src="./' + awayLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span class="champions-bracket-team-name">' + m.away_team + '</span>' +
            '<span class="champions-bracket-score">' + (m.is_played ? m.away_score : '-') + '</span>' +
        '</div>' +
    '</div>';
}

function renderMatchRow(m) {
    const homeLogo = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[m.home_team]) || '';
    const awayLogo = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[m.away_team]) || '';

    let scoreHtml = '';
    if (m.is_played && m.home_score !== null && m.away_score !== null) {
        scoreHtml = m.home_score + ' - ' + m.away_score;
    } else {
        scoreHtml = '<span class="pending">VS</span>';
    }

    return '<div class="champions-match-row">' +
        '<div class="champions-match-team home">' +
            '<span>' + m.home_team + '</span>' +
            (homeLogo ? '<img src="./' + homeLogo + '" onerror="this.style.display=\'none\'">' : '') +
        '</div>' +
        '<div class="champions-match-score' + (!m.is_played ? ' pending' : '') + '">' + scoreHtml + '</div>' +
        '<div class="champions-match-team away">' +
            (awayLogo ? '<img src="./' + awayLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + m.away_team + '</span>' +
        '</div>' +
    '</div>';
}

/* =========================================================
   الأنيميشن — القرعة
========================================================= */

async function champPerformDraw() {
    if (champDrawAnimating) return;
    champDrawAnimating = true;

    const pots = await buildPots();
    if (!pots) {
        champDrawAnimating = false;
        if (typeof showToast === 'function') showToast('فشل بناء التصنيف', false);
        return;
    }

    const drawRows = performDraw(pots);

    const screen = document.createElement('div');
    screen.className = 'champions-draw-screen';
    screen.id = 'champDrawScreen';

    let potsHtml = '';
    pots.forEach(function(potTeams, idx) {
        potsHtml += '<div class="champions-pot" id="champPot' + (idx + 1) + '">';
        potsHtml += '<div class="champions-pot-label">Pot ' + (idx + 1) + '</div>';
        potsHtml += '<div class="champions-pot-teams">';
        potTeams.forEach(function(t) {
            potsHtml += '<div class="champions-pot-team" data-team="' + t + '">' + t + '</div>';
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
        '<div class="champions-draw-title">' + xIcon('trophy', 'fill') + ' CHAMPIONS CUP DRAW</div>' +
        '<div class="champions-pots-row">' + potsHtml + '</div>' +
        '<div class="champions-ball-area">' +
            '<div class="champions-ball" id="champBall">' +
                xIcon('soccer-ball', 'fill') +
            '</div>' +
        '</div>' +
        '<div class="champions-groups-row">' + groupsHtml + '</div>' +
        '<button class="champions-draw-close" style="display:none;" id="champDrawClose" onclick="champCloseDraw()">' +
            xIcon('check-circle', 'bold') + ' تم' +
        '</button>';

    document.body.appendChild(screen);

    await champAnimateSequence(drawRows);

    champDrawAnimating = false;
}

async function champAnimateSequence(drawRows) {
    const ball = document.getElementById('champBall');

    const sorted = drawRows.slice().sort(function(a, b) {
        if (a.pot_number !== b.pot_number) return a.pot_number - b.pot_number;
        return a.position - b.position;
    });

    for (let i = 0; i < sorted.length; i++) {
        const row = sorted[i];

        const potEl = document.getElementById('champPot' + row.pot_number);
        if (potEl) {
            potEl.classList.add('active');
            const teamEl = potEl.querySelector('[data-team="' + row.team + '"]');
            if (teamEl) teamEl.classList.add('drawn');
        }

        if (ball) {
            ball.classList.remove('settled');
            ball.innerHTML = '';
            const nameLabel = document.createElement('div');
            nameLabel.className = 'champions-ball-team';
            nameLabel.textContent = row.team;
            ball.appendChild(nameLabel);

            await champWait(700);

            ball.classList.add('settled');
            await champWait(400);
        }

        const groupTeamsEl = document.getElementById('champTeams' + row.group_name);
        const groupBox = document.getElementById('champGroup' + row.group_name);

        if (groupTeamsEl) {
            const logoFile = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[row.team]) || '';
            const teamHtml =
                '<div class="champions-group-team">' +
                    (logoFile ? '<img src="./' + logoFile + '" onerror="this.style.display=\'none\'">' : '') +
                    '<span>' + row.team + '</span>' +
                '</div>';
            groupTeamsEl.insertAdjacentHTML('beforeend', teamHtml);
        }

        if (groupBox) {
            groupBox.classList.add('flash');
            setTimeout(function() { groupBox.classList.remove('flash'); }, 900);
        }

        if (ball) {
            ball.innerHTML = xIcon('soccer-ball', 'fill');
            ball.classList.remove('settled');
        }

        if (potEl) potEl.classList.remove('active');

        await champWait(300);
    }

    const closeBtn = document.getElementById('champDrawClose');
    if (closeBtn) closeBtn.style.display = 'inline-flex';

    await saveChampionsDraw(drawRows);
    champData.draw = drawRows;

    const groups = { A: [], B: [], C: [], D: [] };
    drawRows.forEach(function(r) { groups[r.group_name].push(r); });
    const matches = buildRoundRobin(groups);
    await saveChampionsMatches(matches);
    champData.matches = matches;

    if (typeof showToast === 'function') {
        showToast('تم حفظ القرعة', true, 2000);
    }
}

function champWait(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
}

function champCloseDraw() {
    const screen = document.getElementById('champDrawScreen');
    if (screen) screen.remove();
    champLoaded = false;
    loadChampions();
}

/* =========================================================
   زر ابدأ البطولة
========================================================= */

async function champStartTournament() {
    if (typeof currentRound === 'undefined') {
        if (typeof showToast === 'function') showToast('currentRound غير متوفر', false);
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
            showToast('البطولة بدأت من GW' + startGw, true, 3000);
        }
        champLoaded = false;
        loadChampions();
    } else {
        if (typeof showToast === 'function') showToast('فشل بدء البطولة', false);
    }
}

/* =========================================================
   الأزرار المخفية — على البنر
========================================================= */

function attachChampHiddenBtns() {
    const banner = document.getElementById('champBanner');
    if (!banner) return;

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
    const pin = prompt('أدخل رمز التحكم:');
    if (pin === null) return;
    if (pin !== CHAMP_PIN) {
        alert('الرمز غلط');
        return;
    }

    const meta = champData.meta || {};

    const choice = prompt(
        'اختر الإجراء:\n' +
        '1 — تحديث النتائج\n' +
        '2 — ابدأ الإقصائيات\n' +
        '3 — إعادة القرعة\n' +
        '0 — إلغاء'
    );

    if (choice === '1') champSyncNow();
    else if (choice === '2') champStartKnockout();
    else if (choice === '3') champRequestReset();
}

async function champSyncNow() {
    if (typeof showToast === 'function') showToast('جاري تحديث النتائج...', false);

    const meta = champData.meta || {};
    let updated = 0;

    if (meta.current_stage === 'groups') {
        updated = await syncGroupResults();
    } else {
        updated = await syncKnockoutResults();
    }

    if (updated > 0) {
        if (typeof showToast === 'function') showToast('تم تحديث ' + updated + ' مباراة', true, 2500);
    } else {
        if (typeof showToast === 'function') showToast('لا توجد نتائج جديدة', false, 2500);
    }

    champLoaded = false;
    loadChampions();
}

async function champStartKnockout() {
    const meta = champData.meta || {};
    if (!meta.started) {
        alert('البطولة ما بدأت بعد');
        return;
    }
    if (meta.current_stage !== 'groups') {
        alert('الإقصائيات بدأت بالفعل');
        return;
    }

    const groupMatches = champData.matches.filter(function(m) { return m.stage === 'groups'; });
    const allPlayed = groupMatches.every(function(m) { return m.is_played; });

    if (!allPlayed) {
        alert('ما زالت هناك مباريات مجموعات لم تنته');
        return;
    }

    if (!confirm('⚠️ ابدأ الإقصائيات من الجولة القادمة؟')) return;

    const startGw = (currentRound || 1) + 1;

    const ok = await buildKnockoutStage(startGw);

    if (ok) {
        if (typeof showToast === 'function') showToast('الإقصائيات بدأت من GW' + startGw, true, 3000);
        champLoaded = false;
        loadChampions();
    } else {
        alert('فشل بناء الإقصائيات');
    }
}

function champRequestReset() {
    if (!confirm('⚠️ راح تمسح القرعة وكل المباريات. متأكد؟')) return;

    resetChampions().then(function(ok) {
        if (ok) {
            if (typeof showToast === 'function') showToast('تمت إعادة القرعة', true, 2500);
            champData = { meta: null, draw: [], matches: [] };
            champLoaded = false;
            loadChampions();
        } else {
            if (typeof showToast === 'function') showToast('فشل', false);
        }
    });
}

/* =========================================================
   التحميل
========================================================= */

async function loadChampions() {
    const container = document.getElementById('championsContent');
    if (!container) return;

    if (!window.sbClient) {
        container.innerHTML = '<div class="champions-empty">' + xIcon('warning-circle', 'duotone') + '<div>Supabase غير متوفر</div></div>';
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
        container.innerHTML = '<div class="champions-empty">' + xIcon('warning-circle', 'duotone') + '<div>فشل التحميل</div></div>';
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
window.championsReload = function() {
    champLoaded = false;
    loadChampions();
};
