// =========================================================
// fixtures.js — Finalissima League
// عرض مباريات الجولة الحالية
// =========================================================

// =========================================================
// 1. عرض المباريات
// =========================================================

function renderFixtures() {
    const container = document.getElementById('fixturesContainer');
    if (!container) return;

    const matches = getCurrentRoundMatches();

    if (!matches || matches.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا توجد مباريات في هذه الجولة</p>';
        return;
    }

    let html = '<div class="fixtures-list">';

    matches.forEach(function(match, index) {
        const homeCode = match[0];
        const awayCode = match[1];

        const homeName = getTeamName(homeCode);
        const awayName = getTeamName(awayCode);

        // ابحث عن نتيجة المباراة (من localStorage مؤقتاً)
        const score = getMatchScore(currentRound, homeCode, awayCode);

        html += '<div class="fixture-card" data-home="' + homeCode + '" data-away="' + awayCode + '">';

        html += '<div class="fixture-team fixture-home">';
        html += '<span class="team-code">' + homeCode + '</span>';
        html += '<span class="team-name">' + homeName + '</span>';
        html += '</div>';

        html += '<div class="fixture-score">';
        if (score) {
            html += '<span class="score-num">' + score.home + '</span>';
            html += '<span class="score-sep">-</span>';
            html += '<span class="score-num">' + score.away + '</span>';
        } else {
            html += '<span class="score-vs">VS</span>';
        }
        html += '</div>';

        html += '<div class="fixture-team fixture-away">';
        html += '<span class="team-name">' + awayName + '</span>';
        html += '<span class="team-code">' + awayCode + '</span>';
        html += '</div>';

        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
}

// =========================================================
// 2. جلب نتيجة مباراة
// =========================================================

function getMatchScore(round, homeCode, awayCode) {
    try {
        const key = 'fin_match_' + round + '_' + homeCode + '_' + awayCode;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed.home === 'number' && typeof parsed.away === 'number') {
            return parsed;
        }
    } catch (e) { }
    return null;
}

// =========================================================
// 3. حفظ نتيجة مباراة
// =========================================================

function saveMatchScore(round, homeCode, awayCode, homeScore, awayScore) {
    const key = 'fin_match_' + round + '_' + homeCode + '_' + awayCode;
    const data = { home: homeScore, away: awayScore };
    localStorage.setItem(key, JSON.stringify(data));
}

// =========================================================
// 4. Expose
// =========================================================

window.renderFixtures = renderFixtures;
window.getMatchScore = getMatchScore;
window.saveMatchScore = saveMatchScore;
