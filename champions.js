/* =========================================================
   champions.js — FINALISSIMA LEAGUE CHAT (v=1)
   🏆 Champions Cup — البطولة الأوروبية
   - 20 منتخب → 4 مجموعات × 5
   - قرعة انصافية (5 Pots)
   - أنيميشن UEFA Style
   - ذهاب فقط
========================================================= */

const CHAMP_PIN = '024680';
const CHAMP_GROUPS = ['A', 'B', 'C', 'D'];
const CHAMP_POT_SIZE = 4;
const CHAMP_GROUP_SIZE = 5;

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
   القرعة — انصافية
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
   Round Robin — جدول المباريات
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
   Render — الشاشة الرئيسية
========================================================= */

function renderChampionsMain() {
    const container = document.getElementById('championsContent');
    if (!container) return;

    const meta = champData.meta || {};
    const draw = champData.draw || [];
    const matches = champData.matches || [];

    let html = '';

    /* البنر */
    html += '<div class="champions-banner">';
    html += '<div class="champions-banner-inner">';
    html += '<img class="champions-banner-img" src="./banner-fina.png" alt="Champions Cup">';
    html += '</div>';
    html += '</div>';

    /* زر البدء */
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
        html += '<div class="champions-start-area">';
        html += '<div class="champions-status-text">';
        html += xIcon('trophy', 'fill') + ' البطولة انطلقت — من GW<strong>' + meta.start_gw + '</strong>';
        html += '</div>';
        html += '</div>';
    }

    /* المحتوى */
    if (draw.length > 0) {
        html += renderGroupsSection(draw);
        html += renderMatchesSection(matches);
    } else {
        html += '<div class="champions-empty">';
        html += xIcon('trophy', 'duotone');
        html += '<div>البطولة جاهزة للانطلاق</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    attachChampHiddenBtn();
}

/* =========================================================
   Render — المجموعات
========================================================= */

function renderGroupsSection(draw) {
    let html = '<div class="champions-groups-section">';
    html += '<div class="champions-section-title">' + xIcon('squares-four', 'bold') + ' المجموعات</div>';
    html += '<div class="champions-groups-grid">';

    CHAMP_GROUPS.forEach(function(gName) {
        const teams = draw.filter(function(r) { return r.group_name === gName; })
            .sort(function(a, b) { return a.position - b.position; });

        html += '<div class="champions-group-card">';
        html += '<div class="champions-group-card-header">' + xIcon('shield-star', 'fill') + ' Group ' + gName + '</div>';
        html += '<table class="champions-group-table">';
        html += '<thead><tr><th>#</th><th style="text-align:right;">الفريق</th></tr></thead><tbody>';

        teams.forEach(function(t, idx) {
            const logoFile = (typeof TEAMS_LOGOS !== 'undefined' && TEAMS_LOGOS[t.team]) || '';
            html += '<tr>';
            html += '<td>' + (idx + 1) + '</td>';
            html += '<td><div class="team-cell-mini">';
            if (logoFile) {
                html += '<img src="./' + logoFile + '" onerror="this.style.display=\'none\'">';
            }
            html += '<span>' + t.team + '</span>';
            html += '</div></td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        html += '</div>';
    });

    html += '</div></div>';
    return html;
}

/* =========================================================
   Render — المباريات
========================================================= */

function renderMatchesSection(matches) {
    if (!matches || matches.length === 0) return '';

    let html = '<div class="champions-round-section">';
    html += '<div class="champions-section-title">' + xIcon('soccer-ball', 'bold') + ' المباريات</div>';

    const groupMatches = matches.filter(function(m) { return m.stage === 'groups'; });

    CHAMP_GROUPS.forEach(function(gName) {
        const gMatches = groupMatches.filter(function(m) { return m.group_name === gName; });
        if (gMatches.length === 0) return;

        html += '<div style="margin-bottom:14px;">';
        html += '<div style="font-size:12px;font-weight:900;color:#8B1A2F;margin-bottom:6px;letter-spacing:1px;">';
        html += 'GROUP ' + gName;
        html += '</div>';

        gMatches.forEach(function(m) {
            html += renderMatchRow(m);
        });

        html += '</div>';
    });

    html += '</div>';
    return html;
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
   الأنيميشن — القرعة UEFA Style
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

    /* حفظ القرعة */
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
   زر مخفي — إعادة القرعة
========================================================= */

function attachChampHiddenBtn() {
    const banner = document.querySelector('.champions-banner');
    if (!banner) return;

    banner.style.cursor = 'pointer';
    banner.style.userSelect = 'none';
    banner.style.webkitUserSelect = 'none';
    banner.style.webkitTouchCallout = 'none';

    let pressTimer = null;

    const startPress = function() {
        pressTimer = setTimeout(function() {
            champRequestReset();
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

function champRequestReset() {
    const pin = prompt('أدخل رمز إعادة القرعة:');
    if (pin === null) return;
    if (pin !== CHAMP_PIN) {
        alert('الرمز غلط');
        return;
    }

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
   التحميل الرئيسي
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
window.championsReload = function() {
    champLoaded = false;
    loadChampions();
};

/* Auto-load عند فتح التاب */
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (document.getElementById('championsContent')) {
            loadChampions();
        }
    }, 3000);
});
