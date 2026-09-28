/* =========================================================
   download.js — FINALISSIMA LEAGUE CHAT
   Web Share API للـ iOS Photos
========================================================= */

function waitForImagesToLoad(element) {
    const images = Array.from(element.querySelectorAll('img'));

    return Promise.all(images.map(function(img) {
        if (img.complete && img.naturalWidth > 0) {
            if (img.decode) {
                return img.decode().catch(function() {});
            }
            return Promise.resolve();
        }

        return new Promise(function(resolve) {
            let finished = false;

            const finish = function() {
                if (finished) return;
                finished = true;
                img.removeEventListener('load', finish);
                img.removeEventListener('error', finish);
                resolve();
            };

            img.addEventListener('load', finish, { once: true });
            img.addEventListener('error', finish, { once: true });

            setTimeout(finish, 5000);
        });
    }));
}

function applyRoundedCorners(sourceCanvas, radius) {
    try {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = w;
        outputCanvas.height = h;

        const ctx = outputCanvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(w - radius, 0);
        ctx.quadraticCurveTo(w, 0, w, radius);
        ctx.lineTo(w, h - radius);
        ctx.quadraticCurveTo(w, h, w - radius, h);
        ctx.lineTo(radius, h);
        ctx.quadraticCurveTo(0, h, 0, h - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(sourceCanvas, 0, 0);

        return outputCanvas;
    } catch (e) {
        console.warn('[DL] applyRoundedCorners failed:', e);
        return sourceCanvas;
    }
}

function dlDebug(text, isError) {
    if (isError) {
        console.error('[DL]', text);
    } else {
        console.log('[DL]', text);
    }
}

function toggleDownloadMenu(event) {
    if (event) event.stopPropagation();

    const menu = document.getElementById('downloadMenu');
    const wrapper = document.getElementById('downloadWrapper');

    if (!menu) return;

    const isOpen = menu.classList.toggle('show');

    if (wrapper) {
        wrapper.classList.toggle('open', isOpen);
    }
}

function closeDownloadMenu() {
    const menu = document.getElementById('downloadMenu');
    const wrapper = document.getElementById('downloadWrapper');

    if (menu) menu.classList.remove('show');
    if (wrapper) wrapper.classList.remove('open');
}

document.addEventListener('click', function(e) {
    const wrapper = document.querySelector('.download-wrapper');
    if (!wrapper) return;
    if (!wrapper.contains(e.target)) {
        closeDownloadMenu();
    }
});

function getActiveTabName() {
    const fixturesTab = document.getElementById('fixturesTab');
    const standingsTab = document.getElementById('standingsTab');
    const totwTab = document.getElementById('totwTab');
    const statsTab = document.getElementById('statsTab');

    if (totwTab && totwTab.classList.contains('active')) return 'totw';
    if (standingsTab && standingsTab.classList.contains('active')) return 'standings';
    if (statsTab && statsTab.classList.contains('active')) return 'stats';
    if (fixturesTab && fixturesTab.classList.contains('active')) return 'fixtures';

    if (typeof window.activeTab !== 'undefined') return window.activeTab;

    return 'fixtures';
}

function isCanvasTainted(canvas) {
    try {
        canvas.getContext('2d').getImageData(0, 0, 1, 1);
        return false;
    } catch (e) {
        return true;
    }
}

/* ⭐ دالة جديدة: تحويل blob إلى file */
function blobToFile(blob, filename) {
    try {
        return new File([blob], filename, {
            type: blob.type || 'image/png',
            lastModified: Date.now()
        });
    } catch (e) {
        console.warn('[DL] blobToFile failed, trying fallback:', e);
        /* fallback للمتصفحات القديمة */
        blob.name = filename;
        blob.lastModified = Date.now();
        return blob;
    }
}

/* ⭐ دالة جديدة: محاولة Web Share API أولاً */
async function shareOrDownload(blob, filename) {
    /* 1) نحاول Web Share API */
    if (navigator.canShare && navigator.share) {
        try {
            const file = blobToFile(blob, filename);
            const shareData = {
                files: [file],
                title: 'Finalissima League',
                text: 'Matchweek Image'
            };

            /* نتحقق إذا المتصفح يقدر يشارك الملف */
            if (navigator.canShare(shareData)) {
                dlDebug('Trying Web Share API...');
                await navigator.share(shareData);

                if (typeof showToast === 'function') {
                    showToast('تم! اخترت حفظ في الصور', true, 2500);
                }
                return true;
            } else {
                dlDebug('canShare returned false', true);
            }
        } catch (err) {
            /* إذا المستخدم ألغى → ما نعتبرها فشل */
            if (err.name === 'AbortError') {
                dlDebug('User cancelled share');
                return true;
            }
            dlDebug('Share failed: ' + err.message, true);
        }
    } else {
        dlDebug('Web Share API not supported', true);
    }

    /* 2) Fallback: التنزيل المباشر */
    try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 2000);

        if (typeof showToast === 'function') {
            showToast('تم التحميل (Files)', true, 2500);
        }
        return true;
    } catch (e) {
        dlDebug('Fallback failed: ' + e.message, true);
        return false;
    }
}

function showImageModal(blob, filename) {
    const old = document.getElementById('dlImageModal');
    if (old) {
        const oldUrl = old.dataset.blobUrl;
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        old.remove();
    }

    const url = URL.createObjectURL(blob);
    const canShare = !!(navigator.canShare && navigator.share);

    const modal = document.createElement('div');
    modal.id = 'dlImageModal';
    modal.dataset.blobUrl = url;
    modal.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(0,0,0,0.95)',
        'z-index:9999999',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'padding:16px',
        'overflow-y:auto',
        'direction:rtl',
        'font-family:inherit'
    ].join(';');

    /* زر الحفظ الرئيسي — حسب دعم المتصفح */
    let primaryBtnText = canShare
        ? '📥 حفظ في الصور'
        : '📥 حفظ في Files';
    let primaryHint = canShare
        ? 'يفتح قائمة iOS → اختر "حفظ في الصور"'
        : 'يحفظ في ملفات الجهاز';

    modal.innerHTML =
        '<div style="text-align:center;color:#C8A95F;margin-bottom:10px;font-weight:900;font-size:14px;letter-spacing:0.5px;padding:8px 14px;background:rgba(200,169,95,0.15);border-radius:12px;border:1px solid #C8A95F;max-width:500px;">' +
            primaryHint +
        '</div>' +
        '<img id="dlImagePreview" src="' + url + '" style="max-width:100%;max-height:60vh;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,0.8);border:2px solid #C8A95F;margin:8px 0;background:transparent;" />' +
        '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding-bottom:20px;">' +
            '<button id="dlDirectBtn" style="padding:14px 26px;background:linear-gradient(135deg,#C8A95F,#8B7340);color:#fff;border:none;border-radius:28px;font-weight:900;font-size:15px;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(200,169,95,0.5);cursor:pointer;font-family:inherit;">' + primaryBtnText + '</button>' +
            '<button id="dlCloseBtn" style="padding:14px 26px;background:linear-gradient(135deg,#8B1A2F,#6B0F1F);color:#fff;border:none;border-radius:28px;font-weight:900;font-size:15px;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(139,26,47,0.5);cursor:pointer;font-family:inherit;">✕ إغلاق</button>' +
        '</div>' +
        '<div style="color:#888;font-size:11px;margin-top:8px;text-align:center;padding-bottom:20px;max-width:400px;">' +
            'إذا ما اشتغل — اضغط مطولاً على الصورة ثم اختر "حفظ في الصور"' +
        '</div>';

    document.body.appendChild(modal);

    /* زر الحفظ الرئيسي */
    modal.querySelector('#dlDirectBtn').addEventListener('click', async function() {
        const btn = this;
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ جاري...';

        try {
            const success = await shareOrDownload(blob, filename);

            if (success) {
                /* لا نغلق الـ modal — المستخدم قد يريد استخدامه مرة أخرى */
                setTimeout(function() {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }, 1000);
            } else {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (typeof showToast === 'function') {
                    showToast('فشل — اضغط مطولاً على الصورة', false, 4000);
                }
            }
        } catch (err) {
            console.error('[DL] Direct btn error:', err);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    /* زر الإغلاق */
    modal.querySelector('#dlCloseBtn').addEventListener('click', function() {
        URL.revokeObjectURL(url);
        modal.remove();
    });

    /* إغلاق عند الضغط على الخلفية */
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            URL.revokeObjectURL(url);
            modal.remove();
        }
    });
}

function downloadAsImage(scaleFactor) {
    if (typeof scaleFactor !== 'number') scaleFactor = 3;

    closeDownloadMenu();

    const activeTabName = getActiveTabName();
    dlDebug('tab=' + activeTabName);

    let element = null;
    let filenamePrefix = 'Image';
    let isTOTW = false;

    if (activeTabName === 'totw') {
        isTOTW = true;

        const pitchWrapper = document.getElementById('totwPitchWrapper');
        const listWrapper  = document.getElementById('totwListWrapper');

        if (listWrapper && listWrapper.style.display !== 'none' && listWrapper.innerHTML.trim() !== '') {
            element = listWrapper;
            filenamePrefix = 'TOTW_List';
        } else {
            if (pitchWrapper) pitchWrapper.style.display = 'flex';
            element = document.getElementById('totwPitchToSave');
            filenamePrefix = 'TOTW';
        }
    }
    else if (activeTabName === 'standings') {
        if (typeof renderStandings === 'function') renderStandings();
        element = document.getElementById('captureStandings');
        filenamePrefix = 'Standings';
    }
    else if (activeTabName === 'stats') {
        const activeView = document.querySelector('.stats-view.active');
        element = activeView || document.getElementById('statsContent');
        filenamePrefix = 'Stats';
    }
    else {
        if (typeof renderFixtures === 'function') renderFixtures();
        element = document.getElementById('captureFixtures');
        filenamePrefix = 'Matchweek';
    }

    if (!element) {
        dlDebug('element not found', true);
        if (typeof showToast === 'function') showToast('العنصر غير موجود', false, 4000);
        return;
    }

    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        dlDebug('element has 0 size!', true);
        if (typeof showToast === 'function') showToast('العنصر فارغ', false, 4000);
        return;
    }

    if (typeof showToast === 'function') {
        showToast('جاري تجهيز الصورة...', false, 2000);
    }

    const cornerRadius = 20 * scaleFactor;

    waitForImagesToLoad(element)
        .then(function() {
            return html2canvas(element, {
                backgroundColor: null,
                scale: scaleFactor,
                useCORS: true,
                allowTaint: false,
                logging: false,
                width: element.offsetWidth,
                height: element.offsetHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                imageTimeout: 0,
                onclone: function(clonedDoc, clonedElement) {
                    const wrappers = clonedElement.querySelectorAll('.logo-20, .logo-24');

                    wrappers.forEach(function(wrapper) {
                        const isSmall = wrapper.classList.contains('logo-20');
                        const size = isSmall ? '20px' : '22px';

                        wrapper.style.width = size;
                        wrapper.style.height = size;
                        wrapper.style.minWidth = size;
                        wrapper.style.minHeight = size;
                        wrapper.style.maxWidth = size;
                        wrapper.style.maxHeight = size;
                        wrapper.style.overflow = 'hidden';
                        wrapper.style.position = 'relative';
                        wrapper.style.display = 'inline-block';
                    });

                    const logos = clonedElement.querySelectorAll('.logo-20 img, .logo-24 img');

                    logos.forEach(function(img) {
                        img.style.position = 'absolute';
                        img.style.top = '50%';
                        img.style.left = '50%';
                        img.style.transform = 'translate(-50%, -50%)';
                        img.style.width = 'auto';
                        img.style.height = 'auto';
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '100%';
                        img.style.objectFit = 'contain';
                        img.style.display = 'block';
                    });

                    const indicators = clonedElement.querySelectorAll('.pos-indicator-img');

                    indicators.forEach(function(img) {
                        const size = '25px';
                        img.style.width = size;
                        img.style.height = size;
                        img.style.minWidth = size;
                        img.style.minHeight = size;
                        img.style.maxWidth = size;
                        img.style.maxHeight = size;
                        img.style.objectFit = 'contain';
                    });

                    const lockPanel = clonedElement.querySelector('#adminLockPanel');
                    if (lockPanel) lockPanel.style.display = 'none';

                    if (isTOTW) {
                        const parent = clonedElement.parentElement;
                        if (parent && parent.classList && parent.classList.contains('totw-pitch-wrapper')) {
                            parent.style.padding = '0';
                            parent.style.margin = '0';
                            parent.style.background = 'transparent';
                        }
                    }
                }
            });
        })
        .then(function(canvas) {
            dlDebug('canvas=' + canvas.width + 'x' + canvas.height);

            if (isCanvasTainted(canvas)) {
                dlDebug('canvas tainted', true);
                if (typeof showToast === 'function') {
                    showToast('فشل: صور محمية', false, 5000);
                }
                return;
            }

            const finalCanvas = applyRoundedCorners(canvas, cornerRadius);

            finalCanvas.toBlob(function(blob) {
                if (!blob) {
                    dlDebug('blob null', true);
                    if (typeof showToast === 'function') {
                        showToast('فشل إنشاء الصورة', false, 5000);
                    }
                    return;
                }

                dlDebug('blob=' + Math.round(blob.size / 1024) + 'KB');

                const filename = filenamePrefix + '_' + scaleFactor + 'x.png';

                showImageModal(blob, filename);

                if (typeof showToast === 'function') {
                    showToast('اضغط على زر الحفظ', true, 2500);
                }

            }, 'image/png', 1.0);
        })
        .catch(function(err) {
            console.error('[DL] error:', err);
            dlDebug('error: ' + err.message, true);
            if (typeof showToast === 'function') {
                showToast('فشل: ' + err.message, false, 5000);
            }
        });
}

function fallbackDownload(blob, filename) {
    const link = document.createElement('a');
    link.download = filename || 'image.png';
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() {
        URL.revokeObjectURL(link.href);
    }, 1000);
}
