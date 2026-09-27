/* =========================================================
   locks.js — v18
   - إصلاح: إدارة المديرين والأندية في الإعدادات
   - إضافة: restoreSettingsContent() ترجع العناصر
   - إضافة: استدعاء مباشر لـ mhInit و loadClubs
========================================================= */

window.sectionLocks = {
    fixtures:  false,
    standings: false,
    totw:      false,
    stats:     false
};

window.pendingLocks = {
    fixtures:  false,
    standings: false,
    totw:      false,
    stats:     false
};

const LOCK_PIN = '024680';
const EDIT_PIN = '1999';
const SETTINGS_PIN = '024680';

const SECTIONS = [
    { key: 'fixtures',  label: 'المواجهات',  icon: '⚽' },
    { key: 'standings', label: 'الترتيب',    icon: '🏆' },
    { key: 'totw',      label: 'TOTW',       icon: '⭐' },
    { key: 'stats',     label: 'الإحصائيات', icon: '📊' }
];


/* =========================================================
   HELPERS
========================================================= */

function isAdmin() {
    return localStorage.getItem('tg_admin') === 'true';
}

function isLocker() {
    return sessionStorage.getItem('tg_locker') === 'true';
}

function canBypassLocks() {
    return isLocker() || isAdmin();
}


/* =========================================================
   LOAD / SAVE LOCKS
========================================================= */

async function loadLocks() {
    if (!window.sbClient) return;

    try {
        const { data, error } = await window.sbClient
            .from('site_locks')
            .select('section, is_locked');

        if (error) {
            console.error('[Locks] load error:', error);
            return;
        }

        if (!data) return;

        data.forEach(function(row) {
            if (window.sectionLocks.hasOwnProperty(row.section)) {
                window.sectionLocks[row.section] = row.is_locked === true;
            }
        });
    } catch (e) {
        console.error('[Locks] load exception:', e);
    }
}


async function saveLock(section, isLocked) {
    if (!window.sbClient) return false;

    try {
        const { error } = await window.sbClient
            .from('site_locks')
            .upsert(
                {
                    section: section,
                    is_locked: isLocked,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'section' }
            );

        if (error) {
            console.error('[Locks] save error:', error);
            return false;
        }

        window.sectionLocks[section] = isLocked;
        return true;
    } catch (e) {
        console.error('[Locks] save exception:', e);
        return false;
    }
}


function isLocked(section) {
    return window.sectionLocks[section] === true;
}


/* =========================================================
   MAINTENANCE SCREEN
========================================================= */

function showSectionMaintenance(sectionName) {
    let overlay = document.getElementById('sectionMaintenance');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sectionMaintenance';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML =
        '<div class="maint-box">' +
            '<div class="maint-icon">🔧</div>' +
            '<h2>الموقع في حالة صيانة</h2>' +
            '<p>قسم ' + sectionName + ' قيد الصيانة حالياً</p>' +
            '<p style="font-size:12px;color:#888;margin-top:8px;">نرجع لكم قريباً</p>' +
            '<div class="maint-team">TELEGRAM GOAT 🐐</div>' +
        '</div>';

    overlay.classList.add('show');
}


function hideSectionMaintenance() {
    const overlay = document.getElementById('sectionMaintenance');
    if (overlay) overlay.classList.remove('show');
}


/* =========================================================
   SETTINGS — فتح مع PIN
========================================================= */

function openSettingsWithPin() {
    const pass = prompt('أدخل رمز الإعدادات:');

    if (pass === null) return;

    if (pass !== SETTINGS_PIN) {
        if (typeof showToast === 'function') showToast('الرمز غلط', false, 2500);
        return;
    }

    openSettingsMain();
}


function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('show');
}


function closeSettingsModal() {
    // ⭐ رجّع العناصر المنقولة قبل الإغلاق
    restoreSettingsContent();

    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('show');
}


/* =========================================================
   إرجاع العناصر المنقولة لمكانها الأصلي
========================================================= */

function restoreSettingsContent() {

    // --- mhContent ---
    const mhContent = document.getElementById('mhContent');
    if (mhContent) {
        const originalParent = document.getElementById('statsView-managers');
        const settingsContainer = document.getElementById('settings-managers-content');

        // إذا هو داخل الإعدادات → رجّعه
        if (settingsContainer && settingsContainer.contains(mhContent)) {
            if (originalParent) {
                originalParent.appendChild(mhContent);
            }
        }
    }

    // --- clubsList ---
    const clubsList = document.getElementById('clubsList');
    if (clubsList) {
        const originalParent = document.getElementById('statsView-clubs');
        const settingsContainer = document.getElementById('settings-clubs-content');

        if (settingsContainer && settingsContainer.contains(clubsList)) {
            if (originalParent) {
                originalParent.appendChild(clubsList);
            }
        }
    }

    // --- clubs-controls (زر التعديل) ---
    const clubsControls = document.querySelector('.clubs-controls');
    if (clubsControls) {
        const originalParent = document.getElementById('statsView-clubs');
        const settingsContainer = document.getElementById('settings-clubs-content');

        if (settingsContainer && settingsContainer.contains(clubsControls)) {
            if (originalParent) {
                const list = document.getElementById('clubsList');
                if (list && list.parentNode === originalParent) {
                    originalParent.insertBefore(clubsControls, list);
                } else {
                    originalParent.appendChild(clubsControls);
                }
            }
        }
    }
}


/* =========================================================
   SETTINGS — القائمة الرئيسية
========================================================= */

function openSettingsMain() {
    // ⭐ رجّع أي عنصر منقول قبل عرض القائمة
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    body.innerHTML =
        '<button class="settings-item" onclick="openSettingsManagers()">' +
            '<span class="si-icon">👥</span>' +
            '<span class="si-label">إدارة المديرين</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsClubs()">' +
            '<span class="si-icon">🏟️</span>' +
            '<span class="si-label">إدارة الأندية</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsLocks()">' +
            '<span class="si-icon">🔐</span>' +
            '<span class="si-label">قفل الأقسام</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsMaintenance()">' +
            '<span class="si-icon">🔧</span>' +
            '<span class="si-label">وضع الصيانة</span>' +
        '</button>' +
        '<div class="settings-hint">TELEGRAM GOAT 🐐</div>';

    openSettingsModal();
}


/* =========================================================
   SETTINGS — إدارة المديرين
========================================================= */

function openSettingsManagers() {
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMain()">' +
            '<span class="si-icon">←</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div id="settings-managers-content" class="settings-embed"></div>';

    // ⭐ شغّل manager-hub
    if (typeof window.mhInit === 'function') {
        try { window.mhInit(); } catch (e) { console.warn('[Settings] mhInit error:', e); }
    }

    // ⭐ انتظر ثم انقل
    let attempts = 0;
    const tryMove = function() {
        attempts++;
        const mhContent = document.getElementById('mhContent');
        const container = document.getElementById('settings-managers-content');

        if (!container) return; // المستخدم رجع للقائمة الرئيسية

        if (mhContent && container && !container.contains(mhContent)) {

            // تأكد أن UI جاهز (مو Loading فقط)
            const isLoading = mhContent.querySelector('.mh-loading') !== null;
            const hasContent = mhContent.innerHTML.trim() !== '';

            if (hasContent && !isLoading) {
                container.appendChild(mhContent);
                return;
            }
        }

        if (attempts < 20) {
            setTimeout(tryMove, 250);
        }
    };
    tryMove();
}


/* =========================================================
   SETTINGS — إدارة الأندية
========================================================= */

function openSettingsClubs() {
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMain()">' +
            '<span class="si-icon">←</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div id="settings-clubs-content" class="settings-embed"></div>';

    // ⭐ شغّل clubs
    if (typeof loadClubs === 'function') {
        try { loadClubs(); } catch (e) { console.warn('[Settings] loadClubs error:', e); }
    }

    // ⭐ انتظر ثم انقل
    let attempts = 0;
    const tryMove = function() {
        attempts++;
        const clubsList = document.getElementById('clubsList');
        const clubsControls = document.querySelector('.clubs-controls');
        const container = document.getElementById('settings-clubs-content');

        if (!container) return; // المستخدم رجع

        if (clubsList && container && !container.contains(clubsList)) {

            const hasContent = clubsList.innerHTML.trim() !== '';
            const hasEmpty = clubsList.querySelector('.clubs-empty') !== null;

            if (hasContent && !hasEmpty) {
                if (clubsControls) container.appendChild(clubsControls);
                container.appendChild(clubsList);
                return;
            }
        }

        if (attempts < 20) {
            setTimeout(tryMove, 250);
        }
    };
    tryMove();
}


/* =========================================================
   SETTINGS — قفل الأقسام
========================================================= */

function openSettingsLocks() {
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    let itemsHtml = '<div class="locks-grid">';

    SECTIONS.forEach(function(s) {
        const locked = isLocked(s.key);
        const btnClass = locked ? 'locked' : 'unlocked';
        const btnText = locked ? '🔒 مقفول' : '🔓 مفتوح';

        itemsHtml +=
            '<div class="lock-item">' +
                '<div class="lock-item-label">' +
                    '<span class="lock-item-icon">' + s.icon + '</span>' +
                    '<span>' + s.label + '</span>' +
                '</div>' +
                '<button class="lock-item-btn ' + btnClass + '" onclick="toggleLockFromSettings(\'' + s.key + '\')">' +
                    btnText +
                '</button>' +
            '</div>';
    });

    itemsHtml += '</div>';

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMain()">' +
            '<span class="si-icon">←</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div class="settings-hint" style="padding:4px 0 12px 0;">' +
            'اضغط على الزر لتبديل حالة القفل' +
        '</div>' +
        itemsHtml;
}


async function toggleLockFromSettings(sectionKey) {
    const current = isLocked(sectionKey);
    const newState = !current;

    const pass = prompt('أدخل رمز التأكيد:');
    if (pass !== LOCK_PIN) {
        if (pass !== null && typeof showToast === 'function') {
            showToast('الرمز غلط', false, 2500);
        }
        return;
    }

    const ok = await saveLock(sectionKey, newState);

    if (ok) {
        const label = SECTIONS.find(function(s){ return s.key === sectionKey; });
        const labelText = label ? label.label : sectionKey;

        if (typeof showToast === 'function') {
            showToast(labelText + ' ' + (newState ? 'مقفول' : 'مفتوح'), true, 2500);
        }

        openSettingsLocks();
    } else {
        if (typeof showToast === 'function') showToast('فشل الحفظ', false, 3000);
    }
}


/* =========================================================
   SETTINGS — الصيانة
========================================================= */

function openSettingsMaintenance() {
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    const allLocked = SECTIONS.every(function(s) { return isLocked(s.key); });

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMain()">' +
            '<span class="si-icon">←</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div class="settings-hint" style="padding:4px 0 8px 0;">' +
            'عند تفعيل الصيانة، جميع الأقسام تُقفل للزوار' +
        '</div>' +
        '<button class="maint-all-btn" onclick="activateMaintenance()">' +
            '🔧 ' + (allLocked ? 'إلغاء الصيانة' : 'تفعيل الصيانة') +
        '</button>' +
        '<button class="maint-open-btn" onclick="deactivateMaintenance()">' +
            '🔓 فتح كل الأقسام' +
        '</button>';
}


async function activateMaintenance() {
    const pass = prompt('أدخل رمز التأكيد:');
    if (pass !== LOCK_PIN) {
        if (pass !== null && typeof showToast === 'function') {
            showToast('الرمز غلط', false, 2500);
        }
        return;
    }

    if (typeof showToast === 'function') showToast('جاري التفعيل...', false, 30000);

    let allOk = true;

    for (let i = 0; i < SECTIONS.length; i++) {
        const ok = await saveLock(SECTIONS[i].key, true);
        if (!ok) allOk = false;
    }

    if (allOk) {
        if (typeof showToast === 'function') showToast('تم تفعيل الصيانة', true, 3000);
    } else {
        if (typeof showToast === 'function') showToast('فشل جزئي', false, 4000);
    }

    openSettingsMaintenance();
}


async function deactivateMaintenance() {
    const pass = prompt('أدخل رمز التأكيد:');
    if (pass !== LOCK_PIN) {
        if (pass !== null && typeof showToast === 'function') {
            showToast('الرمز غلط', false, 2500);
        }
        return;
    }

    if (typeof showToast === 'function') showToast('جاري الإلغاء...', false, 30000);

    let allOk = true;

    for (let i = 0; i < SECTIONS.length; i++) {
        const ok = await saveLock(SECTIONS[i].key, false);
        if (!ok) allOk = false;
    }

    if (allOk) {
        if (typeof showToast === 'function') showToast('تم فتح كل الأقسام', true, 3000);
    } else {
        if (typeof showToast === 'function') showToast('فشل جزئي', false, 4000);
    }

    openSettingsMaintenance();
}


/* =========================================================
   INIT
========================================================= */

async function initLockSystem() {
    localStorage.removeItem('tg_locker');
    await loadLocks();
}


window.openSettingsWithPin = openSettingsWithPin;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openSettingsMain = openSettingsMain;
window.openSettingsManagers = openSettingsManagers;
window.openSettingsClubs = openSettingsClubs;
window.openSettingsLocks = openSettingsLocks;
window.openSettingsMaintenance = openSettingsMaintenance;
window.toggleLockFromSettings = toggleLockFromSettings;
window.activateMaintenance = activateMaintenance;
window.deactivateMaintenance = deactivateMaintenance;
window.restoreSettingsContent = restoreSettingsContent;
