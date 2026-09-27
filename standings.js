/* =========================================================
   standings.js — FINALISSIMA LEAGUE CHAT
========================================================= */

function calculateStandingsUpToRound(targetRound) {
    const calculated = {};

    if (typeof initialBasePoints === 'undefined') {
        console.warn('initialBasePoints not defined — using teamsMap');
        for (const teamKey in teamsMap) {
            calculated[teamKey] = { key: teamKey, gf: 0, pts: 0, form: [] };
        }
    } else {
        for (const teamKey in initialBasePoints) {
            calculated[teamKey] = { key: teamKey, gf: 0, pts: 0, form: [] };
        }
    }

    for (let r = 1; r <= targetRound; r++) {
        const roundMatches = matchweeks[r];
        if (!roundMatches) continue;

        roundMatches.forEach(function(match, idx) {
            const hKey = match[0];
            const aKey = match[1];

            const hVal = scoresStorage['r' + r + '_m' + idx + '_home'];
            const aVal = scoresStorage['r' + r + '_m' + idx + '_away'];

            if (hVal !== undefined && aVal !== undefined && hVal !== '' && aVal !== '') {
                const hScore = parseFloat(hVal);
                const aScore = parseFloat(aVal);

                if (Number.isNaN(hScore) || Number.isNaN(aScore)) return;
                if (!calculated[hKey] || !calculated[aKey]) return;

                calculated[hKey].gf += hScore;
                calculated[aKey].gf += aScore;

                if (hScore > aScore) {
                    calculated[hKey].pts += 3;
                    calculated[hKey].form.push('W');
                    calculated[aKey].form.push('L');
                } else if (aScore > hScore) {
                    calculated[aKey].pts += 3;
                    calculated[aKey].form.push('W');
                    calculated[hKey].form.push('L');
                } else {
                    calculated[hKey].pts += 1;
                    calculated[aKey].pts += 1;
                    calculated[hKey].form.push('D');
                    calculated[aKey].form.push('D');
                }
            }
        });
    }

    return Object.values(calculated).sort(function(a, b) {
        return b.pts - a.pts || b.gf - a.gf;
    });
}

function calculateStandings() {
    return calculateStandingsUpToRound(currentRound);
}

function renderForm(formArray) {
    if (!formArray || formArray.length === 0) {
        return '<span style="color:#ccc;">-</span>';
    }

    const last5 = formArray.slice(-5);
    let html = '<div class="form-cell">';

    last5.forEach(function(letter) {
        html += '<span class="form-letter form-' + letter + '">' + letter + '</span>';
    });

    html += '</div>';
    return html;
}

function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const sortedTeams = calculateStandings();
    const prevRanks = {};

    if (currentRound >= 2) {
        const prevSortedTeams = calculateStandingsUpToRound(currentRound - 1);
        prevSortedTeams.forEach(function(team, idx) {
            prevRanks[team.key] = idx + 1;
        });
    }

    sortedTeams.forEach(function(team, index) {
        const teamInfo = teamsMap[team.key] || { name: team.key, logo: '' };
        const position = index + 1;

        let rowClass = 'pos-' + position;
        if (position === 1) {
            rowClass += ' green-line';
        } else if (position === 17) {
            rowClass += ' red-line';
        }

        let indicatorHtml = '';

        if (currentRound >= 2 && prevRanks[team.key] !== undefined) {
            const oldPos = prevRanks[team.key];
            let imgSrc = '';

            if (position < oldPos) {
                imgSrc = './arrow_up_green.png';
            } else if (position > oldPos) {
                imgSrc = './arrow_down_red.png';
            } else {
                imgSrc = './equal_yellow.png';
            }

            indicatorHtml = '<img src="' + imgSrc + '" class="pos-indicator-img" alt="trend" onerror="this.style.display=\'none\'">';
        }

        tbody.innerHTML +=
            '<tr class="' + rowClass + '">' +
                '<td>' +
                    '<div class="pos-container">' +
                        indicatorHtml +
                        '<span class="pos-number">' + position + '</span>' +
                    '</div>' +
                '</td>' +
                '<td>' +
                    '<div class="team-cell">' +
                        '<span class="logo-20">' +
                            '<img src="./' + teamInfo.logo + '" alt="' + teamInfo.name + '" onerror="this.style.display=\'none\'">' +
                        '</span>' +
                        teamInfo.name +
                    '</div>' +
                '</td>' +
                '<td>' +
                    '<span class="stat-number">' + team.gf + '</span>' +
                '</td>' +
                '<td>' +
                    '<span class="stat-number" style="color:#8B1A2F;">' + team.pts + '</span>' +
                '</td>' +
                '<td>' +
                    renderForm(team.form) +
                '</td>' +
            '</tr>';
    });
}
