/**
 * Facebook Conversions API Client
 * Sends server-side events for better tracking reliability
 */

// Configuration
const CAPI_ENDPOINT = '/api/facebook-conversion';

/**
 * Get saved settings from localStorage or global config
 */
function getSettings() {
    try {
        const stored = localStorage.getItem('ihair_settings');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[FB CAPI Client] Could not read settings from localStorage');
    }
    return {
        pixel_id: '1009559858452835',
        fb_access_token: 'EAAOyWjBiFr8BR1XwqnDREIDyDXatlwoeeuWFoZBS8Agxv4hOkLqbqfe6dkM0mbhmVnrLEltavpQdrkFmVjfaB0lfZCrXjvRDAIV74s1ZBesffgZAxQUndhbWZAZAWKAlaA2njp9w9VMNkSFSRxR7U0EAPiFCH2oJvDGIZCQnJGscnrxoaIv6IFt93AVhOZA8JDJZBCQZDZD',
        test_event_code: '',
        capi_enabled: true
    };
}

/**
 * Get Facebook Click ID (fbc) from URL or cookie
 */
function getFacebookClickId() {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');
    
    if (fbclid) {
        const timestamp = Date.now();
        return `fb.1.${timestamp}.${fbclid}`;
    }
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === '_fbc') {
            return value;
        }
    }
    
    return null;
}

/**
 * Get Facebook Browser ID (fbp) from cookie
 */
function getFacebookBrowserId() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === '_fbp') {
            return value;
        }
    }
    return null;
}

/**
 * Send event to Facebook via Conversions API
 */
async function sendFacebookConversionEvent(eventName, eventData = {}) {
    const settings = getSettings();
    
    // Check if CAPI is explicitly disabled
    if (settings.capi_enabled === false || settings.capi_enabled === 'false') {
        console.log('[FB CAPI Client] CAPI is disabled in admin settings. Skipping event:', eventName);
        return null;
    }
    
    try {
        const payload = {
            eventName: eventName,
            pixelId: settings.pixel_id,
            accessToken: settings.fb_access_token,
            testEventCode: settings.test_event_code || undefined,
            eventSourceUrl: window.location.href,
            userAgent: navigator.userAgent,
            fbp: getFacebookBrowserId(),
            fbc: getFacebookClickId(),
            ...eventData
        };
        
        console.log('[FB CAPI Client] Sending event:', eventName, payload);
        
        const response = await fetch(CAPI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('[FB CAPI Client] Event sent successfully:', eventName, result);
            return result;
        } else {
            console.error('[FB CAPI Client] Failed to send event:', result.error, result);
            return result;
        }
        
    } catch (error) {
        console.error('[FB CAPI Client] Error sending event:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Track ViewContent event
 */
async function trackViewContent(subtotal = 450) {
    return sendFacebookConversionEvent('ViewContent', {
        quantity: 1,
        subtotal: subtotal
    });
}

/**
 * Track AddToCart event
 */
async function trackAddToCart(quantity, subtotal) {
    return sendFacebookConversionEvent('AddToCart', {
        quantity: quantity,
        subtotal: subtotal
    });
}

/**
 * Track InitiateCheckout event
 */
async function trackInitiateCheckout(quantity, total) {
    return sendFacebookConversionEvent('InitiateCheckout', {
        quantity: quantity,
        total: total
    });
}

/**
 * Track Purchase event (CONVERSION!)
 */
async function trackPurchase(orderData) {
    return sendFacebookConversionEvent('Purchase', orderData);
}

// Export functions
window.FacebookCAPI = {
    sendFacebookConversionEvent,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    getSettings
};

