/* =========================================================
   manager-hub.js — FINALISSIMA LEAGUE CHAT
========================================================= */

(function(){
'use strict';

const EDIT_PASSWORD = '024680';
const NO_TEAM_KEY = '__NO_TEAM__';
const MANUAL_KEY = '__MANUAL__';

let hubData = {};
let hubLoading = false;
let hubLoaded = false;
let hubEditMode = false;
let hubInitialized = false;
let hubSearchQuery = '';
let hubRefreshing = false;

function getSb(){
    return window.sbClient || null;
}

function logoURL(teamName){
    if(!teamName || teamName === NO_TEAM_KEY || teamName === MANUAL_KEY) return '';
    if(typeof TEAMS_LOGOS === 'undefined') return '';
    const file = TEAMS_LOGOS[teamName];
    return file ? './' + file : '';
}

function escapeHTML(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

function getAllTeams(){
    if(typeof TEAMS_LOGOS === 'undefined') return [];
    return Object.keys(TEAMS_LOGOS).sort();
}

function teamLabel(team){
    if(team === NO_TEAM_KEY) return '— بدون منتخب —';
    if(team === MANUAL_KEY) return '— مضاف بالـ ID —';
    return team;
}

function flattenManagers(){
    const list = [];
    Object.keys(hubData).forEach(function(team){
        (hubData[team] || []).forEach(function(name){
            list.push({ name: name, team: team, is_manual: false });
        });
    });

    if(typeof getManualEntries === 'function'){
        getManualEntries().forEach(function(m){
            list.push({
                name: m.player_name || m.entry_name,
                team: MANUAL_KEY,
                entry: m.entry,
                is_manual: true
            });
        });
    }

    return list;
}

function getTotalCount(){
    let total = 0;
    Object.keys(hubData).forEach(function(t){
        total += (hubData[t] || []).length;
    });
    if(typeof getManualEntries === 'function'){
        total += getManualEntries().length;
    }
    return total;
}

async function loadHubData(){
    const sb = getSb();
    if(!sb) return null;
    try {
        const { data, error } = await sb
            .from('managers_by_team')
            .select('team, managers');
        if(error){
            console.warn('[MH] Load error:', error.message);
            return null;
        }
        const map = {};
        (data || []).forEach(function(row){
            map[row.team] = Array.isArray(row.managers) ? row.managers : [];
        });
        return map;
    } catch(e){
        console.warn('[MH] Load exception:', e.message);
        return null;
    }
}

async function seedFromPlayersTeams(){
    const sb = getSb();
    if(!sb) return false;
    if(typeof PLAYERS_TEAMS === 'undefined') return false;

    const teams = Object.keys(PLAYERS_TEAMS);
    const rows = teams.map(function(t){
        return {
            team: t,
            managers: PLAYERS_TEAMS[t] || [],
            updated_at: new Date().toISOString()
        };
    });

    try {
        const { error } = await sb
            .from('managers_by_team')
            .upsert(rows, { onConflict: 'team' });
        if(error){
            console.warn('[MH] Seed error:', error.message);
            return false;
        }
        console.log('[MH] Seeded', rows.length, 'teams');
        return true;
    } catch(e){
        console.warn('[MH] Seed exception:', e.message);
        return false;
    }
}

async function saveTeam(teamName, managers){
    const sb = getSb();
    if(!sb) return false;
    try {
        const { error } = await sb
            .from('managers_by_team')
            .upsert({
                team: teamName,
                managers: managers,
                updated_at: new Date().toISOString()
            }, { onConflict: 'team' });
        if(error){
            console.error('[MH] Save error:', error.message);
            return false;
        }
        return true;
    } catch(e){
        console.error('[MH] Save exception:', e.message);
        return false;
    }
}

async function syncMissingManagers(){
    if(typeof getAllManagersCached !== 'function') return;

    let allFPL = [];
    try {
        allFPL = await getAllManagersCached();
    } catch(e){
        return;
    }

    if(!allFPL || allFPL.length === 0) return;

    const existing = {};
    Object.keys(hubData).forEach(function(team){
        (hubData[team] || []).forEach(function(name){
            const key = String(name || '').trim().toLowerCase();
            if(key) existing[key] = true;
        });
    });

    const missing = [];
    allFPL.forEach(function(m){
        if(m.is_manual) return;
        const name = String(m.player_name || m.entry_name || '').trim();
        if(!name) return;
        const key = name.toLowerCase();
        if(!existing[key]){
            missing.push(name);
            existing[key] = true;
        }
    });

    if(missing.length === 0) return;

    if(!hubData[NO_TEAM_KEY]) hubData[NO_TEAM_KEY] = [];
    missing.forEach(function(name){
        if(hubData[NO_TEAM_KEY].indexOf(name) === -1){
            hubData[NO_TEAM_KEY].push(name);
        }
    });

    await saveTeam(NO_TEAM_KEY, hubData[NO_TEAM_KEY]);
    console.log('[MH] Synced ' + missing.length + ' missing → NO_TEAM');
}

function render(){
    const wrap = document.getElementById('mhContent');
    if(!wrap) return;

    if(hubLoading){
        wrap.innerHTML = '<div class="mh-loading"><div class="spinner"></div><div>Loading managers...</div></div>';
        return;
    }

    if(!hubLoaded){
        wrap.innerHTML = '<div class="mh-empty">Waiting for data...</div>';
        return;
    }

    wrap.innerHTML = '';

    const controls = document.createElement('div');
    controls.className = 'mh-controls';

    const stats = document.createElement('div');
    stats.className = 'mh-stats';
    stats.innerHTML = '<span>' + getTotalCount() + '</span> MANAGERS';
    controls.appendChild(stats);

    const actions = document.createElement('div');
    actions.className = 'mh-control-actions';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'mh-refresh-btn';
    refreshBtn.innerHTML = '⟳';
    refreshBtn.title = 'تحديث البيانات';
    refreshBtn.disabled = hubRefreshing;
    if(hubRefreshing) refreshBtn.classList.add('spinning');
    refreshBtn.addEventListener('click', doRefresh);
    actions.appendChild(refreshBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'mh-edit-btn' + (hubEditMode ? ' active' : '');
    editBtn.textContent = hubEditMode ? 'DONE' : 'EDIT';
    editBtn.addEventListener('click', toggleEditMode);
    actions.appendChild(editBtn);

    controls.appendChild(actions);
    wrap.appendChild(controls);

    if(hubEditMode){
        wrap.appendChild(buildManualIdForm());
        wrap.appendChild(buildAddForm());
    }

    const searchBox = document.createElement('div');
    searchBox.className = 'mh-search-box';

    const searchInput = document.createElement('input');
    searchInput.className = 'mh-search-input';
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث عن مدير...';
    searchInput.value = hubSearchQuery;
    searchInput.addEventListener('input', function(){
        hubSearchQuery = this.value;
        renderList();
    });

    searchBox.appendChild(searchInput);
    wrap.appendChild(searchBox);

    const listContainer = document.createElement('div');
    listContainer.className = 'mh-list-container' + (hubEditMode ? ' edit-mode' : '');
    listContainer.id = 'mhListContainer';
    wrap.appendChild(listContainer);

    renderList();
}

async function doRefresh(){
    if(hubRefreshing) return;
    hubRefreshing = true;
    render();

    if(typeof showToast === 'function') showToast('جاري التحديث...', false, 30000);

    try {
        await getAllManagersCached(true);
        if(typeof refreshManualEntries === 'function'){
            await refreshManualEntries();
        }
        await syncMissingManagers();
        if(typeof showToast === 'function') showToast('تم التحديث', true, 2500);
    } catch(e){
        console.error('[MH] Refresh failed:', e);
        if(typeof showToast === 'function') showToast('فشل التحديث', false, 4000);
    }

    hubRefreshing = false;
    render();
}

function buildManualIdForm(){
    const row = document.createElement('div');
    row.className = 'mh-manual-row';

    const label = document.createElement('div');
    label.className = 'mh-manual-label';
    label.textContent = 'إضافة بـ Entry ID:';
    row.appendChild(label);

    const input = document.createElement('input');
    input.className = 'mh-manual-input';
    input.type = 'number';
    input.inputMode = 'numeric';
    input.placeholder = 'مثال: 1234567';
    input.min = '1';

    const btn = document.createElement('button');
    btn.className = 'mh-manual-add-btn';
    btn.textContent = '+ ID';

    let busy = false;

    async function doAdd(){
        if(busy) return;
        const id = (input.value || '').trim();
        if(!id){
            if(typeof showToast === 'function') showToast('اكتب الـ ID', false);
            return;
        }

        busy = true;
        btn.disabled = true;
        btn.textContent = '...';

        try {
            const result = await addManualEntryById(id);
            if(result.ok){
                input.value = '';
                if(typeof showToast === 'function') showToast('أُضيف: ' + result.entry.player_name, true, 3000);
                render();
            } else {
                if(typeof showToast === 'function') showToast(result.error, false, 4000);
            }
        } catch(e){
            if(typeof showToast === 'function') showToast('خطأ: ' + e.message, false, 4000);
        }

        busy = false;
        btn.disabled = false;
        btn.textContent = '+ ID';
    }

    btn.addEventListener('click', doAdd);
    input.addEventListener('keypress', function(e){
        if(e.key === 'Enter') doAdd();
    });

    row.appendChild(input);
    row.appendChild(btn);

    return row;
}

function buildAddForm(){
    const addRow = document.createElement('div');
    addRow.className = 'mh-add-row';

    const nameInput = document.createElement('input');
    nameInput.className = 'mh-add-input';
    nameInput.type = 'text';
    nameInput.placeholder = 'اسم المدير الجديد...';

    const teamSelect = document.createElement('select');
    teamSelect.className = 'mh-add-select';

    const optNone = document.createElement('option');
    optNone.value = NO_TEAM_KEY;
    optNone.textContent = '— بدون منتخب —';
    teamSelect.appendChild(optNone);

    getAllTeams().forEach(function(t){
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        teamSelect.appendChild(opt);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'mh-add-btn';
    addBtn.textContent = 'ADD';

    function doAdd(){
        const name = nameInput.value.trim();
        const team = teamSelect.value;
        if(!name){
            if(typeof showToast === 'function') showToast('اكتب اسم المدير', false);
            else alert('اكتب اسم المدير');
            return;
        }
        addManager(team, name);
        nameInput.value = '';
    }

    addBtn.addEventListener('click', doAdd);
    nameInput.addEventListener('keypress', function(e){
        if(e.key === 'Enter') doAdd();
    });

    addRow.appendChild(nameInput);
    addRow.appendChild(teamSelect);
    addRow.appendChild(addBtn);

    return addRow;
}

function renderList(){
    const container = document.getElementById('mhListContainer');
    if(!container) return;

    let list = flattenManagers();

    if(hubSearchQuery){
        const q = hubSearchQuery.toLowerCase().trim();
        list = list.filter(function(m){
            return m.name.toLowerCase().indexOf(q) !== -1 ||
                   m.team.toLowerCase().indexOf(q) !== -1;
        });
    }

    list.sort(function(a, b){
        return a.name.localeCompare(b.name);
    });

    if(list.length === 0){
        container.innerHTML = '<div class="mh-empty" style="padding:30px;text-align:center;font-size:13px;">لا يوجد نتائج</div>';
        return;
    }

    let html = '<div class="mh-list-header">';
    html += '<div class="mh-lh-num">#</div>';
    html += '<div class="mh-lh-logo"></div>';
    html += '<div class="mh-lh-name">MANAGER</div>';
    html += '<div class="mh-lh-team">NATION</div>';
    if(hubEditMode){
        html += '<div class="mh-lh-action"></div>';
    }
    html += '</div>';

    list.forEach(function(item, idx){
        const logo = logoURL(item.team);
        const isNoTeam = item.team === NO_TEAM_KEY;
        const isManual = item.is_manual;

        html += '<div class="mh-list-row' + (isManual ? ' mh-row-manual' : '') + '" data-name="' + escapeHTML(item.name) + '" data-team="' + escapeHTML(item.team) + '" data-entry="' + (item.entry || '') + '" data-manual="' + (isManual ? '1' : '0') + '">';
        html += '<div class="mh-lr-num">' + (idx + 1) + '</div>';

        if(logo){
            html += '<div class="mh-lr-logo"><img src="' + logo + '" loading="lazy" onerror="this.style.display=\'none\'"></div>';
        } else if(isManual){
            html += '<div class="mh-lr-logo mh-lr-logo-manual">ID</div>';
        } else {
            html += '<div class="mh-lr-logo mh-lr-logo-empty"></div>';
        }

        html += '<div class="mh-lr-name" title="' + escapeHTML(item.name) + '">' + escapeHTML(item.name) + '</div>';

        if(isManual){
            html += '<div class="mh-lr-team mh-lr-team-manual" title="ID: ' + item.entry + '">ID: ' + item.entry + '</div>';
        } else {
            html += '<div class="mh-lr-team' + (isNoTeam ? ' mh-lr-team-none' : '') + '">' + escapeHTML(teamLabel(item.team)) + '</div>';
        }

        if(hubEditMode){
            if(!isManual){
                html += '<button class="mh-lr-move" title="نقل">⇄</button>';
            } else {
                html += '<div class="mh-lr-spacer"></div>';
            }
            html += '<button class="mh-lr-delete" title="Delete">×</button>';
        }

        html += '</div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('.mh-list-row').forEach(function(row){
        const name = row.dataset.name;
        const team = row.dataset.team;
        const entry = row.dataset.entry;
        const isManual = row.dataset.manual === '1';

        const nameEl = row.querySelector('.mh-lr-name');
        if(nameEl){
            nameEl.addEventListener('click', function(){
                openManagerSquadFor(name, entry);
            });
        }

        const moveBtn = row.querySelector('.mh-lr-move');
        if(moveBtn){
            moveBtn.addEventListener('click', function(e){
                e.stopPropagation();
                openMoveModal(team, name);
            });
        }

        const delBtn = row.querySelector('.mh-lr-delete');
        if(delBtn){
            delBtn.addEventListener('click', function(){
                if(isManual){
                    deleteManual(entry, name);
                } else {
                    deleteManager(team, name);
                }
            });
        }
    });
}

function deleteManual(entry, name){
    if(!confirm('إزالة "' + name + '" (ID: ' + entry + ') من القائمة؟')) return;

    if(typeof removeManualEntry === 'function'){
        removeManualEntry(entry);
        if(typeof showToast === 'function') showToast('تمت الإزالة', true);
        render();
    }
}

function openMoveModal(fromTeam, name){
    const modal = document.getElementById('mhModal');
    if(!modal) return;

    let optionsHtml = '';

    if(fromTeam !== NO_TEAM_KEY){
        optionsHtml +=
            '<button class="mh-move-option" data-team="' + NO_TEAM_KEY + '">' +
                '<span style="font-size:14px;">—</span>' +
                '<span>بدون منتخب</span>' +
            '</button>';
    }

    getAllTeams().forEach(function(t){
        if(t === fromTeam) return;
        const logo = logoURL(t);
        optionsHtml +=
            '<button class="mh-move-option" data-team="' + escapeHTML(t) + '">' +
                (logo ? '<img src="' + logo + '" onerror="this.style.display=\'none\'">' : '') +
                '<span>' + escapeHTML(t) + '</span>' +
            '</button>';
    });

    modal.innerHTML =
        '<div class="mh-modal-box">' +
            '<div class="mh-modal-title">نقل "' + escapeHTML(name) + '"</div>' +
            '<div style="color:#b8b8b8;font-size:12px;text-align:center;margin-bottom:12px;">' +
                'من: <strong style="color:#C8A95F;">' + escapeHTML(teamLabel(fromTeam)) + '</strong>' +
            '</div>' +
            '<div style="color:#fff;font-size:12px;text-align:center;margin-bottom:10px;font-weight:700;">اختر المنتخب الجديد:</div>' +
            '<div class="mh-move-list">' + optionsHtml + '</div>' +
            '<button class="mh-modal-btn mh-modal-cancel" id="mhMoveCancel" style="margin-top:10px;">إلغاء</button>' +
        '</div>';

    modal.classList.add('show');

    modal.querySelectorAll('.mh-move-option').forEach(function(optBtn){
        optBtn.addEventListener('click', function(){
            const toTeam = this.dataset.team;
            closeMoveModal();
            executeMove(fromTeam, toTeam, name);
        });
    });

    const cancelBtn = modal.querySelector('#mhMoveCancel');
    if(cancelBtn){
        cancelBtn.addEventListener('click', closeMoveModal);
    }

    modal.onclick = function(e){
        if(e.target === modal) closeMoveModal();
    };
}

function closeMoveModal(){
    const modal = document.getElementById('mhModal');
    if(modal){
        modal.classList.remove('show');
        modal.innerHTML = '';
    }
}

async function executeMove(fromTeam, toTeam, name){
    const fromList = hubData[fromTeam] || [];
    const idx = fromList.indexOf(name);
    if(idx === -1) return;

    fromList.splice(idx, 1);

    if(!hubData[toTeam]) hubData[toTeam] = [];
    if(hubData[toTeam].indexOf(name) !== -1){
        fromList.splice(idx, 0, name);
        if(typeof showToast === 'function') showToast('موجود مسبقاً في ' + teamLabel(toTeam), false);
        return;
    }
    hubData[toTeam].push(name);

    const okFrom = await saveTeam(fromTeam, fromList);
    const okTo = await saveTeam(toTeam, hubData[toTeam]);

    if(!okFrom || !okTo){
        hubData[toTeam].pop();
        fromList.splice(idx, 0, name);
        if(typeof showToast === 'function') showToast('فشل النقل', false);
        return;
    }

    if(typeof showToast === 'function') showToast('نُقل إلى ' + teamLabel(toTeam), true);
    render();
}

function toggleEditMode(){
    if(hubEditMode){
        hubEditMode = false;
        render();
        return;
    }
    askPassword(function(ok){
        if(ok){
            hubEditMode = true;
            render();
        }
    });
}

async function addManager(team, name){
    if(!hubData[team]) hubData[team] = [];
    if(hubData[team].indexOf(name) !== -1){
        const label = team === NO_TEAM_KEY ? 'بدون منتخب' : team;
        if(typeof showToast === 'function') showToast('موجود مسبقاً في ' + label, false);
        return;
    }
    hubData[team].push(name);
    const ok = await saveTeam(team, hubData[team]);
    if(!ok){
        hubData[team].pop();
        if(typeof showToast === 'function') showToast('فشل الحفظ', false);
        return;
    }
    if(typeof showToast === 'function') showToast('تمت الإضافة', true);
    render();
}

async function deleteManager(team, name){
    const managers = hubData[team] || [];
    const idx = managers.indexOf(name);
    if(idx === -1) return;

    if(!confirm('حذف "' + name + '"؟')) return;

    managers.splice(idx, 1);
    const ok = await saveTeam(team, managers);
    if(!ok){
        managers.splice(idx, 0, name);
        if(typeof showToast === 'function') showToast('فشل الحذف', false);
        return;
    }
    if(typeof showToast === 'function') showToast('تم الحذف', true);
    render();
}

function askPassword(callback){
    const modal = document.getElementById('mhModal');
    if(!modal){
        const val = prompt('كلمة السر:');
        callback(val === EDIT_PASSWORD);
        return;
    }

    modal.innerHTML =
        '<div class="mh-modal-box">' +
            '<div class="mh-modal-title">كلمة سر التعديل</div>' +
            '<input type="password" id="mhPassInput" class="mh-pass-input" placeholder="••••••" maxlength="10" inputmode="numeric">' +
            '<div class="mh-modal-buttons">' +
                '<button class="mh-modal-btn mh-modal-cancel" id="mhCancel">إلغاء</button>' +
                '<button class="mh-modal-btn mh-modal-confirm" id="mhConfirm">دخول</button>' +
            '</div>' +
            '<div class="mh-modal-error" id="mhError"></div>' +
        '</div>';

    modal.classList.add('show');

    const input = document.getElementById('mhPassInput');
    const errEl = document.getElementById('mhError');

    setTimeout(function(){ if(input) input.focus(); }, 100);

    function close(){
        modal.classList.remove('show');
        modal.innerHTML = '';
    }

    function confirm(){
        const val = (input.value || '').trim();
        if(val === EDIT_PASSWORD){
            close();
            callback(true);
        } else {
            errEl.textContent = 'كلمة السر غلط';
            input.value = '';
            input.focus();
        }
    }

    document.getElementById('mhCancel').addEventListener('click', function(){
        close();
        callback(false);
    });
    document.getElementById('mhConfirm').addEventListener('click', confirm);
    input.addEventListener('keypress', function(e){
        if(e.key === 'Enter') confirm();
    });

    modal.onclick = function(e){
        if(e.target === modal){ close(); callback(false); }
    };
}

async function openManagerSquadFor(name, entryId){
    try {
        if(entryId){
            if(typeof window.openManagerSquad === 'function'){
                await window.openManagerSquad(parseInt(entryId, 10), name);
            }
            return;
        }

        if(typeof window.findManagerEntryId !== 'function'){
            await new Promise(function(r){ setTimeout(r, 800); });
        }
        if(typeof window.findManagerEntryId !== 'function'){
            alert('Squad viewer not ready.');
            return;
        }
        const id = await window.findManagerEntryId(name, '');
        if(!id){
            alert('Could not find "' + name + '" in FPL league.');
            return;
        }
        if(typeof window.openManagerSquad === 'function'){
            await window.openManagerSquad(id, name);
        }
    } catch(e){
        console.error('[MH] Squad error:', e);
        alert('Error: ' + e.message);
    }
}

async function initHub(){
    if(hubLoaded || hubLoading) return;
    hubLoading = true;
    render();

    try {
        let data = await loadHubData();

        if(!data || Object.keys(data).length === 0){
            await seedFromPlayersTeams();
            data = await loadHubData();
        }

        hubData = data || {};

        getAllTeams().forEach(function(t){
            if(!hubData[t]) hubData[t] = [];
        });
        if(!hubData[NO_TEAM_KEY]) hubData[NO_TEAM_KEY] = [];

        hubLoading = false;
        hubLoaded = true;
        render();

        console.log('[MH] Ready. Managers:', getTotalCount());

        syncMissingManagers().then(function(){
            render();
        }).catch(function(e){
            console.warn('[MH] Sync failed:', e);
        });

    } catch(e){
        hubLoading = false;
        console.error('[MH] Init failed:', e);
        render();
    }
}

function hookManagersTab(){
    const btn = document.querySelector('[data-tab="managers"]');
    if(!btn){
        setTimeout(hookManagersTab, 400);
        return;
    }
    if(hubInitialized) return;
    hubInitialized = true;

    btn.addEventListener('click', function(){
        setTimeout(initHub, 100);
    });

    const view = document.getElementById('statsView-managers');
    if(view && view.classList.contains('active')){
        setTimeout(initHub, 300);
    }
}

document.addEventListener('DOMContentLoaded', function(){
    setTimeout(hookManagersTab, 800);
});

window.addEventListener('managers-updated', function(){
    if(hubLoaded){
        render();
    }
});

window.mhInit = initHub;
window.mhReload = function(){
    hubLoaded = false;
    hubLoading = false;
    initHub();
};

})();
