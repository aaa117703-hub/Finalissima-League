/* =========================================================
   champions-draw.js — FINALISSIMA LEAGUE CHAT (v=1)
   الأنيميشن السينمائي كامل (مستقل)
   يحتاج: champions.js (يبقى قبل هذا الملف)
========================================================= */

/* =========================================================
   Helpers (تستخدم window.X — عشان ما تصير تعارضات)
========================================================= */

function champPerformDraw() {
    if (typeof gsap === 'undefined') {
        if (typeof showToast === 'function') showToast('GSAP not loaded', false);
        return;
    }

    /* ⭐ reset flag — عشان ما يعلق */
    if (champDrawAnimating) {
        console.warn('[Champions] Resetting animating flag');
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

        await champRunCinematicDraw(drawRows, pots);

    } catch (err) {
        console.error('[Champions] Draw error:', err);
        if (typeof showToast === 'function') showToast('فشل الأنيميشن: ' + err.message, false, 4000);
    } finally {
        champDrawAnimating = false;
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

    /* Title */
    html += '<div class="champ-draw-header" id="champDrawHeader">';
    html += '<div class="champ-draw-title" id="champDrawTitle">قرعة كأس أبطال الفيناليغ</div>';
    html += '</div>';

    /* Banner + Cards */
    html += '<div class="champ-banner-stage" id="champBannerStage">';

    /* Original Banner */
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

    /* ⭐ المشهد 3: القلب */
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

window.champPerformDraw = champPerformDraw;
/* =========================================================
   Distribute One Team — UEFA Trail
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

    /* ⭐ الطيران */
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

    /* ⭐ إضافة الفريق */
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

    teamSlots.forEach(function(el) { el.innerHTML = ''; });

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

        /* ⭐ نفعّل البطولة تلقائياً */
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
   Window Exports — للاستخدام الخارجي
========================================================= */

window.champPerformDraw = champPerformDraw;
window.champSaveAndClose = champSaveAndClose;
window.champResetFromDraw = champResetFromDraw;
window.champBuildDrawScreen = champBuildDrawScreen;
window.champRunCinematicDraw = champRunCinematicDraw;

console.log('[Champions Draw] v=1 loaded ✅');
