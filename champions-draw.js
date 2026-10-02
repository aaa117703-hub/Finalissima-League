/* =========================================================
   champions-draw.js — FINALISSIMA LEAGUE CHAT (v=4)
   ✨ Pots أفقي + مجموعات عمودية
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

        champBuildDrawScreen(pots);

        await champRunCinematicDraw(drawRows, pots);

    } catch (err) {
        console.error('[Champions] Draw error:', err);
        if (typeof showToast === 'function') showToast('فشل: ' + err.message, false, 4000);
    } finally {
        champDrawAnimating = false;
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

    /* Title */
    html += '<div class="champ-draw-header" id="champDrawHeader">';
    html += '<div class="champ-draw-title" id="champDrawTitle">قرعة كأس أبطال الفيناليغ</div>';
    html += '</div>';

    /* Pots */
    html += '<div class="champ-pots-stage" id="champPotsStage">';

    pots.forEach(function(potTeams, potIdx) {
        const potNum = potIdx + 1;

        html += '<div class="champ-pot-row" data-pot="' + potNum + '">';
        html += '<div class="champ-pot-label">POT ' + potNum + '</div>';
        html += '<div class="champ-pot-teams">';

        potTeams.forEach(function(teamCode) {
            const teamName = champGetTeamName(teamCode);
            const teamLogo = champGetTeamLogo(teamCode);

            html += '<div class="champ-team-card" data-team="' + teamCode + '" data-pot="' + potNum + '">';
            if (teamLogo) {
                html += '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">';
            }
            html += '<span class="champ-team-card-name">' + teamName + '</span>';
            html += '<span class="champ-team-card-check"><i class="ph-fill ph-check-circle"></i></span>';
            html += '</div>';
        });

        html += '</div></div>';
    });

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

    screen.innerHTML = html;
    document.body.appendChild(screen);
}

/* =========================================================
   Cinematic Sequence
========================================================= */

async function champRunCinematicDraw(drawRows, pots) {
    const header = document.getElementById('champDrawHeader');
    const potRows = document.querySelectorAll('.champ-pot-row');
    const teamCards = document.querySelectorAll('.champ-team-card');

    /* ⭐ المشهد 1: ظهور العنوان + البطاقات */
    gsap.set(header, { opacity: 0, y: -20 });
    gsap.set(potRows, { opacity: 0, y: 30 });
    gsap.set(teamCards, { opacity: 0, scale: 0.85 });

    await new Promise(function(resolve) {
        gsap.timeline({ onComplete: resolve })
            .to(header, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
            .to(potRows, {
                opacity: 1, y: 0,
                duration: 0.7,
                stagger: 0.15,
                ease: 'power3.out'
            }, '-=0.4')
            .to(teamCards, {
                opacity: 1, scale: 1,
                duration: 0.5,
                stagger: 0.03,
                ease: 'back.out(1.4)'
            }, '-=0.3');
    });

    await champWait(800);

    /* ⭐ المشهد 2: كل Pot */
    const potGroups = {};
    drawRows.forEach(function(row) {
        if (!potGroups[row.pot_number]) potGroups[row.pot_number] = [];
        potGroups[row.pot_number].push(row);
    });

    for (let potNum = 1; potNum <= 5; potNum++) {
        const potRows = potGroups[potNum] || [];
        if (potRows.length === 0) continue;

        /* ⭐ توزيع منتخبات هذا Pot */
        for (let i = 0; i < potRows.length; i++) {
            await champPickTeam(potRows[i], potNum);
        }

        await champWait(400);
    }

    /* ⭐ المشهد 3: النهاية */
    await champFinale();
}

/* =========================================================
   Pick Team — spotlight + اختيار
========================================================= */

async function champPickTeam(row, potNum) {
    /* ⭐ كل بطاقات Pot الحالي */
    const allPotCards = document.querySelectorAll('.champ-team-card[data-pot="' + potNum + '"]:not(.selected)');
    if (allPotCards.length === 0) return;

    /* ⭐ 1. Spotlight — بطيء → سريع → بطيء */
    const totalCycles = 2;
    const spotCount = allPotCards.length;

    for (let cycle = 0; cycle < totalCycles; cycle++) {
        for (let i = 0; i < spotCount; i++) {
            /* إطفاء كل */
            gsap.to(allPotCards, {
                borderColor: '#D4B77A',
                boxShadow: '0 0 0 rgba(212,183,122,0)',
                scale: 1,
                duration: 0.1
            });

            /* إضاءة الحالي */
            gsap.to(allPotCards[i], {
                borderColor: '#F5E6D3',
                boxShadow: '0 0 30px rgba(212,183,122,1), 0 0 60px rgba(212,183,122,.6), inset 0 0 20px rgba(212,183,122,.2)',
                scale: 1.03,
                duration: 0.15
            });

            /* ⭐ سرعة متغيرة: بطيء في البداية، سريع في النص، بطيء في النهاية */
            let waitTime = 120;
            if (cycle === 0 && i === 0) waitTime = 250;
            else if (cycle === totalCycles - 1 && i === spotCount - 1) waitTime = 250;

            await champWait(waitTime);
        }
    }

    /* ⭐ 2. البحث عن البطاقة المستهدفة */
    const targetCard = document.querySelector('.champ-team-card[data-team="' + row.team + '"]');
    if (!targetCard) return;

    /* ⭐ إطفاء الجميع */
    gsap.to(allPotCards, {
        borderColor: '#D4B77A',
        boxShadow: '0 0 0 rgba(212,183,122,0)',
        scale: 1,
        duration: 0.2
    });

    /* ⭐ إضاءة المستهدف */
    gsap.to(targetCard, {
        borderColor: '#F5E6D3',
        boxShadow: '0 0 40px rgba(212,183,122,1), 0 0 80px rgba(212,183,122,.7), inset 0 0 25px rgba(212,183,122,.3)',
        scale: 1.08,
        duration: 0.35,
        ease: 'power2.out'
    });

    await champWait(500);

    /* ⭐ 3. Flash */
    champFlash();

    await champWait(200);

    /* ⭐ 4. الحصول على الإحداثيات */
    const cardRect = targetCard.getBoundingClientRect();
    const groupTarget = document.getElementById('champGroupTarget' + row.group_name);
    const groupTeamsEl = document.getElementById('champGroupTeams' + row.group_name);

    if (!groupTarget || !groupTeamsEl) return;

    const groupRect = groupTarget.getBoundingClientRect();

    const teamName = champGetTeamName(row.team);
    const teamLogo = champGetTeamLogo(row.team);

    const startX = cardRect.left + cardRect.width / 2;
    const startY = cardRect.top + cardRect.height / 2;
    const endX = groupRect.left + groupRect.width / 2;
    const endY = groupRect.top + groupRect.height / 2;

    /* ⭐ 5. LED */
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
    led.style.transform = 'translate(' + (startX - 65) + 'px, ' + (startY - 35) + 'px) scale(0.3)';
    led.style.opacity = '0';
    led.style.display = 'flex';
    led.style.flexDirection = 'column';
    led.style.alignItems = 'center';
    led.style.gap = '6px';
    led.style.padding = '12px 18px';
    led.style.background = 'linear-gradient(135deg, #8B1A2F 0%, #4A0A15 100%)';
    led.style.border = '3px solid #D4B77A';
    led.style.borderRadius = '18px';
    led.style.boxShadow = '0 0 50px rgba(212,183,122,.9), 0 15px 40px rgba(0,0,0,.8)';
    document.body.appendChild(led);

    led.querySelector('img').style.width = '40px';
    led.querySelector('img').style.height = '40px';
    led.querySelector('img').style.objectFit = 'contain';

    led.querySelector('span').style.fontSize = '12px';
    led.querySelector('span').style.fontWeight = '900';
    led.querySelector('span').style.color = '#FAF6F0';
    led.querySelector('span').style.textTransform = 'uppercase';
    led.querySelector('span').style.textShadow = '0 2px 6px rgba(0,0,0,.8)';
    led.querySelector('span').style.whiteSpace = 'nowrap';

    await new Promise(function(resolve) {
        gsap.to(led, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(1.5)',
            onComplete: resolve
        });
    });

    await champWait(250);

    /* ⭐ 6. الطيران — قوس Bezier */
    await new Promise(function(resolve) {
        const duration = 1.4;
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
            const x = mt*mt*mt*startX + 3*mt*mt*eased*midX + 3*mt*eased*eased*midX + eased*eased*eased*endX;
            const y = mt*mt*mt*startY + 3*mt*mt*eased*midY + 3*mt*eased*eased*midY + eased*eased*eased*endY;

            const sc = 1 + Math.sin(eased * Math.PI) * 0.4;
            const rot = eased * 720;

            led.style.transform =
                'translate(' + (x - 65) + 'px, ' + (y - 35) + 'px) ' +
                'rotate(' + rot + 'deg) scale(' + sc + ')';

            if (now - lastTrailTime > 30) {
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

    /* ⭐ 7. الوصول */
    led.remove();
    champSpawnShockwave(endX, endY);

    /* نبض المجموعة */
    gsap.timeline()
        .to(groupTarget, {
            scale: 1.12,
            boxShadow: '0 0 60px rgba(212,183,122,1), inset 0 0 30px rgba(212,183,122,0.4)',
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
            borderColor: 'rgba(212,183,122,0.4)',
            duration: 0.5
        }, '-=0.4');

    /* ⭐ 8. إضافة الفريق */
    const teamHtml =
        '<div class="champ-group-team-item">' +
            (teamLogo ? '<img src="./' + teamLogo + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + teamName + '</span>' +
        '</div>';
    groupTeamsEl.insertAdjacentHTML('beforeend', teamHtml);

    const newTeam = groupTeamsEl.lastElementChild;
    gsap.fromTo(newTeam,
        { opacity: 0, scale: 0.5, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
    );

    /* ⭐ 9. البطاقة تدخل حالة "مختارة" */
    gsap.to(targetCard, {
        background: 'rgba(20,10,12,.6)',
        borderColor: 'rgba(212,183,122,.2)',
        boxShadow: '0 0 0 rgba(212,183,122,0)',
        opacity: 0.55,
        scale: 1,
        duration: 0.5,
        onComplete: function() {
            targetCard.classList.add('selected');
        }
    });

    /* إطفاء شعار + اسم البطاقة */
    const cardImg = targetCard.querySelector('img');
    const cardName = targetCard.querySelector('.champ-team-card-name');

    if (cardImg) {
        gsap.to(cardImg, {
            filter: 'grayscale(0.4) brightness(0.7)',
            duration: 0.5
        });
    }

    if (cardName) {
        gsap.to(cardName, {
            color: 'rgba(250,246,240,.4)',
            duration: 0.5
        });
    }

    await champWait(500);
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

function champFlash() {
    const f = document.createElement('div');
    f.className = 'champ-flash';
    document.body.appendChild(f);

    gsap.fromTo(f,
        { opacity: 0.6 },
        { opacity: 0, duration: 0.4, onComplete: function() { f.remove(); } }
    );
}

function champSpawnConfetti(count) {
    const colors = ['#D4B77A', '#8B1A2F', '#FAF6F0', '#4A0A15'];
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
   Window Exports
========================================================= */

window.champPerformDraw = champPerformDraw;
window.champSaveAndClose = champSaveAndClose;
window.champResetFromDraw = champResetFromDraw;

console.log('[Champions Draw] v=4 ✨ loaded');
