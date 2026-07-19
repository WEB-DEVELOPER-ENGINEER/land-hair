/**
 * iHair Egypt - Advanced Admin Dashboard Pro
 * Control center for Meta Pixel, CAPI, Store Settings, Image Assets, Orders, & System Security
 * 
 * @version 3.0.0
 * @author Kiro AI / DeepMind Team
 */

'use strict';

// ============================================================================
// Configuration & Defaults
// ============================================================================

const CONFIG = {
    supabase: {
        url: 'https://suwmwsfovsynwweziovd.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d213c2ZvdnN5bnd3ZXppb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzI1MjQsImV4cCI6MjA5OTEwODUyNH0._ZBmJl_c_rARPr9TaViYSQ8f7abbA3OrITAewISS820',
        bucket: 'ihair-images'
    },
    defaultSettings: {
        pixel_id: '1009559858452835',
        fb_access_token: 'EAAOyWjBiFr8BR1XwqnDREIDyDXatlwoeeuWFoZBS8Agxv4hOkLqbqfe6dkM0mbhmVnrLEltavpQdrkFmVjfaB0lfZCrXjvRDAIV74s1ZBesffgZAxQUndhbWZAZAWKAlaA2njp9w9VMNkSFSRxR7U0EAPiFCH2oJvDGIZCQnJGscnrxoaIv6IFt93AVhOZA8JDJZBCQZDZD',
        test_event_code: '',
        pixel_enabled: true,
        capi_enabled: true,
        pii_hashing: true,
        base_price: 450,
        regular_price: 900,
        shipping_standard: 0,
        shipping_coastal: 50,
        stock_remaining: 14,
        announcement_text: '🔥 عرض خاص لفترة محدودة: خصم 50% + شحن مجاني لجميع المحافظات!',
        support_phone: '01012345678',
        admin_password: 'password123!'
    },
    defaults: {
        hero_product: 'assets/serum.jpeg',
        before_after_1: 'assets/before-and-after-1.jpeg',
        before_after_2: 'assets/before-and-after-2.jpeg',
        before_after_3: 'assets/before-and-after-3.jpeg',
        before_after_4: 'assets/before-and-after-4.jpeg',
        before_after_5: 'assets/before-and-after-5.jpeg',
        before_after_6: 'assets/before-and-after-6.jpeg',
        customer_opinion_1: 'assets/customer-opnion-1.jpeg',
        customer_opinion_2: 'assets/customer-opnion-2.jpeg',
        customer_opinion_3: 'assets/customer-opnion-3.jpeg',
        customer_opinion_4: 'assets/customer-opnion-4.jpeg',
        customer_opinion_5: 'assets/customer-opnion-5.jpeg',
        customer_opinion_6: 'assets/customer-opnion-6.jpeg',
        customer_opinion_7: 'assets/customer-opnion-7.jpeg',
        certificate: 'assets/certificate.jpeg'
    }
};

const State = {
    supabase: null,
    initialized: false,
    settings: { ...CONFIG.defaultSettings },
    loadedImages: new Map(),
    customerOpinionsCount: 0,
    beforeAfterCount: 0
};

// ============================================================================
// Supabase Client Helper
// ============================================================================

function initSupabase() {
    if (State.supabase) return State.supabase;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            State.supabase = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
            return State.supabase;
        } catch (e) {
            console.warn('[Admin] Could not init Supabase client:', e);
        }
    }
    return null;
}

// ============================================================================
// UI Toast & Loading Helpers
// ============================================================================

const UI = {
    showLoading(text = 'جاري التحميل...') {
        const overlay = document.getElementById('loading-overlay');
        const txt = document.getElementById('loading-text');
        if (txt) txt.textContent = text;
        if (overlay) overlay.style.display = 'flex';
    },

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};

// Global helper for onclick
window.switchTab = function(tabId) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
    if (tabId === 'tab-orders') {
        renderOrdersTable();
    }
};

window.scrollToCapiTester = function() {
    const el = document.getElementById('capi-tester-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.copyInputVal = function(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
        navigator.clipboard.writeText(el.value);
        UI.showToast('تم نسخ المعرّف للحافظة!');
    }
};

// ============================================================================
// Settings Management (LocalStorage + Supabase Table Sync)
// ============================================================================

function loadSettings() {
    let settings = { ...CONFIG.defaultSettings };
    try {
        const stored = localStorage.getItem('ihair_settings');
        if (stored) {
            settings = { ...settings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('[Admin] Could not parse local settings');
    }
    State.settings = settings;
    populateSettingsForms();
    updateOverviewStats();
}

async function saveSettings(newValues) {
    State.settings = { ...State.settings, ...newValues };
    localStorage.setItem('ihair_settings', JSON.stringify(State.settings));

    // Also attempt Supabase upsert if online
    const client = initSupabase();
    if (client) {
        try {
            const upsertData = Object.keys(newValues).map(k => ({
                key: k,
                value: String(newValues[k])
            }));
            await client.from('settings').upsert(upsertData, { onConflict: 'key' });
        } catch (e) {
            console.log('[Admin] Supabase settings table sync skipped');
        }
    }

    populateSettingsForms();
    updateOverviewStats();
    UI.showToast('تم حفظ الإعدادات بنجاح!');
}

function populateSettingsForms() {
    const s = State.settings;

    // Tracking Tab
    const pixelIdInput = document.getElementById('setting-pixel-id');
    if (pixelIdInput) pixelIdInput.value = s.pixel_id || '';

    const testCodeInput = document.getElementById('setting-test-code');
    if (testCodeInput) testCodeInput.value = s.test_event_code || '';

    const tokenInput = document.getElementById('setting-access-token');
    if (tokenInput) tokenInput.value = s.fb_access_token || '';

    const pixelToggle = document.getElementById('toggle-pixel-enabled');
    if (pixelToggle) pixelToggle.checked = s.pixel_enabled !== false && s.pixel_enabled !== 'false';

    const capiToggle = document.getElementById('toggle-capi-enabled');
    if (capiToggle) capiToggle.checked = s.capi_enabled !== false && s.capi_enabled !== 'false';

    const piiToggle = document.getElementById('toggle-pii-hashing');
    if (piiToggle) piiToggle.checked = s.pii_hashing !== false && s.pii_hashing !== 'false';

    // Store Tab
    const basePriceInput = document.getElementById('setting-base-price');
    if (basePriceInput) basePriceInput.value = s.base_price || 450;

    const regularPriceInput = document.getElementById('setting-regular-price');
    if (regularPriceInput) regularPriceInput.value = s.regular_price || 900;

    const shipStdInput = document.getElementById('setting-shipping-standard');
    if (shipStdInput) shipStdInput.value = s.shipping_standard !== undefined ? s.shipping_standard : 0;

    const shipCoastInput = document.getElementById('setting-shipping-coastal');
    if (shipCoastInput) shipCoastInput.value = s.shipping_coastal !== undefined ? s.shipping_coastal : 50;

    const stockInput = document.getElementById('setting-stock-remaining');
    if (stockInput) stockInput.value = s.stock_remaining || 14;

    const phoneInput = document.getElementById('setting-support-phone');
    if (phoneInput) phoneInput.value = s.support_phone || '01012345678';

    const annInput = document.getElementById('setting-announcement-text');
    if (annInput) annInput.value = s.announcement_text || '';
}

function updateOverviewStats() {
    const s = State.settings;
    const leads = getLeads();

    // Badges
    const statusPixelId = document.getElementById('status-pixel-id');
    if (statusPixelId) statusPixelId.textContent = s.pixel_id || 'غير محدد';

    const pixelBadge = document.getElementById('status-pixel-badge');
    if (pixelBadge) {
        const active = s.pixel_enabled !== false && s.pixel_enabled !== 'false';
        pixelBadge.className = `badge-status ${active ? 'status-active' : 'status-inactive'}`;
        pixelBadge.textContent = active ? '🟢 مفعّل' : '🔴 معطل';
    }

    const capiBadge = document.getElementById('status-capi-badge');
    if (capiBadge) {
        const active = s.capi_enabled !== false && s.capi_enabled !== 'false';
        capiBadge.className = `badge-status ${active ? 'status-active' : 'status-inactive'}`;
        capiBadge.textContent = active ? '🟢 مفعّل' : '🔴 معطل';
    }

    // Orders stats
    const ordersVal = document.getElementById('stat-orders-val');
    if (ordersVal) ordersVal.textContent = leads.length;

    const ordersBadgeCount = document.getElementById('orders-badge-count');
    if (ordersBadgeCount) ordersBadgeCount.textContent = leads.length;

    const ordersTotalCount = document.getElementById('orders-total-count');
    if (ordersTotalCount) ordersTotalCount.textContent = `${leads.length} طلب`;

    // Calculate revenue
    let totalRev = 0;
    leads.forEach(l => {
        const num = parseFloat(String(l.total).replace(/[^0-9.]/g, '')) || 0;
        totalRev += num;
    });

    const revenueVal = document.getElementById('stat-revenue-val');
    if (revenueVal) revenueVal.textContent = `${totalRev.toLocaleString('ar-EG')} ج.م`;
}

// ============================================================================
// CAPI Live Event Tester Tool
// ============================================================================

window.clearConsoleLog = function() {
    const consoleBody = document.getElementById('capi-console-output');
    if (consoleBody) {
        consoleBody.innerHTML = '<div class="log-entry log-info">[النظام] تم مسح السجل. جاهز للاختبار.</div>';
    }
};

function logToConsole(message, type = 'info', jsonObj = null) {
    const consoleBody = document.getElementById('capi-console-output');
    if (!consoleBody) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const timeStr = new Date().toLocaleTimeString('ar-EG');

    let content = `[${timeStr}] ${message}`;
    if (jsonObj) {
        content += `<div class="log-json">${JSON.stringify(jsonObj, null, 2)}</div>`;
    }

    entry.innerHTML = content;
    consoleBody.appendChild(entry);
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

async function runCapiTestEvent() {
    const eventType = document.getElementById('test-event-type').value;
    const name = document.getElementById('test-user-name').value;
    const phone = document.getElementById('test-user-phone').value;
    const amount = parseFloat(document.getElementById('test-user-amount').value) || 450;
    
    const settings = State.settings;

    logToConsole(`جاري إرسال حدث تجريبي: ${eventType}...`, 'info');

    const testPayload = {
        eventName: eventType,
        pixelId: settings.pixel_id,
        accessToken: settings.fb_access_token,
        testEventCode: settings.test_event_code || undefined,
        name: name,
        phone: phone,
        governorate: 'القاهرة',
        address: 'عنوان تجريبي لاختبار النظام',
        quantity: 1,
        subtotal: amount,
        shippingCost: 0,
        total: amount,
        eventSourceUrl: window.location.href,
        userAgent: navigator.userAgent
    };

    try {
        const response = await fetch('/api/facebook-conversion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            logToConsole(`✅ تم نجاح الإرسال لفيسبوك CAPI! (HTTP ${response.status})`, 'success', result);
            UI.showToast(`تم إرسال حدث ${eventType} التجريبي بنجاح!`);
        } else {
            logToConsole(`❌ فشل إرسال الحدث CAPI (HTTP ${response.status})`, 'error', result);
            UI.showToast('خطأ أثناء إرسال الحدث لـ Facebook CAPI', 'error');
        }
    } catch (err) {
        logToConsole(`❌ خطأ في الاتصال بالسيرفر: ${err.message}`, 'error');
        UI.showToast('تعذر الاتصال بسيرفر التحويلات', 'error');
    }
}

// ============================================================================
// Orders & Leads Manager
// ============================================================================

function getLeads() {
    try {
        return JSON.parse(localStorage.getItem('ihair_leads') || '[]');
    } catch (e) {
        return [];
    }
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const leads = getLeads();
    updateOverviewStats();

    if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="table-empty">لا توجد طلبات مسجلة حتى الآن</td></tr>';
        return;
    }

    tbody.innerHTML = leads.map(l => {
        const dateFormatted = new Date(l.date || Date.now()).toLocaleString('ar-EG');
        return `
            <tr>
                <td><span class="order-id-code">${l.id || '-'}</span></td>
                <td><small>${dateFormatted}</small></td>
                <td><strong>${l.name || '-'}</strong></td>
                <td><a href="tel:${l.phone}">${l.phone || '-'}</a></td>
                <td>${l.governorate || '-'} - <small>${l.address || ''}</small></td>
                <td><strong>${l.quantity || 1} عبوة</strong></td>
                <td><strong>${l.total || l.subtotal || '-'}</strong></td>
                <td><span class="badge-order-status status-new">${l.status || 'جديد'}</span></td>
                <td>
                    <button class="btn-action-sm btn-danger-sm" onclick="deleteOrder('${l.id}')">حذف</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.deleteOrder = function(orderId) {
    if (!confirm('هل أنت تأكد من حذف هذا الطلب؟')) return;
    let leads = getLeads();
    leads = leads.filter(l => l.id !== orderId);
    localStorage.setItem('ihair_leads', JSON.stringify(leads));
    renderOrdersTable();
    UI.showToast('تم حذف الطلب بنجاح');
};

window.clearAllOrders = function() {
    if (!confirm('تنبيه: هل تريد مسح جميع الطلبات المسجلة بصفة نهائية؟')) return;
    localStorage.removeItem('ihair_leads');
    renderOrdersTable();
    UI.showToast('تم مسح جميع الطلبات');
};

window.exportOrdersCSV = function() {
    const leads = getLeads();
    if (leads.length === 0) {
        UI.showToast('لا توجد طلبات لتصديرها', 'error');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "ID,التاريخ,الاسم,الهاتف,المحافظة,العنوان,الكمية,الإجمالي,الحالة\n";

    leads.forEach(l => {
        const row = [
            `"${l.id || ''}"`,
            `"${l.date || ''}"`,
            `"${l.name || ''}"`,
            `"${l.phone || ''}"`,
            `"${l.governorate || ''}"`,
            `"${(l.address || '').replace(/"/g, '""')}"`,
            `"${l.quantity || 1}"`,
            `"${l.total || ''}"`,
            `"${l.status || 'جديد'}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ihair_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    UI.showToast('تم تصدير ملف الطلبات بنجاح');
};

// ============================================================================
// Dynamic Image Manager (Supabase Storage)
// ============================================================================

window.triggerFileInput = function(inputId) {
    const fileInput = document.getElementById(inputId);
    if (fileInput) fileInput.click();
};

window.uploadSingleImage = async function(key, fileInputId) {
    const input = document.getElementById(fileInputId);
    if (!input || !input.files || input.files.length === 0) {
        UI.showToast('يرجى اختيار صورة أولاً', 'error');
        return;
    }

    const file = input.files[0];
    const client = initSupabase();

    if (!client) {
        UI.showToast('تعذر الاتصال بـ Supabase Storage', 'error');
        return;
    }

    UI.showLoading(`جاري رفع الصورة (${file.name})...`);

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${key}_${Date.now()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await client.storage
            .from(CONFIG.supabase.bucket)
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = client.storage
            .from(CONFIG.supabase.bucket)
            .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        // Upsert to DB
        const { error: dbError } = await client
            .from('images')
            .upsert({ key: key, url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (dbError) throw dbError;

        // Update local preview
        const preview = document.getElementById(`preview-${key.replace(/_/g, '-')}`);
        if (preview) preview.src = publicUrl;

        UI.showToast('تم رفع الصورة بنجاح وتحديث المتجر!');

    } catch (err) {
        console.error('[Admin] Upload failed:', err);
        UI.showToast(`فشل رفع الصورة: ${err.message}`, 'error');
    } finally {
        UI.hideLoading();
    }
};

window.addNewImageCard = async function(category) {
    const count = category === 'customer_opinions' ? ++State.customerOpinionsCount : ++State.beforeAfterCount;
    const key = category === 'customer_opinions' ? `customer_opinion_${count}` : `before_after_${count}`;
    const containerId = category === 'customer_opinions' ? 'grid-customer-opinions' : 'grid-before-after';
    const container = document.getElementById(containerId);

    if (!container) return;

    const card = document.createElement('div');
    card.className = 'image-card';
    card.setAttribute('data-key', key);
    card.innerHTML = `
        <div class="image-preview">
            <img id="preview-${key}" src="assets/placeholder.png" alt="${key}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23eee\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23999\\'>اختر صورة</text></svg>'">
        </div>
        <div class="image-actions">
            <input type="file" id="file-${key}" class="file-input" accept="image/*">
            <button type="button" class="btn btn-upload" onclick="triggerFileInput('file-${key}')">اختر ملف</button>
            <button type="button" class="btn btn-save" onclick="uploadSingleImage('${key}', 'file-${key}')">حفظ وإرسال</button>
            <button type="button" class="btn btn-delete" onclick="deleteDynamicImageCard('${key}')">حذف الصورة</button>
        </div>
    `;

    container.appendChild(card);
    UI.showToast('تم إضافة بطاقة جديدة. يمكنك رفع الصورة الآن.');
};

window.deleteDynamicImageCard = async function(key) {
    if (!confirm(`هل أنت تأكد من حذف الصورة ${key}؟`)) return;

    const client = initSupabase();
    if (client) {
        try {
            await client.from('images').delete().eq('key', key);
        } catch (e) {}
    }

    const card = document.querySelector(`[data-key="${key}"]`);
    if (card) card.remove();
    UI.showToast('تم حذف الصورة من المعرض');
};

function renderDefaultGalleryCards() {
    const opinionsGrid = document.getElementById('grid-customer-opinions');
    if (opinionsGrid && opinionsGrid.children.length === 0) {
        for (let i = 1; i <= 7; i++) {
            const key = `customer_opinion_${i}`;
            const url = CONFIG.defaults[key] || `assets/customer-opnion-${i}.jpeg`;
            renderExistingGalleryCard('grid-customer-opinions', key, url);
            if (i > State.customerOpinionsCount) State.customerOpinionsCount = i;
        }
    }

    const beforeAfterGrid = document.getElementById('grid-before-after');
    if (beforeAfterGrid && beforeAfterGrid.children.length === 0) {
        for (let i = 1; i <= 6; i++) {
            const key = `before_after_${i}`;
            const url = CONFIG.defaults[key] || `assets/before-and-after-${i}.jpeg`;
            renderExistingGalleryCard('grid-before-after', key, url);
            if (i > State.beforeAfterCount) State.beforeAfterCount = i;
        }
    }
}

async function loadGalleryImages() {
    renderDefaultGalleryCards();

    const badge = document.getElementById('status-supabase-badge');
    const client = initSupabase();
    if (!client) {
        if (badge) {
            badge.className = 'badge-status status-inactive';
            badge.textContent = '🟡 الوضع المحلي (سيرفر غـير متاح)';
        }
        return;
    }

    try {
        const { data, error } = await client.from('images').select('*');
        if (error) throw error;

        if (badge) {
            badge.className = 'badge-status status-active';
            badge.textContent = '🟢 متصل (Supabase Cloud)';
        }

        if (data && data.length > 0) {
            data.forEach(item => {
                if (item.key === 'hero_product') {
                    const img = document.getElementById('preview-hero-product');
                    if (img) img.src = item.url;
                } else if (item.key === 'certificate') {
                    const img = document.getElementById('preview-certificate');
                    if (img) img.src = item.url;
                } else if (item.key.startsWith('customer_opinion_')) {
                    const num = parseInt(item.key.split('_')[2]);
                    if (num > State.customerOpinionsCount) State.customerOpinionsCount = num;
                    renderExistingGalleryCard('grid-customer-opinions', item.key, item.url);
                } else if (item.key.startsWith('before_after_')) {
                    const num = parseInt(item.key.split('_')[2]);
                    if (num > State.beforeAfterCount) State.beforeAfterCount = num;
                    renderExistingGalleryCard('grid-before-after', item.key, item.url);
                }
            });
        }
    } catch (e) {
        console.warn('[Admin] Could not fetch images table from Supabase (offline/local mode active):', e.message || e);
        if (badge) {
            badge.className = 'badge-status status-inactive';
            badge.textContent = '🟡 الوضع المحلي (سيرفر غـير متاح)';
        }
    }
}

function renderExistingGalleryCard(containerId, key, url) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let card = document.querySelector(`[data-key="${key}"]`);
    if (!card) {
        card = document.createElement('div');
        card.className = 'image-card';
        card.setAttribute('data-key', key);
        container.appendChild(card);
    }

    card.innerHTML = `
        <div class="image-preview">
            <img id="preview-${key}" src="${url}" alt="${key}">
        </div>
        <div class="image-actions">
            <input type="file" id="file-${key}" class="file-input" accept="image/*">
            <button type="button" class="btn btn-upload" onclick="triggerFileInput('file-${key}')">تغيير الصورة</button>
            <button type="button" class="btn btn-save" onclick="uploadSingleImage('${key}', 'file-${key}')">تحديث</button>
            <button type="button" class="btn btn-delete" onclick="deleteDynamicImageCard('${key}')">حذف الصورة</button>
        </div>
    `;
}

// ============================================================================
// Backup & Restore System Config
// ============================================================================

window.exportSystemConfig = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(State.settings, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `ihair_config_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    UI.showToast('تم تصدير ملف الإعدادات JSON بنجاح');
};

window.importSystemConfig = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            saveSettings(json);
            UI.showToast('تم استعادة الإعدادات بنجاح!');
        } catch (err) {
            UI.showToast('ملف غير صالح!', 'error');
        }
    };
    reader.readAsText(file);
};

// ============================================================================
// Authentication & Initialization
// ============================================================================

function setupAuth() {
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const authError = document.getElementById('auth-error');
    const logoutBtn = document.getElementById('logout-btn');

    function checkLogin() {
        if (localStorage.getItem('admin_logged_in') === 'true') {
            authSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            initDashboardContent();
        } else {
            authSection.style.display = 'flex';
            dashboardSection.style.display = 'none';
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value.trim();
            const pwd = document.getElementById('admin-password').value.trim();

            const targetPwd = State.settings.admin_password || 'password123!';

            if (email === 'admin@admin.com' && pwd === targetPwd) {
                localStorage.setItem('admin_logged_in', 'true');
                if (authError) authError.textContent = '';
                checkLogin();
                UI.showToast('أهلاً بك! تم تسجيل الدخول بنجاح');
            } else {
                if (authError) authError.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('admin_logged_in');
            checkLogin();
            UI.showToast('تم تسجيل الخروج');
        });
    }

    // Password Change Form
    const pwdForm = document.getElementById('password-change-form');
    if (pwdForm) {
        pwdForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const curr = document.getElementById('pwd-current').value;
            const next = document.getElementById('pwd-new').value;
            const conf = document.getElementById('pwd-confirm').value;

            const targetPwd = State.settings.admin_password || 'password123!';

            if (curr !== targetPwd) {
                UI.showToast('كلمة المرور الحالية غير صحيحة!', 'error');
                return;
            }

            if (next !== conf) {
                UI.showToast('كلمتا المرور غير متطابقتين!', 'error');
                return;
            }

            saveSettings({ admin_password: next });
            pwdForm.reset();
            UI.showToast('تم تغيير كلمة المرور بنجاح');
        });
    }

    checkLogin();
}

function initDashboardContent() {
    loadSettings();
    loadGalleryImages();
    renderOrdersTable();

    // Bind Tracking Form
    const trackingForm = document.getElementById('tracking-settings-form');
    if (trackingForm) {
        trackingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSettings({
                pixel_id: document.getElementById('setting-pixel-id').value.trim(),
                test_event_code: document.getElementById('setting-test-code').value.trim(),
                fb_access_token: document.getElementById('setting-access-token').value.trim(),
                pixel_enabled: document.getElementById('toggle-pixel-enabled').checked,
                capi_enabled: document.getElementById('toggle-capi-enabled').checked,
                pii_hashing: document.getElementById('toggle-pii-hashing').checked
            });
        });
    }

    // Bind Store Form
    const storeForm = document.getElementById('store-settings-form');
    if (storeForm) {
        storeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSettings({
                base_price: parseFloat(document.getElementById('setting-base-price').value) || 450,
                regular_price: parseFloat(document.getElementById('setting-regular-price').value) || 900,
                shipping_standard: parseFloat(document.getElementById('setting-shipping-standard').value) || 0,
                shipping_coastal: parseFloat(document.getElementById('setting-shipping-coastal').value) || 50,
                stock_remaining: parseInt(document.getElementById('setting-stock-remaining').value) || 14,
                support_phone: document.getElementById('setting-support-phone').value.trim(),
                announcement_text: document.getElementById('setting-announcement-text').value.trim()
            });
        });
    }

    // Bind CAPI Run Button
    const runTestBtn = document.getElementById('run-capi-test-btn');
    if (runTestBtn) {
        runTestBtn.addEventListener('click', runCapiTestEvent);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
});
