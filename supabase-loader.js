/**
 * Dynamic Image & Settings Loader from Supabase & LocalStorage
 * Loads images and site settings dynamically to update the landing page
 */

const SUPABASE_URL = 'https://suwmwsfovsynwweziovd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d213c2ZvdnN5bnd3ZXppb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzI1MjQsImV4cCI6MjA5OTEwODUyNH0._ZBmJl_c_rARPr9TaViYSQ8f7abbA3OrITAewISS820';

let supabaseClient = null;

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

const DEFAULT_SETTINGS = {
    pixel_id: '1009559858452835',
    fb_access_token: 'EAAOyWjBiFr8BR1XwqnDREIDyDXatlwoeeuWFoZBS8Agxv4hOkLqbqfe6dkM0mbhmVnrLEltavpQdrkFmVjfaB0lfZCrXjvRDAIV74s1ZBesffgZAxQUndhbWZAZAWKAlaA2njp9w9VMNkSFSRxR7U0EAPiFCH2oJvDGIZCQnJGscnrxoaIv6IFt93AVhOZA8JDJZBCQZDZD',
    test_event_code: '',
    pixel_enabled: 'true',
    capi_enabled: 'true',
    base_price: '450',
    regular_price: '900',
    shipping_standard: '0',
    shipping_coastal: '50',
    stock_remaining: '14',
    announcement_text: '🔥 عرض خاص لفترة محدودة: خصم 50% + شحن مجاني لجميع المحافظات!',
    support_phone: '01012345678'
};

async function loadDynamicSettings() {
    let settings = { ...DEFAULT_SETTINGS };

    // Try localStorage first
    try {
        const local = localStorage.getItem('ihair_settings');
        if (local) {
            settings = { ...settings, ...JSON.parse(local) };
        }
    } catch (e) {
        console.warn('[Loader] Error reading settings from localStorage:', e);
    }

    // Try loading from Supabase settings table if accessible
    const client = getSupabaseClient();
    if (client) {
        try {
            const { data, error } = await client.from('settings').select('*');
            if (!error && data && data.length > 0) {
                data.forEach(item => {
                    if (item.key && item.value !== undefined) {
                        settings[item.key] = item.value;
                    }
                });
                // Cache back to localStorage
                localStorage.setItem('ihair_settings', JSON.stringify(settings));
                console.log('[Loader] Dynamic settings loaded from Supabase DB');
            }
        } catch (e) {
            console.log('[Loader] Could not fetch settings table from Supabase, using cached/defaults');
        }
    }

    applySettingsToDOM(settings);
    return settings;
}

function applySettingsToDOM(settings) {
    if (!settings) return;

    // 1. Announcement bar
    const announcementEl = document.querySelector('.announcement-bar span');
    if (announcementEl && settings.announcement_text) {
        announcementEl.textContent = settings.announcement_text;
    }

    // 2. Stock remaining
    const stockEl = document.querySelector('.cta-subtext');
    if (stockEl && settings.stock_remaining) {
        stockEl.textContent = `✨ متبقي ${settings.stock_remaining} عبوة فقط في العرض اليوم!`;
    }

    // 3. Hero Price Tag
    const priceValEl = document.querySelector('.badge-price .badge-val');
    if (priceValEl && settings.base_price) {
        priceValEl.textContent = `${settings.base_price} ج.م`;
    }

    const priceOldEl = document.querySelector('.badge-price .badge-old');
    if (priceOldEl && settings.regular_price) {
        priceOldEl.textContent = `بدلاً من ${settings.regular_price} ج.م`;
    }

    // 4. Sticky Footer Price Tag
    const footerPriceEl = document.querySelector('.footer-product-price');
    if (footerPriceEl && settings.base_price) {
        footerPriceEl.innerHTML = `${settings.base_price} ج.م <small class="free-ship-tag">شحن مجاني</small>`;
    }

    // 5. Pricing Section Display
    const pricingAmountEl = document.querySelector('.price-display .amount');
    if (pricingAmountEl && settings.base_price) {
        pricingAmountEl.textContent = settings.base_price;
    }

    const pricingStrikeEl = document.querySelector('.price-display .strike-price');
    if (pricingStrikeEl && settings.regular_price) {
        pricingStrikeEl.textContent = `بدلاً من ${settings.regular_price} جنيه`;
    }

    // 6. Coastal Shipping Note in table
    const coastalRowDiv = document.querySelector('.coastal-highlight div:nth-child(2)');
    if (coastalRowDiv && settings.shipping_coastal) {
        coastalRowDiv.textContent = parseInt(settings.shipping_coastal) === 0 ? 'شحن مجاني' : `${settings.shipping_coastal} جنيه فقط`;
    }

    // Save to window for index.js accessibility
    window.IHAIR_SETTINGS = settings;
}

async function loadDynamicImages() {
    const client = getSupabaseClient();
    if (!client) {
        console.log('[Loader] Supabase not available, using default images');
        return;
    }

    try {
        console.log('[Loader] Loading images from Supabase...');
        const { data, error } = await client.from('images').select('*');
        
        if (error) {
            console.error('[Loader] Error loading images:', error);
            return;
        }

        console.log(`[Loader] Loaded ${data?.length || 0} images from database`);

        // ALWAYS update customer opinions
        const customerOpinions = data?.filter(img => img.key.startsWith('customer_opinion_')) || [];
        updateCustomerOpinions(customerOpinions);

        // ALWAYS update before/after results
        const beforeAfterResults = data?.filter(img => img.key.startsWith('before_after_')) || [];
        updateBeforeAfterResults(beforeAfterResults);

        // Update hero product image
        const heroProduct = data?.find(img => img.key === 'hero_product');
        if (heroProduct && heroProduct.url) {
            const heroImg = document.querySelector('.product-hero-image');
            if (heroImg) {
                heroImg.src = heroProduct.url;
            }
        }

        // Update certificate image
        const certificate = data?.find(img => img.key === 'certificate');
        if (certificate && certificate.url) {
            const certImgs = document.querySelectorAll('.certificate-image-display, .certificate-modal-img');
            certImgs.forEach(img => {
                img.src = certificate.url;
            });
        }

    } catch (error) {
        console.error('[Loader] Error in loadDynamicImages:', error);
    }
}

function updateCustomerOpinions(opinions) {
    const reviewsTrack = document.getElementById('reviews-track');
    if (!reviewsTrack) return;

    opinions.sort((a, b) => {
        const numA = parseInt(a.key.split('_')[2]);
        const numB = parseInt(b.key.split('_')[2]);
        return numA - numB;
    });

    reviewsTrack.innerHTML = '';

    if (opinions.length === 0) {
        reviewsTrack.innerHTML = '<p style="text-align:center;color:#666;padding:40px;width:100%;">لا توجد آراء عملاء متاحة حالياً</p>';
        return;
    }

    opinions.forEach((opinion, index) => {
        if (!opinion.url) return;

        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        reviewCard.innerHTML = `
            <div class="review-card-inner">
                <img src="${opinion.url}" alt="رأي عميل ${index + 1}" class="review-card-img" loading="lazy">
            </div>
        `;
        reviewsTrack.appendChild(reviewCard);
    });

    setTimeout(() => {
        if (window.initializeReviewsCarousel) {
            window.initializeReviewsCarousel();
        }
    }, 100);
}

function updateBeforeAfterResults(results) {
    const resultsGrid = document.querySelector('.results-grid');
    if (!resultsGrid) return;

    results.sort((a, b) => {
        const numA = parseInt(a.key.split('_')[2]);
        const numB = parseInt(b.key.split('_')[2]);
        return numA - numB;
    });

    resultsGrid.innerHTML = '';

    if (results.length === 0) {
        resultsGrid.innerHTML = '<p style="text-align:center;color:#666;padding:40px;grid-column:1/-1;">لا توجد نتائج متاحة حالياً</p>';
        return;
    }

    results.forEach((result, index) => {
        if (!result.url) return;

        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <img src="${result.url}" alt="نتيجة عميل ${index + 1}" class="result-image">
        `;
        resultsGrid.appendChild(resultCard);
    });
}

// Load content when DOM is ready
async function initDynamicContent() {
    await loadDynamicSettings();
    await loadDynamicImages();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicContent);
} else {
    initDynamicContent();
}

