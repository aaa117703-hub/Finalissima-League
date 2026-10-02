/* =========================================================
   champions-draw.js — FINALISSIMA LEAGUE CHAT (v=2)
   الأسطوري: 8 مشاهد + Waves + Roulette + Effects
========================================================= */

/* =========================================================
   Helpers
========================================================= */

function champPerformDraw() {
    if (typeof gsap === 'undefined') {
        if (typeof showToast === 'function') showToast('GSAP not loaded', false);
        return;
    }

    if (champDrawAnimating) {
        console.warn('[Champions] Resetting flag');
        champDrawAnimating = false;
    }

    champPerformDrawAsync();
}

async function champPerformDrawAsync() {
    champDrawAnimating = true;

    try {
        const pots = await buildPots();
        if (!pots) {
            champDrawAnimating = false;
            if (typeof showToast === 'function') showToast('Failed to build pots', false);
            return;
        }

        const drawRows = champGenerateRandomDraw(pots);
        champData.pendingDraw = drawRows;

        champBuildDrawScreen();
        champSpawnFloatingParticles(25);

        await champRunCinematicDraw(drawRows, pots);

    } catch (err) {
        console.error('[Champions] Draw error:', err);
        if (typeof showToast === 'function') showToast('فشل: ' + err.message, false, 4000);
    } finally {
        champDrawAnimating = false;
    }
}

function champSpawnFloatingParticles(count) {
    const container = document.getElementById('champParticlesBg');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'champ-particle-bg';
        p.style.left = Math.random() * 100 + '%';
        p.style.bottom = '-10px';
        p.style.animationDuration = (15 + Math.random() * 20) + 's';
        p.style.animationDelay = (Math.random() * 15) + 's';
        p.style.opacity = 0.3 + Math.random() * 0.7;
        container.appendChild(p);
    }
}

/* =========================================================
   Build Draw Screen
========================================================= */

function champBuildDrawScreen() {
    const old = document.getElementById('champDrawScreen');
    if (old) old.remove();

    const screen = document.createElement('div');
    screen.className = 'champions-draw-screen';
    screen.id = 'champDrawScreen';

    let html = '';

    /* ⭐ الخلفية */
    html += '<div class="champ-bg-waves">';
    html += '<div class="champ-wave wave-1"></div>';
    html += '<div class="champ-wave wave-2"></div>';
    html += '<div class="champ-wave wave-3"></div>';
    html += '<div class="champ-wave wave-4"></div>';
    html += '</div>';

    html += '<div class="champ-bg-pattern"></div>';
    html += '<div class="champ-bg-glow"></div>';
    html += '<div class="champ-particles-bg" id="champParticlesBg"></div>';

    /* Intro */
    html += '<div class="champ-intro" id="champIntro" style="display:none;">';
    html += '<div class="champ-intro-text" id="champIntroText"></div>';
    html += '</div>';

    /* Title */
    html += '<div class="champ-draw-header" id="champDrawHeader">';
    html += '<div class="champ-draw-title" id="champDrawTitle">قرعة كأس أبطال الفيناليغ</div>';
    html += '</div>';

    /* Banner + Cards */
    html += '<div class="champ-banner-stage" id="champBannerStage">';

    html += '<div class="champ-banner-original" id="champBannerOriginal">';
    html += '<img src="./banner-fina.png" alt="Champions Cup">';
    html += '</div>';

    /* Cards */
    html += '<div class="champ-cards-stage" id="champCardsStage" style="display:none;">';
    for (let i = 0; i < 4; i++) {
        const bgPos = (i * 33.33) + '% 0%';

        html += '<div class="champ-card" id="champCard' + i + '" data-index="' + i + '">';
        html += '<div class="champ-card-inner">';

        html += '<div class="champ-card-front" ';
        html += 'style="background-image:url(./banner-fina.png);';
        html += 'background-size:400% 100%;';
        html += 'background-position:' + bgPos + ';';
        html += 'background-repeat:no-repeat;"></div>';

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
   Cinematic Sequence
========================================================= */

async function champRunCinematicDraw(drawRows, pots) {
    const banner = document.getElementById('champBannerOriginal');
    const cardsStage = document.getElementById('champCardsStage');
    const cardInners = document.querySelectorAll('.champ-card-inner');
    const cards = document.querySelectorAll('.champ-card');
    const header = document.getElementById('champDrawHeader');
    const intro = document.getElementById('champIntro');
    const introText = document.getElementById('champIntroText');

    /* ═══ المشهد 1: Intro ═══ */

    gsap.set(header, { opacity: 0 });
    gsap.set(banner, { opacity: 0, scale: 0.7 });
    gsap.set(intro, { display: 'flex', opacity: 1 });

    introText.innerHTML = '<div class="champ-intro-line">CHAMPIONS</div>';
    const line1 = introText.querySelector('.champ-intro-line');
    gsap.set(line1, { opacity: 0, y: 100, scale: 0.6, filter: 'blur(30px)' });

    await new Promise(function(resolve) {
        gsap.to(line1, {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
            duration: 1.5, ease: 'power4.out',
            onComplete: resolve
        });
    });

    await champWait(600);

    gsap.to(line1, {
        scale: 1.6, opacity: 0, filter: 'blur(40px)',
        duration: 0.4, ease: 'power2.in'
    });

    await champWait(200);

    introText.innerHTML = '<div class="champ-intro-line champ-intro-cup">CUP</div>';
    const line2 = introText.querySelector('.champ-intro-line');
    gsap.set(line2, { opacity: 0, scale: 2.5, filter: 'blur(50px)' });

    await new Promise(function(resolve) {
        gsap.to(line2, {
            opacity: 1, scale: 1, filter: 'blur(0px)',
            duration: 0.9, ease: 'power3.out',
            onComplete: resolve
        });
    });

    await champWait(700);

    await new Promise(function(resolve) {
        gsap.to(intro, {
            opacity: 0,
            duration: 0.6,
            onComplete: function() {
                intro.style.display = 'none';
                resolve();
            }
        });
    });

    /* ═══ المشهد 2: Banner Entry ═══ */

    gsap.set(header, { opacity: 1 });
    gsap.set(banner, { opacity: 0, scale: 0.7, y: -50 });

    await new Promise(function(resolve) {
        gsap.timeline({ onComplete: resolve })
            .to(banner, {
                opacity: 1, scale: 1, y: 0,
                duration: 1.4, ease: 'elastic.out(1, 0.6)'
            })
            .to(banner, {
                boxShadow: '0 20px 80px rgba(212,183,122,.8), 0 0 100px rgba(139,26,47,.6), inset 0 0 40px rgba(212,183,122,.3)',
                duration: 0.6
            }, '-=0.4')
            .to(banner, {
                boxShadow: '0 20px 80px rgba(212,183,122,.5), 0 0 60px rgba(139,26,47,.4), inset 0 0 40px rgba(212,183,122,.2)',
                duration: 0.8
            });
    });

    await champWait(800);

    /* ═══ المشهد 3: Split ═══ */

    await new Promise(function(resolve) {
        gsap.to(banner, {
            opacity: 0,
            scale: 0.9,
            filter: 'blur(20px)',
            duration: 0.5,
            onComplete: function() {
                banner.style.display = 'none';
                cardsStage.style.display = 'flex';
                resolve();
            }
        });
    });

    gsap.set(cards, { opacity: 0, scale: 0.7, y: 60, rotationY: 0 });

    await new Promise(function(resolve) {
        gsap.to(cards, {
            opacity: 1, scale: 1, y: 0,
            duration: 0.9,
            stagger: 0.15,
            ease: 'back.out(1.7)',
            onComplete: resolve
        });
    });

    await champWait(700);

    /* ═══ المشهد 4: Flip ═══ */

    await new Promise(function(resolve) {
        gsap.to(cardInners, {
            rotationY: 180,
            duration: 1.3,
            stagger: 0.15,
            ease: 'power2.inOut',
            onComplete: resolve
        });
    });

    await champWait(700);

    /* ═══ المشهد 5-7: كل Pot ═══ */

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

        if (potNum < 5) {
            await champResetCardsForNextPot();
        }

        await champWait(500);
    }

    /* ═══ المشهد 8: Finale ═══ */

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
   Distribute One Team
========================================================= */

async function champDistributeTeam(row, slotIndex) {
    const card = document.getElementById('champCard' + slotIndex);
    const groupTarget = document.getElementById('champGroupTarget' + row.group_name);
    const groupTeamsEl = document.getElementById('champGroupTeams' + row.group_name);

    if (!card || !groupTarget || !groupTeamsEl) return;

    const allCards = document.querySelectorAll('.champ-card');

    /* ⭐ Spotlight */
    for (let cycle = 0; cycle < 3; cycle++) {
        for (let c = 0; c < 4; c++) {
            gsap.to(allCards, { boxShadow: 'none', scale: 1, duration: 0.1 });
            gsap.to(allCards[c], {
                boxShadow: '0 0 50px rgba(212,183,122,1), 0 0 100px rgba(139,26,47,.6)',
                scale: 1.08,
                duration: 0.13
            });
            await champWait(110);
        }
    }

    gsap.to(allCards, { boxShadow: 'none', scale: 1, duration: 0.2 });
    gsap.to(card, {
        boxShadow: '0 0 80px rgba(212,183,122,1), 0 0 160px rgba(139,26,47,.7)',
        scale: 1.2,
        duration: 0.35,
        ease: 'power2.out'
    });

    await champWait(600);

    /* ⭐ Crack + Flash + Burst */
    champFlash();
    champSpawnBurst(card, 30);
    champSpawnRings(card, 2);

    await champWait(250);

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
    led.style.transform = 'translate(' + (startX - 65) + 'px, ' + (startY - 35) + 'px) scale(0.2)';
    led.style.opacity = '0';
    document.body.appendChild(led);

    const cardTeam = card.querySelector('.champ-card-back-team');
    if (cardTeam) {
        gsap.to(cardTeam, {
            opacity: 0,
            scale: 0.3,
            duration: 0.4
        });
    }

    /* ظهور LED */
    await new Promise(function(resolve) {
        gsap.to(led, {
            opacity: 1, scale: 1,
            duration: 0.6, ease: 'back.out(2)',
            onComplete: resolve
        });
    });

    await champWait(350);

    /* ⭐ الطيران الحلزوني */
    await new Promise(function(resolve) {
        const duration = 1.8;
        const startTime = performance.now();
        const midX = (startX + endX) / 2;
        const midY = Math.min(startY, endY) - 200;

        let lastTrailTime = 0;

        function animate(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const mt = 1 - eased;
            let x = mt*mt*mt*startX + 3*mt*mt*eased*midX + 3*mt*eased*eased*midX + eased*eased*eased*endX;
            let y = mt*mt*mt*startY + 3*mt*mt*eased*midY + 3*mt*eased*eased*midY + eased*eased*eased*endY;

            /* ⭐ حلزوني */
            const spiral = Math.sin(eased * Math.PI * 6) * 25 * (1 - eased);
            x += spiral;
            y += spiral * 0.5;

            const sc = 1 + Math.sin(eased * Math.PI) * 0.5;
            const rot = eased * 1080;

            led.style.transform =
                'translate(' + (x - 65) + 'px, ' + (y - 35) + 'px) ' +
                'rotate(' + rot + 'deg) scale(' + sc + ')';
            led.style.filter = 'brightness(' + (1.5 + Math.sin(eased * Math.PI * 3) * 0.5) + ')';

            if (now - lastTrailTime > 20) {
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
    champSpawnShockwave(endX, endY, 'shockwave-2');
    setTimeout(function() { champSpawnShockwave(endX, endY); }, 100);
    champSpawnLightning(endX, endY);

    /* نبض */
    gsap.timeline()
        .to(groupTarget, {
            scale: 1.2,
            boxShadow: '0 0 80px rgba(212,183,122,1), inset 0 0 50px rgba(212,183,122,0.5)',
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
            borderColor: 'rgba(212,183,122,0.5)',
            duration: 0.5
        }, '-=0.4');

    /* إضافة الفريق */
    const teamHtml =
        '<div class="champ-group-team-item">' +
            (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + teamName + '</span>' +
        '</div>';
    groupTeamsEl.insertAdjacentHTML('beforeend', teamHtml);

    const newTeam = groupTeamsEl.lastElementChild;
    gsap.fromTo(newTeam,
        { opacity: 0, scale: 0.3, y: -30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(2)' }
    );

    gsap.to(card, {
        boxShadow: 'none', scale: 1,
        duration: 0.4
    });

    if (cardTeam) {
        gsap.to(cardTeam, {
            opacity: 1, scale: 1,
            duration: 0.3
        });
    }

    await champWait(500);
}

/* =========================================================
   Reset Cards
========================================================= */

async function champResetCardsForNextPot() {
    const cardInners = document.querySelectorAll('.champ-card-inner');
    const teamSlots = document.querySelectorAll('.champ-card-back-team');

    teamSlots.forEach(function(el) { el.innerHTML = ''; });

    await new Promise(function(resolve) {
        gsap.to(cardInners, {
            rotationY: 0, duration: 0.8, stagger: 0.1,
            ease: 'power2.inOut', onComplete: resolve
        });
    });

    await champWait(400);

    await new Promise(function(resolve) {
        gsap.to(cardInners, {
            rotationY: 180, duration: 0.8, stagger: 0.1,
            ease: 'power2.inOut', onComplete: resolve
        });
    });

    await champWait(300);
}

/* =========================================================
   Finale
========================================================= */

async function champFinale() {
    champSpawnConfetti(150);
    champSpawnConfetti(100);

    const titleEl = document.getElementById('champDrawTitle');
    if (titleEl) {
        gsap.to(titleEl, {
            opacity: 0, y: -20,
            duration: 0.4,
            onComplete: function() {
                titleEl.textContent = 'اكتملت القرعة';
                gsap.to(titleEl, { opacity: 1, y: 0, duration: 0.8 });
            }
        });
    }

    await champWait(1500);
    champShowDrawButtons();
}

/* =========================================================
   Draw Buttons
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

/* =========================================================
   Save + Reset
========================================================= */

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
    }

    const screen = document.getElementById('champDrawScreen');
    if (screen) {
        gsap.to(screen, {
            opacity: 0, duration: 0.5,
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
            opacity: 0, duration: 0.4,
            onComplete: function() {
                screen.remove();
                champData.pendingDraw = null;
                setTimeout(function() { champPerformDraw(); }, 300);
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

    const hue = Math.random() * 30 + 30;
    p.style.filter = 'hue-rotate(' + hue + 'deg)';

    gsap.fromTo(p,
        { opacity: 1, scale: 1.2 },
        { opacity: 0, scale: 0.2, duration: 0.7,
          onComplete: function() { p.remove(); } }
    );
}

function champSpawnShockwave(x, y, extraClass) {
    const w = document.createElement('div');
    w.className = 'champ-shockwave' + (extraClass ? ' ' + extraClass : '');
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    document.body.appendChild(w);

    gsap.fromTo(w,
        { opacity: 0.9, scale: 0 },
        { opacity: 0, scale: 4.5, duration: 1,
          onComplete: function() { w.remove(); } }
    );
}

function champSpawnBurst(source, count) {
    const rect = source.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'champ-burst';
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        document.body.appendChild(p);

        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const distance = 100 + Math.random() * 200;

        gsap.fromTo(p,
            { opacity: 1, scale: 1, x: 0, y: 0 },
            {
                opacity: 0, scale: 0.3,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                duration: 1 + Math.random() * 0.5,
                ease: 'power2.out',
                onComplete: function() { p.remove(); }
            }
        );
    }
}

function champSpawnRings(source, count) {
    const rect = source.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
        setTimeout(function() {
            const r = document.createElement('div');
            r.className = 'champ-ring';
            r.style.left = cx + 'px';
            r.style.top = cy + 'px';
            document.body.appendChild(r);

            gsap.fromTo(r,
                { opacity: 0.9, scale: 0.3 },
                { opacity: 0, scale: 2.5, duration: 0.9,
                  onComplete: function() { r.remove(); } }
            );
        }, i * 100);
    }
}

function champSpawnLightning(x, y) {
    const l = document.createElement('div');
    l.className = 'champ-lightning';
    l.style.left = x + 'px';
    l.style.top = (y - 200) + 'px';
    l.style.width = '3px';
    l.style.height = '200px';
    document.body.appendChild(l);

    gsap.fromTo(l,
        { opacity: 1, scaleY: 0 },
        { opacity: 0, scaleY: 1, duration: 0.4,
          onComplete: function() { l.remove(); } }
    );
}

function champFlash() {
    const f = document.createElement('div');
    f.className = 'champ-flash';
    document.body.appendChild(f);

    gsap.fromTo(f,
        { opacity: 0.8 },
        { opacity: 0, duration: 0.5,
          onComplete: function() { f.remove(); } }
    );
}

function champSpawnConfetti(count) {
    const colors = ['#D4B77A', '#8B1A2F', '#FAF6F0', '#4A0A15', '#E5D4A5'];
    for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'champ-confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.top = '-20px';
        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        c.style.width = (6 + Math.random() * 10) + 'px';
        c.style.height = (6 + Math.random() * 10) + 'px';
        c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(c);

        gsap.to(c, {
            y: window.innerHeight + 60,
            x: (Math.random() - 0.5) * 300,
            rotation: Math.random() * 1080 - 540,
            opacity: 0,
            duration: 4 + Math.random() * 3,
            delay: Math.random() * 2,
            ease: 'power1.in',
            onComplete: function() { c.remove(); }
        });
    }
}

/* =========================================================
   Window Exports
========================================================= */

window.champPerformDraw = champPerformDraw;
window.champSaveAndClose = champSaveAndClose;
window.champResetFromDraw = champResetFromDraw;
window.champBuildDrawScreen = champBuildDrawScreen;
window.champRunCinematicDraw = champRunCinematicDraw;

console.log('[Champions Draw] v=2 الأسطوري loaded ✅');
