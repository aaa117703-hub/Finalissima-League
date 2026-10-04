/* =========================================================
   champions-draw.js — FINALISSIMA LEAGUE CHAT (v=7)
   🎬 WORLD-CLASS CINEMATIC DRAW
   🔇 الأصوات معطلة ما عدا Tick
========================================================= */

/* =========================================================
   State
========================================================= */

let champDrawState = {
    playing: false,
    currentPot: 0,
    currentTeam: null,
    skipRequested: false,
    sessionStartTime: 0
};

/* =========================================================
   Audio Engine — Web Audio API
========================================================= */

let champAudioCtx = null;

function champInitAudio() {
    try {
        if (!champAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                champAudioCtx = new AudioCtx();
            }
        }
        if (champAudioCtx && champAudioCtx.state === 'suspended') {
            champAudioCtx.resume();
        }
    } catch (e) {
        console.warn('[Champ Audio] Init failed:', e);
    }
}

/* Whoosh — معطل */
function champPlayWhoosh(duration) {
    return;
}

/* Chime — معطل */
function champPlayChime() {
    return;
}

/* Impact — معطل */
function champPlayImpact() {
    return;
}

/* Cheer — معطل */
function champPlayCheer() {
    return;
}

/* Success — معطل */
function champPlaySuccess() {
    return;
}

/* Tick — يعمل */
function champPlayTick() {
    if (!champAudioCtx) return;

    try {
        const now = champAudioCtx.currentTime;
        const osc = champAudioCtx.createOscillator();
        const gain = champAudioCtx.createGain();

        osc.type = 'square';
        osc.frequency.value = 2200;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        osc.connect(gain);
        gain.connect(champAudioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    } catch (e) {}
}

/* =========================================================
   Haptic Feedback
========================================================= */

function champVibrate(pattern) {
    try {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    } catch (e) {}
}

/* =========================================================
   Helpers
========================================================= */

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

function champXIcon(name, variant) {
    variant = variant || 'regular';
    const vc = variant === 'fill' ? 'ph-fill' :
               variant === 'bold' ? 'ph-bold' :
               variant === 'duotone' ? 'ph-duotone' : 'ph';
    return '<i class="' + vc + ' ph-' + name + '"></i>';
}

function champIsAdmin() {
    try {
        return sessionStorage.getItem('champ_admin') === 'true';
    } catch (e) {
        return false;
    }
}

/* =========================================================
   Skip Button
========================================================= */

function champShowSkipButton() {
    const old = document.getElementById('champSkipBtn');
    if (old) return;

    const btn = document.createElement('button');
    btn.id = 'champSkipBtn';
    btn.className = 'champ-skip-btn';
    btn.innerHTML = champXIcon('fast-forward', 'bold') + ' <span>تخطي</span>';
    btn.onclick = function() {
        champDrawState.skipRequested = true;
        btn.style.opacity = '0';
        setTimeout(function() { btn.remove(); }, 300);
    };

    document.body.appendChild(btn);

    setTimeout(function() {
        if (btn) btn.style.opacity = '1';
    }, 100);
}

function champHideSkipButton() {
    const btn = document.getElementById('champSkipBtn');
    if (btn) {
        btn.style.opacity = '0';
        setTimeout(function() { btn.remove(); }, 300);
    }
}

/* =========================================================
   Progress Bar
========================================================= */

function champShowProgressBar() {
    const old = document.getElementById('champProgressBar');
    if (old) old.remove();

    const bar = document.createElement('div');
    bar.id = 'champProgressBar';
    bar.className = 'champ-progress-bar';

    for (let i = 1; i <= 5; i++) {
        const dot = document.createElement('div');
        dot.className = 'champ-progress-dot';
        dot.dataset.pot = i;
        bar.appendChild(dot);
    }

    document.body.appendChild(bar);

    setTimeout(function() {
        bar.style.opacity = '1';
    }, 100);
}

function champUpdateProgress(potNum) {
    const dots = document.querySelectorAll('.champ-progress-dot');
    dots.forEach(function(dot) {
        const num = parseInt(dot.dataset.pot, 10);
        if (num < potNum) {
            dot.classList.add('done');
            dot.classList.remove('active');
        } else if (num === potNum) {
            dot.classList.add('active');
            dot.classList.remove('done');
        } else {
            dot.classList.remove('active', 'done');
        }
    });
}

function champHideProgressBar() {
    const bar = document.getElementById('champProgressBar');
    if (bar) {
        bar.style.opacity = '0';
        setTimeout(function() { bar.remove(); }, 400);
    }
}

/* =========================================================
   Main Entry
========================================================= */

function champPerformDraw() {
    if (typeof gsap === 'undefined') {
        if (typeof showToast === 'function') showToast('GSAP not loaded', false);
        return;
    }

    if (!champIsAdmin()) {
        if (typeof showToast === 'function') showToast('غير مصرح', false);
        return;
    }

    if (champDrawState.playing) {
        console.warn('[Champ] Already playing');
        return;
    }

    champInitAudio();

    champPerformDrawAsync();
}

async function champPerformDrawAsync() {
    champDrawState.playing = true;
    champDrawState.skipRequested = false;
    champDrawState.sessionStartTime = Date.now();

    try {
        const pots = await buildPots();
        if (!pots) {
            champDrawState.playing = false;
            if (typeof showToast === 'function') showToast('فشل بناء الـ Pots', false);
            return;
        }

        const drawRows = champGenerateRandomDraw(pots);
        champData.pendingDraw = drawRows;

        champBuildDrawScreen(pots);

        await champRunCinematicDraw(drawRows, pots);

    } catch (err) {
        console.error('[Champions] Draw error:', err);
        if (typeof showToast === 'function') showToast('فشل: ' + err.message, false, 4000);
    } finally {
        champDrawState.playing = false;
    }
}

/* =========================================================
   Build Draw Screen
========================================================= */

function champBuildDrawScreen(pots) {
    const old = document.getElementById('champDrawScreen');
    if (old) old.remove();

    const screen = document.createElement('div');
    screen.className = 'champions-draw-screen';
    screen.id = 'champDrawScreen';

    let html = '';

    html += '<canvas id="champBgCanvas" class="champ-bg-canvas"></canvas>';

    html += '<div class="champ-preloader" id="champPreloader">';
    html += '<div class="champ-preloader-logo" id="champPreloaderLogo">';
    html += '<div class="champ-preloader-ring"></div>';
    html += '<div class="champ-preloader-text">FINALISSIMA</div>';
    html += '</div>';
    html += '<div class="champ-preloader-bar"><div class="champ-preloader-fill" id="champPreloaderFill"></div></div>';
    html += '<div class="champ-preloader-status" id="champPreloaderStatus">جاري التحضير...</div>';
    html += '</div>';

    html += '<div class="champ-intro-overlay" id="champIntroOverlay" style="display:none;">';
    html += '<div class="champ-intro-text" id="champIntroText"></div>';
    html += '</div>';

    html += '<div class="champ-main-content" id="champMainContent" style="opacity:0;">';

    html += '<div class="champ-draw-header" id="champDrawHeader">';
    html += '<div class="champ-draw-title" id="champDrawTitle">قرعة كأس أبطال الفيناليغ</div>';
    html += '</div>';

    html += '<div class="champ-trophy-stage" id="champTrophyStage">';
    html += '<div class="champ-trophy-glow"></div>';
    html += '<div class="champ-trophy" id="champTrophy">';
    html += '<i class="ph-fill ph-trophy"></i>';
    html += '</div>';
    html += '</div>';

    html += '<div class="champ-pots-stage" id="champPotsStage">';
    pots.forEach(function(potTeams, potIdx) {
        const potNum = potIdx + 1;

        html += '<div class="champ-pot-row" data-pot="' + potNum + '" id="champPotRow' + potNum + '">';
        html += '<div class="champ-pot-label">POT ' + potNum + '</div>';
        html += '<div class="champ-pot-teams">';

        potTeams.forEach(function(teamCode) {
            const teamName = champGetTeamName(teamCode);
            const teamLogo = champGetTeamLogo(teamCode);

            html += '<div class="champ-team-card" data-team="' + teamCode + '" data-pot="' + potNum + '" id="champCard-' + teamCode + '">';
            html += '<span class="champ-team-card-check">';
            html += '<i class="ph-fill ph-check-circle"></i>';
            html += '</span>';
            if (teamLogo) {
                html += '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">';
            }
            html += '<span class="champ-team-card-name">' + teamName + '</span>';
            html += '</div>';
        });

        html += '</div></div>';
    });
    html += '</div>';

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
   Cinematic Sequence
========================================================= */

async function champRunCinematicDraw(drawRows, pots) {
    await champStagePreloader();
    if (champDrawState.skipRequested) return;

    await champStageIntro();
    if (champDrawState.skipRequested) return;

    await champStageTrophy();
    if (champDrawState.skipRequested) return;

    await champStagePotsEntry();
    if (champDrawState.skipRequested) return;

    champShowProgressBar();
    champShowSkipButton();

    const potGroups = {};
    drawRows.forEach(function(row) {
        if (!potGroups[row.pot_number]) potGroups[row.pot_number] = [];
        potGroups[row.pot_number].push(row);
    });

    for (let potNum = 1; potNum <= 5; potNum++) {
        if (champDrawState.skipRequested) break;

        const potRows = potGroups[potNum] || [];
        if (potRows.length === 0) continue;

        champDrawState.currentPot = potNum;
        champUpdateProgress(potNum);

        await champStagePotHighlight(potNum);

        for (let i = 0; i < potRows.length; i++) {
            if (champDrawState.skipRequested) break;
            await champStagePickTeam(potRows[i], potNum);
        }

        await champWait(300);
    }

    champHideSkipButton();
    await champStageFinale();
    champHideProgressBar();
}

/* =========================================================
   STAGE 0: Preloader
========================================================= */

async function champStagePreloader() {
    const preloader = document.getElementById('champPreloader');
    const fill = document.getElementById('champPreloaderFill');
    const status = document.getElementById('champPreloaderStatus');

    if (!preloader) return;

    const steps = [
        { pct: 25, text: 'جاري التحميل...' },
        { pct: 50, text: 'تحضير الفرق...' },
        { pct: 75, text: 'تجهيز القرعة...' },
        { pct: 100, text: 'جاهز!' }
    ];

    for (let i = 0; i < steps.length; i++) {
        if (champDrawState.skipRequested) break;

        await new Promise(function(resolve) {
            gsap.to(fill, {
                width: steps[i].pct + '%',
                duration: 0.5,
                ease: 'power2.out',
                onComplete: resolve
            });
            status.textContent = steps[i].text;
        });

        await champWait(200);
    }

    await champWait(400);

    await new Promise(function(resolve) {
        gsap.to(preloader, {
            opacity: 0,
            duration: 0.5,
            onComplete: function() {
                preloader.style.display = 'none';
                resolve();
            }
        });
    });

    const main = document.getElementById('champMainContent');
    if (main) {
        gsap.to(main, { opacity: 1, duration: 0.4 });
    }
}

/* =========================================================
   STAGE 1: Intro Cinematic
========================================================= */

async function champStageIntro() {
    const overlay = document.getElementById('champIntroOverlay');
    const textEl = document.getElementById('champIntroText');

    if (!overlay || !textEl) return;

    overlay.style.display = 'flex';

    textEl.innerHTML = '<div class="champ-intro-line">CHAMPIONS</div>';
    const line1 = textEl.querySelector('.champ-intro-line');
    gsap.set(line1, { opacity: 0, y: 120, scale: 0.5, filter: 'blur(30px)' });

    await new Promise(function(resolve) {
        gsap.to(line1, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 1.2,
            ease: 'power4.out',
            onComplete: resolve
        });
    });

    await champWait(700);

    await new Promise(function(resolve) {
        gsap.to(line1, {
            scale: 1.5,
            opacity: 0,
            filter: 'blur(40px)',
            duration: 0.35,
            ease: 'power2.in',
            onComplete: resolve
        });
    });

    textEl.innerHTML = '<div class="champ-intro-line champ-intro-cup">CUP</div>';
    const line2 = textEl.querySelector('.champ-intro-line');
    gsap.set(line2, { opacity: 0, scale: 2.5, filter: 'blur(60px)' });

    await new Promise(function(resolve) {
        gsap.to(line2, {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.9,
            ease: 'power3.out',
            onComplete: resolve
        });
    });

    await champWait(900);

    textEl.innerHTML = 
        '<div class="champ-intro-subline">FINALISSIMA</div>' +
        '<div class="champ-intro-year">2026</div>';
    const subline = textEl.querySelector('.champ-intro-subline');
    const year = textEl.querySelector('.champ-intro-year');

    gsap.set([subline, year], { opacity: 0, y: 20 });
    gsap.to(subline, { opacity: 1, y: 0, duration: 0.6, delay: 0.1 });
    gsap.to(year, { opacity: 1, y: 0, duration: 0.6, delay: 0.3 });

    await champWait(1400);

    await new Promise(function(resolve) {
        gsap.to(overlay, {
            opacity: 0,
            duration: 0.7,
            onComplete: function() {
                overlay.style.display = 'none';
                resolve();
            }
        });
    });
}

/* =========================================================
   STAGE 2: Trophy Reveal
========================================================= */

async function champStageTrophy() {
    const trophy = document.getElementById('champTrophy');
    const stage = document.getElementById('champTrophyStage');

    if (!trophy || !stage) return;

    gsap.set(stage, { opacity: 0, scale: 0.5 });
    gsap.set(trophy, { rotationY: 0, scale: 0.5, y: -100 });

    await new Promise(function(resolve) {
        gsap.to(stage, {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            onComplete: resolve
        });
    });

    await new Promise(function(resolve) {
        gsap.timeline({ onComplete: resolve })
            .to(trophy, {
                y: 0,
                scale: 1,
                duration: 0.9,
                ease: 'bounce.out'
            })
            .to(trophy, {
                rotationY: 360,
                duration: 1.2,
                ease: 'power2.inOut'
            }, '-=0.4');
    });

    champVibrate([30, 20, 30]);

    await champWait(600);

    gsap.to(stage, {
        scale: 1.05,
        duration: 0.6,
        yoyo: true,
        repeat: 2,
        ease: 'power2.inOut'
    });

    await champWait(1000);

    await new Promise(function(resolve) {
        gsap.to(stage, {
            opacity: 0,
            scale: 0.8,
            duration: 0.6,
            onComplete: function() {
                stage.style.display = 'none';
                resolve();
            }
        });
    });
}

/* =========================================================
   STAGE 3: Pots Entry
========================================================= */

async function champStagePotsEntry() {
    const potRows = document.querySelectorAll('.champ-pot-row');
    const header = document.getElementById('champDrawHeader');
    const potsStage = document.getElementById('champPotsStage');
    const groupsStage = document.getElementById('champGroupsStage');

    gsap.set(header, { opacity: 0, y: -30 });
    await new Promise(function(resolve) {
        gsap.to(header, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            onComplete: resolve
        });
    });

    await champWait(200);

    gsap.set(potsStage, { opacity: 0 });
    gsap.to(potsStage, { opacity: 1, duration: 0.4 });

    gsap.set(potRows, { opacity: 0, x: -80 });

    for (let i = 0; i < potRows.length; i++) {
        await new Promise(function(resolve) {
            gsap.to(potRows[i], {
                opacity: 1,
                x: 0,
                duration: 0.7,
                ease: 'power3.out',
                onComplete: resolve
            });
        });

        await champWait(120);
    }

    await champWait(400);

    const cards = document.querySelectorAll('.champ-team-card');
    gsap.set(cards, { opacity: 0, scale: 0.85 });

    await new Promise(function(resolve) {
        gsap.to(cards, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.04,
            ease: 'back.out(1.4)',
            onComplete: resolve
        });
    });

    await champWait(300);

    gsap.set(groupsStage, { opacity: 0, y: 30 });
    await new Promise(function(resolve) {
        gsap.to(groupsStage, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            onComplete: resolve
        });
    });

    await champWait(600);
}

/* =========================================================
   STAGE 4: Pot Highlight
========================================================= */

async function champStagePotHighlight(potNum) {
    const potRow = document.getElementById('champPotRow' + potNum);
    if (!potRow) return;

    const label = potRow.querySelector('.champ-pot-label');

    await new Promise(function(resolve) {
        gsap.timeline({ onComplete: resolve })
            .to(potRow, {
                boxShadow: '0 0 40px rgba(212,183,122,.6), inset 0 0 30px rgba(212,183,122,.15)',
                duration: 0.4,
                ease: 'power2.out'
            })
            .to(label, {
                scale: 1.15,
                color: '#F5E6D3',
                textShadow: '0 0 20px rgba(212,183,122,1)',
                duration: 0.3
            }, '-=0.3');
    });

    await champWait(400);
}

/* =========================================================
   STAGE 5: Pick Team
========================================================= */

async function champStagePickTeam(row, potNum) {
    const allPotCards = document.querySelectorAll(
        '.champ-team-card[data-pot="' + potNum + '"]:not(.selected)'
    );
    if (allPotCards.length === 0) return;

    const spotCount = allPotCards.length;
    const totalCycles = 3;

    for (let cycle = 0; cycle < totalCycles; cycle++) {
        for (let i = 0; i < spotCount; i++) {
            if (champDrawState.skipRequested) return;

            gsap.to(allPotCards, {
                borderColor: 'rgba(212,183,122,.5)',
                boxShadow: '0 0 0 rgba(212,183,122,0)',
                scale: 1,
                duration: 0.08
            });

            gsap.to(allPotCards[i], {
                borderColor: '#F5E6D3',
                boxShadow: '0 0 30px rgba(212,183,122,1), 0 0 60px rgba(212,183,122,.6), inset 0 0 20px rgba(212,183,122,.2)',
                scale: 1.04,
                duration: 0.12
            });

            champPlayTick();

            let waitTime = 120;

            if (cycle === 0) {
                waitTime = 220 - (i * 15);
                if (waitTime < 80) waitTime = 80;
            } else if (cycle === totalCycles - 1) {
                waitTime = 80 + (i * 15);
                if (waitTime > 220) waitTime = 220;
            }

            await champWait(waitTime);
        }
    }

    for (let i = 0; i < spotCount; i++) {
        if (champDrawState.skipRequested) return;

        gsap.to(allPotCards, {
            borderColor: 'rgba(212,183,122,.5)',
            boxShadow: '0 0 0 rgba(212,183,122,0)',
            scale: 1,
            duration: 0.1
        });

        gsap.to(allPotCards[i], {
            borderColor: '#F5E6D3',
            boxShadow: '0 0 35px rgba(212,183,122,1), 0 0 70px rgba(212,183,122,.7), inset 0 0 25px rgba(212,183,122,.25)',
            scale: 1.05,
            duration: 0.15
        });

        champPlayTick();

        await champWait(250);
    }

    const targetCard = document.querySelector(
        '.champ-team-card[data-team="' + row.team + '"]'
    );
    if (!targetCard) return;

    gsap.to(allPotCards, {
        borderColor: 'rgba(212,183,122,.3)',
        boxShadow: '0 0 0 rgba(212,183,122,0)',
        scale: 1,
        duration: 0.2
    });

    await champWait(200);

    gsap.to(targetCard, {
        borderColor: '#F5E6D3',
        boxShadow: '0 0 50px rgba(212,183,122,1), 0 0 100px rgba(212,183,122,.8), inset 0 0 30px rgba(212,183,122,.3)',
        scale: 1.1,
        duration: 0.4,
        ease: 'power2.out'
    });

    champVibrate([20, 10, 20]);

    await champWait(600);

    champFlashScreen();

    await champWait(300);

    const teamName = champGetTeamName(row.team);
    const teamLogo = champGetTeamLogo(row.team);

    const cardRect = targetCard.getBoundingClientRect();
    const groupTarget = document.getElementById('champGroupTarget' + row.group_name);
    const groupTeamsEl = document.getElementById('champGroupTeams' + row.group_name);

    if (!groupTarget || !groupTeamsEl) return;

    const groupRect = groupTarget.getBoundingClientRect();

    const startX = cardRect.left + cardRect.width / 2;
    const startY = cardRect.top + cardRect.height / 2;
    const endX = groupRect.left + groupRect.width / 2;
    const endY = groupRect.top + groupRect.height / 2;

    const flyer = document.createElement('div');
    flyer.className = 'champ-flyer';
    flyer.id = 'champFlyer';
    flyer.innerHTML =
        (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
        '<span>' + teamName + '</span>';

    flyer.style.position = 'fixed';
    flyer.style.left = '0';
    flyer.style.top = '0';
    flyer.style.zIndex = '2147483200';
    flyer.style.pointerEvents = 'none';
    flyer.style.transform = 'translate(' + (startX - 80) + 'px, ' + (startY - 35) + 'px) scale(0.2)';
    flyer.style.opacity = '0';

    document.body.appendChild(flyer);

    const cardImg = targetCard.querySelector('img');
    const cardName = targetCard.querySelector('.champ-team-card-name');

    if (cardImg) {
        gsap.to(cardImg, { opacity: 0.3, scale: 0.8, duration: 0.4 });
    }
    if (cardName) {
        gsap.to(cardName, { opacity: 0.3, duration: 0.4 });
    }

    await new Promise(function(resolve) {
        gsap.to(flyer, {
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: 'back.out(1.7)',
            onComplete: resolve
        });
    });

    await champWait(200);

    await champAnimateFlight(flyer, startX, startY, endX, endY, cardRect);

    flyer.remove();
    champVibrate([40, 20, 40]);

    champScreenShake();

    champSpawnShockwave(endX, endY, 0);
    champSpawnShockwave(endX, endY, 100);
    champSpawnShockwave(endX, endY, 200);

    champSpawnBurst(endX, endY, 40);

    gsap.timeline()
        .to(groupTarget, {
            scale: 1.18,
            boxShadow: '0 0 80px rgba(212,183,122,1), inset 0 0 40px rgba(212,183,122,.5)',
            borderColor: '#D4B77A',
            duration: 0.3,
            ease: 'power2.out'
        })
        .to(groupTarget, {
            scale: 1,
            duration: 0.7,
            ease: 'elastic.out(1, 0.4)'
        })
        .to(groupTarget, {
            boxShadow: '0 0 0 rgba(212,183,122,0)',
            borderColor: 'rgba(212,183,122,0.4)',
            duration: 0.5
        }, '-=0.4');

    const teamHtml =
        '<div class="champ-group-team-item">' +
            (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + teamName + '</span>' +
        '</div>';
    groupTeamsEl.insertAdjacentHTML('beforeend', teamHtml);

    const newTeam = groupTeamsEl.lastElementChild;
    gsap.fromTo(newTeam,
        { opacity: 0, scale: 0.4, y: -30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(2)' }
    );

    await new Promise(function(resolve) {
        gsap.to(targetCard, {
            background: 'rgba(20,10,12,.55)',
            borderColor: 'rgba(212,183,122,.15)',
            boxShadow: '0 0 0 rgba(212,183,122,0)',
            opacity: 0.45,
            scale: 1,
            duration: 0.5,
            onComplete: function() {
                targetCard.classList.add('selected');
                resolve();
            }
        });
    });

    if (cardImg) {
        gsap.to(cardImg, { filter: 'grayscale(0.7) brightness(0.6)', duration: 0.5 });
    }
    if (cardName) {
        gsap.to(cardName, { color: 'rgba(250,246,240,.3)', duration: 0.5 });
    }

    const checkEl = targetCard.querySelector('.champ-team-card-check');
    if (checkEl) {
        gsap.to(checkEl, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(2)'
        });

        setTimeout(function() {
            const checkI = checkEl.querySelector('i');
            if (checkI) {
                gsap.fromTo(checkI,
                    { filter: 'drop-shadow(0 0 0 rgba(212,183,122,0))' },
                    {
                        filter: 'drop-shadow(0 0 20px rgba(212,183,122,1))',
                        duration: 0.5,
                        yoyo: true,
                        repeat: 2
                    }
                );
            }
        }, 300);
    }

    await champWait(500);
}

/* =========================================================
   Flight Animation
========================================================= */

async function champAnimateFlight(flyer, startX, startY, endX, endY, cardRect) {
    return new Promise(function(resolve) {
        const duration = 1.6;
        const startTime = performance.now();
        const midX = (startX + endX) / 2;
        const midY = Math.min(startY, endY) - 220;

        let lastTrailTime = 0;
        let rotation = 0;

        function animate(now) {
            if (champDrawState.skipRequested) {
                flyer.style.transform = 'translate(' + (endX - 80) + 'px, ' + (endY - 35) + 'px) scale(1)';
                resolve();
                return;
            }

            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const mt = 1 - eased;
            let x = mt*mt*mt*startX
                  + 3*mt*mt*eased*midX
                  + 3*mt*eased*eased*midX
                  + eased*eased*eased*endX;

            let y = mt*mt*mt*startY
                  + 3*mt*mt*eased*midY
                  + 3*mt*eased*eased*midY
                  + eased*eased*eased*endY;

            const spiralStrength = Math.sin(eased * Math.PI) * 30;
            const spiralPhase = eased * Math.PI * 6;
            x += Math.cos(spiralPhase) * spiralStrength * 0.4;
            y += Math.sin(spiralPhase) * spiralStrength * 0.3;

            const scale = 1 + Math.sin(eased * Math.PI) * 0.5;
            rotation += 25;
            const brightness = 1.3 + Math.sin(eased * Math.PI * 3) * 0.4;

            flyer.style.transform =
                'translate(' + (x - 80) + 'px, ' + (y - 35) + 'px) ' +
                'rotate(' + rotation + 'deg) ' +
                'scale(' + scale + ')';

            flyer.style.filter = 'brightness(' + brightness + ') drop-shadow(0 0 20px rgba(212,183,122,.8))';

            if (now - lastTrailTime > 18) {
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
}

/* =========================================================
   Screen Shake
========================================================= */

function champScreenShake() {
    const screen = document.getElementById('champDrawScreen');
    if (!screen) return;

    const tl = gsap.timeline();

    for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * 12;
        const y = (Math.random() - 0.5) * 12;
        const rot = (Math.random() - 0.5) * 0.6;

        tl.to(screen, {
            x: x,
            y: y,
            rotation: rot,
            duration: 0.04
        });
    }

    tl.to(screen, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.15,
        ease: 'power2.out'
    });
}

function champFlashScreen() {
    const flash = document.createElement('div');
    flash.className = 'champ-screen-flash';
    document.body.appendChild(flash);

    gsap.fromTo(flash,
        { opacity: 0.85 },
        {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: function() {
                flash.remove();
            }
        }
    );
}

/* =========================================================
   Spawn Effects
========================================================= */

function champSpawnTrail(x, y) {
    const p = document.createElement('div');
    p.className = 'champ-trail-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';

    const hue = Math.random() * 20 + 30;
    p.style.filter = 'hue-rotate(' + hue + 'deg)';

    document.body.appendChild(p);

    gsap.fromTo(p,
        { opacity: 1, scale: 1.3 },
        {
            opacity: 0,
            scale: 0.1,
            duration: 0.7,
            ease: 'power2.out',
            onComplete: function() { p.remove(); }
        }
    );
}

function champSpawnShockwave(x, y, delay) {
    setTimeout(function() {
        const w = document.createElement('div');
        w.className = 'champ-shockwave';
        w.style.left = x + 'px';
        w.style.top = y + 'px';
        document.body.appendChild(w);

        gsap.fromTo(w,
            { opacity: 0.9, scale: 0 },
            {
                opacity: 0,
                scale: 5,
                duration: 1.1,
                ease: 'power2.out',
                onComplete: function() { w.remove(); }
            }
        );
    }, delay);
}

function champSpawnBurst(x, y, count) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'champ-burst-particle';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        document.body.appendChild(p);

        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const distance = 80 + Math.random() * 180;
        const duration = 0.9 + Math.random() * 0.6;

        gsap.fromTo(p,
            { opacity: 1, scale: 1, x: 0, y: 0 },
            {
                opacity: 0,
                scale: 0.2,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                duration: duration,
                ease: 'power2.out',
                onComplete: function() { p.remove(); }
            }
        );
    }
}

/* =========================================================
   STAGE 10: Finale
========================================================= */

async function champStageFinale() {
    champSpawnConfetti(120);
    champVibrate([100, 50, 100]);

    const titleEl = document.getElementById('champDrawTitle');
    if (titleEl) {
        await new Promise(function(resolve) {
            gsap.to(titleEl, {
                opacity: 0,
                y: -20,
                duration: 0.4,
                onComplete: resolve
            });
        });

        titleEl.textContent = 'اكتملت القرعة ✨';

        await new Promise(function(resolve) {
            gsap.fromTo(titleEl,
                { opacity: 0, y: 20, scale: 0.8 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.7,
                    ease: 'back.out(1.7)',
                    onComplete: resolve
                }
            );
        });
    }

    setTimeout(function() {
        if (titleEl) {
            gsap.fromTo(titleEl,
                { textShadow: '0 0 20px rgba(212,183,122,.6)' },
                {
                    textShadow: '0 0 40px rgba(212,183,122,1), 0 0 80px rgba(212,183,122,.6)',
                    duration: 0.6,
                    yoyo: true,
                    repeat: 3
                }
            );
        }
    }, 400);

    await champWait(800);

    champSpawnConfetti(80);
    await champWait(600);

    champSpawnConfetti(60);
    await champWait(1000);

    champShowDrawButtons();
}

/* =========================================================
   Draw Buttons
========================================================= */

function champShowDrawButtons() {
    if (!champIsAdmin()) return;

    const old = document.getElementById('champDrawActions');
    if (old) return;

    const groupsStage = document.getElementById('champGroupsStage');
    if (!groupsStage) return;

    const actions = document.createElement('div');
    actions.className = 'champ-draw-actions';
    actions.id = 'champDrawActions';

    actions.innerHTML =
        '<button class="champ-btn-save" id="champBtnSave" onclick="champSaveAndClose()">' +
            champXIcon('floppy-disk', 'fill') + ' <span>حفظ القرعة</span>' +
        '</button>' +
        '<button class="champ-btn-reset" id="champBtnReset" onclick="champResetFromDraw()">' +
            champXIcon('arrows-clockwise', 'bold') + ' <span>إعادة القرعة</span>' +
        '</button>';

    groupsStage.parentElement.appendChild(actions);

    gsap.fromTo(actions,
        { opacity: 0, y: 40, scale: 0.9 },
        {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: 'back.out(1.5)',
            delay: 0.2
        }
    );
}

/* =========================================================
   Save & Close
========================================================= */

async function champSaveAndClose() {
    if (!champIsAdmin()) return;

    const saveBtn = document.getElementById('champBtnSave');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = champXIcon('hourglass', 'bold') + ' <span>جاري الحفظ...</span>';
    }

    const drawRows = champData.pendingDraw || [];

    if (drawRows.length === 0) {
        if (typeof showToast === 'function') showToast('لا توجد قرعة للحفظ', false);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = champXIcon('floppy-disk', 'fill') + ' <span>حفظ القرعة</span>';
        }
        return;
    }

    try {
        await champSaveDraw(drawRows);
        champData.pendingDraw = null;

        const startGw = (typeof currentRound !== 'undefined' ? currentRound : 1) + 1;

        await saveChampionsMeta({
            started: true,
            start_gw: startGw,
            current_stage: 'groups',
            current_round: 1
        });

        if (typeof showToast === 'function') {
            showToast('تم حفظ القرعة — بدأ دور المجموعات', true, 3000);
        }

        const screen = document.getElementById('champDrawScreen');
        if (screen) {
            gsap.to(screen, {
                opacity: 0,
                duration: 0.5,
                onComplete: function() {
                    screen.remove();
                    champLoaded = false;
                    loadChampions();
                }
            });
        }

    } catch (err) {
        console.error('[Champ] Save error:', err);
        if (typeof showToast === 'function') showToast('فشل الحفظ', false);

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = champXIcon('floppy-disk', 'fill') + ' <span>حفظ القرعة</span>';
        }
    }
}

function champResetFromDraw() {
    if (!champIsAdmin()) return;

    if (!confirm('هل أنت متأكد؟ سيتم حذف القرعة الحالية والبدء من جديد.')) return;

    const screen = document.getElementById('champDrawScreen');
    if (screen) {
        gsap.to(screen, {
            opacity: 0,
            duration: 0.4,
            onComplete: function() {
                screen.remove();
                champData.pendingDraw = null;
                champHideSkipButton();
                champHideProgressBar();

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
   Confetti
========================================================= */

function champSpawnConfetti(count) {
    const colors = [
        '#D4B77A',
        '#F5E6D3',
        '#8B1A2F',
        '#4A0A15',
        '#FAF6F0',
        '#E5D4A5'
    ];

    for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'champ-confetti';

        c.style.left = Math.random() * 100 + '%';
        c.style.top = '-20px';
        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        const size = 6 + Math.random() * 10;
        c.style.width = size + 'px';
        c.style.height = size + 'px';

        if (Math.random() > 0.6) {
            c.style.borderRadius = '50%';
        } else if (Math.random() > 0.5) {
            c.style.borderRadius = '2px';
            c.style.width = (size * 0.5) + 'px';
            c.style.height = (size * 1.5) + 'px';
        } else {
            c.style.borderRadius = '50% 0 50% 0';
        }

        c.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';

        document.body.appendChild(c);

        const duration = 3 + Math.random() * 2.5;
        const xDrift = (Math.random() - 0.5) * 300;
        const rotationEnd = Math.random() * 1440 - 720;

        gsap.to(c, {
            y: window.innerHeight + 60,
            x: xDrift,
            rotation: rotationEnd,
            opacity: 0.3,
            duration: duration,
            delay: Math.random() * 1.5,
            ease: 'power1.in',
            onComplete: function() {
                c.remove();
            }
        });

        if (Math.random() > 0.7) {
            gsap.fromTo(c,
                { scale: 0 },
                {
                    scale: 1,
                    duration: 0.3,
                    ease: 'back.out(2)'
                }
            );
        }
    }
}

/* =========================================================
   Cleanup
========================================================= */

function champCleanup() {
    const elementsToRemove = [
        'champSkipBtn',
        'champProgressBar',
        'champFlyer'
    ];

    elementsToRemove.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    document.querySelectorAll('.champ-trail-particle, .champ-shockwave, .champ-burst-particle, .champ-confetti, .champ-screen-flash, .champ-flash').forEach(function(el) {
        el.remove();
    });

    champDrawState.playing = false;
    champDrawState.skipRequested = false;
    champDrawState.currentPot = 0;
}

window.champCleanup = champCleanup;

/* =========================================================
   Safety Timeout
========================================================= */

function champStartSafetyTimeout() {
    setTimeout(function() {
        if (champDrawState.playing) {
            console.warn('[Champ] Safety timeout');
            champCleanup();
            if (typeof showToast === 'function') {
                showToast('انتهى الوقت المسموح', false, 3000);
            }
        }
    }, 8 * 60 * 1000);
}

/* =========================================================
   Main Entry Override
========================================================= */

const champPerformDrawOld = champPerformDraw;

window.champPerformDraw = function() {
    champStartSafetyTimeout();
    champPerformDrawOld();
};

/* =========================================================
   Window Exports
========================================================= */

window.champIsAdmin = champIsAdmin;
window.champInitAudio = champInitAudio;
window.champPlayWhoosh = champPlayWhoosh;
window.champPlayChime = champPlayChime;
window.champPlayImpact = champPlayImpact;
window.champPlayCheer = champPlayCheer;
window.champPlaySuccess = champPlaySuccess;
window.champSpawnConfetti = champSpawnConfetti;

/* =========================================================
   Init Log
========================================================= */

console.log('[Champions Draw] v=7 loaded');
