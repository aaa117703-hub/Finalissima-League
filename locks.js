/* =========================================================
   locks.js — FINALISSIMA LEAGUE CHAT (v=6)
   Phosphor Icons + قسم "month" + Champions Cup
========================================================= */

window.sectionLocks = {
    fixtures:  false,
    standings: false,
    totw:      false,
    stats:     false,
    month:     false,
    champions: false
};

window.pendingLocks = {
    fixtures:  false,
    standings: false,
    totw:      false,
    stats:     false,
    month:     false,
    champions: false
};

const LOCK_PIN = '024680';
const EDIT_PIN = '1999';
const SETTINGS_PIN = '024680';

/* ⭐ الأقسام — بأيقونات Phosphor */
const SECTIONS = [
    { key: 'fixtures',  label: 'المواجهات',        icon: 'soccer-ball' },
    { key: 'standings', label: 'الترتيب',          icon: 'chart-bar' },
    { key: 'totw',      label: 'التشكيلة',         icon: 'star' },
    { key: 'stats',     label: 'الإحصائيات',       icon: 'chart-line-up' },
    { key: 'champions', label: 'كأس الأبطال',      icon: 'trophy' },
    { key: 'month',     label: 'تشكيلة الشهر',     icon: 'medal' }
];

/* =========================================================
   HELPERS
========================================================= */

function isAdmin() {
    return localStorage.getItem('fin_admin') === 'true';
}

function isLocker() {
    return sessionStorage.getItem('fin_locker') === 'true';
}

function canBypassLocks() {
    return isLocker() || isAdmin();
}

/* ⭐ Helper: أيقونة Phosphor */
function phIcon(name, variant) {
    variant = variant || 'regular';
    const variantClass = variant === 'fill' ? 'ph-fill' :
                         variant === 'bold' ? 'ph-bold' :
                         variant === 'duotone' ? 'ph-duotone' :
                         'ph';
    return '<i class="' + variantClass + ' ph-' + name + '"></i>';
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
            '<div class="maint-icon">' + phIcon('wrench', 'fill') + '</div>' +
            '<h2>الموقع في حالة صيانة</h2>' +
            '<p>قسم ' + sectionName + ' قيد الصيانة حالياً</p>' +
            '<p style="font-size:12px;color:#888;margin-top:8px;">نرجع لكم قريباً</p>' +
            '<div class="maint-team">FINALISSIMA LEAGUE ' + phIcon('trophy', 'fill') + '</div>' +
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
    restoreSettingsContent();
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('show');
}

/* =========================================================
   إرجاع العناصر المنقولة
========================================================= */

function restoreSettingsContent() {
    const mhContent = document.getElementById('mhContent');
    if (mhContent) {
        const originalParent = document.getElementById('statsView-managers');
        const settingsContainer = document.getElementById('settings-managers-content');
        if (settingsContainer && settingsContainer.contains(mhContent)) {
            if (originalParent) originalParent.appendChild(mhContent);
        }
    }

    const clubsList = document.getElementById('clubsList');
    if (clubsList) {
        const originalParent = document.getElementById('statsView-clubs');
        const settingsContainer = document.getElementById('settings-clubs-content');
        if (settingsContainer && settingsContainer.contains(clubsList)) {
            if (originalParent) originalParent.appendChild(clubsList);
        }
    }

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
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    body.innerHTML =
        '<button class="settings-item" onclick="openSettingsManagers()">' +
            '<span class="si-icon">' + phIcon('users', 'fill') + '</span>' +
            '<span class="si-label">إدارة المديرين</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsClubs()">' +
            '<span class="si-icon">' + phIcon('shield-star', 'fill') + '</span>' +
            '<span class="si-label">إدارة المنتخبات</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsMatchweeks()">' +
            '<span class="si-icon">' + phIcon('clipboard-text', 'fill') + '</span>' +
            '<span class="si-label">إدارة المواجهات</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsMonth()">' +
            '<span class="si-icon">' + phIcon('trophy', 'fill') + '</span>' +
            '<span class="si-label">تشكيلة الشهر</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsLocks()">' +
            '<span class="si-icon">' + phIcon('lock-key', 'fill') + '</span>' +
            '<span class="si-label">قفل الأقسام</span>' +
        '</button>' +
        '<button class="settings-item" onclick="openSettingsMaintenance()">' +
            '<span class="si-icon">' + phIcon('wrench', 'fill') + '</span>' +
            '<span class="si-label">وضع الصيانة</span>' +
        '</button>' +
        '<div class="settings-hint">FINALISSIMA LEAGUE CHAT ' + phIcon('trophy', 'fill') + '</div>';

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
            '<span class="si-icon">' + phIcon('arrow-right', 'bold') + '</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div id="settings-managers-content" class="settings-embed"></div>';

    if (typeof window.mhInit === 'function') {
        try { window.mhInit(); } catch (e) { console.warn('[Settings] mhInit error:', e); }
    }

    let attempts = 0;
    const tryMove = function() {
        attempts++;
        const mhContent = document.getElementById('mhContent');
        const container = document.getElementById('settings-managers-content');

        if (!container) return;

        if (mhContent && container && !container.contains(mhContent)) {
            const isLoading = mhContent.querySelector('.mh-loading') !== null;
            const hasContent = mhContent.innerHTML.trim() !== '';

            if (hasContent && !isLoading) {
                container.appendChild(mhContent);
                return;
            }
        }

        if (attempts < 20) setTimeout(tryMove, 250);
    };
    tryMove();
}

/* =========================================================
   SETTINGS — إدارة المنتخبات
========================================================= */

function openSettingsClubs() {
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMain()">' +
            '<span class="si-icon">' + phIcon('arrow-right', 'bold') + '</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div id="settings-clubs-content" class="settings-embed"></div>';

    if (typeof loadClubs === 'function') {
        try { loadClubs(); } catch (e) { console.warn('[Settings] loadClubs error:', e); }
    }

    let attempts = 0;
    const tryMove = function() {
        attempts++;
        const clubsList = document.getElementById('clubsList');
        const clubsControls = document.querySelector('.clubs-controls');
        const container = document.getElementById('settings-clubs-content');

        if (!container) return;

        if (clubsList && container && !container.contains(clubsList)) {
            const hasContent = clubsList.innerHTML.trim() !== '';
            const hasEmpty = clubsList.querySelector('.clubs-empty') !== null;

            if (hasContent && !hasEmpty) {
                if (clubsControls) container.appendChild(clubsControls);
                container.appendChild(clubsList);
                return;
            }
        }

        if (attempts < 20) setTimeout(tryMove, 250);
    };
    tryMove();
}

/* =========================================================
   SETTINGS — تشكيلة الشهر
========================================================= */

function openSettingsMonth() {
    restoreSettingsContent();

    const body = document.getElementById('settingsBody');
    if (!body) return;

    const isOpen = !isLocked('month');
    const statusIcon = isOpen ? phIcon('eye', 'fill') : phIcon('lock', 'fill');
    const statusText = isOpen ? 'مفتوح للجميع' : 'مقفول';
    const statusClass = isOpen ? 'mwm-visible' : 'mwm-hidden';

    body.innerHTML =
        '<button class="settings-item settings-back" onclick="openSettingsMain()">' +
            '<span class="si-icon">' + phIcon('arrow-right', 'bold') + '</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +

        '<div class="settings-hint" style="padding:8px 0 12px 0;text-align:center;">' +
            'تحكم بإتاحة تشكيلة الشهر للمستخدمين' +
        '</div>' +

        '<div class="mwm-round-row" style="padding:20px 16px;">' +
            '<div class="mwm-round-info">' +
                '<div class="mwm-round-num" style="font-size:17px;">' +
                    phIcon('trophy', 'fill') + ' تشكيلة الشهر' +
                '</div>' +
                '<div class="mwm-round-meta" style="margin-top:6px;font-size:13px;">' +
                    'الحالة: <span class="' + statusClass + '">' + statusIcon + ' ' + statusText + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="mwm-round-actions">' +
                '<button class="mwm-btn mwm-toggle" onclick="toggleMonthLock()">' + statusIcon + '</button>' +
            '</div>' +
        '</div>' +

        '<div style="margin-top:20px;padding:14px;background:#FAF6F0;border-radius:14px;border:2px dashed #C8A95F;">' +
            '<div style="font-size:12px;color:#8B1A2F;font-weight:800;line-height:1.8;text-align:right;">' +
                '<strong>ملاحظة:</strong><br>' +
                '• عندما يكون <strong>مقفولاً</strong> → المستخدم يرى "غير متاح حالياً"<br>' +
                '• عندما يكون <strong>مفتوحاً</strong> → يظهر Top 11 للمستخدمين' +
            '</div>' +
        '</div>';
}

async function toggleMonthLock() {
    const currentLocked = isLocked('month');
    const newLocked = !currentLocked;

    if (typeof showToast === 'function') {
        showToast('جاري التحديث...', false, 10000);
    }

    const ok = await saveLock('month', newLocked);

    if (ok) {
        if (typeof showToast === 'function') {
            showToast(newLocked ? 'تم قفل تشكيلة الشهر' : 'تم فتح تشكيلة الشهر', true, 2500);
        }

        openSettingsMonth();
    } else {
        if (typeof showToast === 'function') {
            showToast('فشل التحديث', false, 3000);
        }
    }
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
        const btnText = locked
            ? phIcon('lock', 'fill') + ' مقفول'
            : phIcon('lock-open', 'fill') + ' مفتوح';

        itemsHtml +=
            '<div class="lock-item">' +
                '<div class="lock-item-label">' +
                    '<span class="lock-item-icon">' + phIcon(s.icon, 'fill') + '</span>' +
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
            '<span class="si-icon">' + phIcon('arrow-right', 'bold') + '</span>' +
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
            '<span class="si-icon">' + phIcon('arrow-right', 'bold') + '</span>' +
            '<span class="si-label">رجوع</span>' +
        '</button>' +
        '<div class="settings-hint" style="padding:4px 0 8px 0;">' +
            'عند تفعيل الصيانة، جميع الأقسام تُقفل للزوار' +
        '</div>' +
        '<button class="maint-all-btn" onclick="activateMaintenance()">' +
            phIcon('wrench', 'bold') + ' ' + (allLocked ? 'إلغاء الصيانة' : 'تفعيل الصيانة') +
        '</button>' +
        '<button class="maint-open-btn" onclick="deactivateMaintenance()">' +
            phIcon('lock-open', 'bold') + ' فتح كل الأقسام' +
        '</button>';
}

async function activateMaintenance() {
    const pass = prompt('أدخل رمز التأكيد:');
    if (pass !== LOCK_PIN) {
        if (pass !== null && typeof showToast === 'function') showToast('الرمز غلط', false, 2500);
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
        if (pass !== null && typeof showToast === 'function') showToast('الرمز غلط', false, 2500);
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
    localStorage.removeItem('fin_locker');
    await loadLocks();
}

window.openSettingsWithPin = openSettingsWithPin;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openSettingsMain = openSettingsMain;
window.openSettingsManagers = openSettingsManagers;
window.openSettingsClubs = openSettingsClubs;
window.openSettingsMonth = openSettingsMonth;
window.toggleMonthLock = toggleMonthLock;
window.openSettingsLocks = openSettingsLocks;
window.openSettingsMaintenance = openSettingsMaintenance;
window.toggleLockFromSettings = toggleLockFromSettings;
window.activateMaintenance = activateMaintenance;
window.deactivateMaintenance = deactivateMaintenance;
window.restoreSettingsContent = restoreSettingsContent;
window.isLocked = isLocked;
window.isAdmin = isAdmin;
window.showSectionMaintenance = showSectionMaintenance;
window.hideSectionMaintenance = hideSectionMaintenance;
window.phIcon = phIcon;
