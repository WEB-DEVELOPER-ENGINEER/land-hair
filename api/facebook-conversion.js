/**
 * Facebook Conversions API - Server-Side Event Tracking
 * This serverless function sends conversion events directly to Facebook
 * 
 * Benefits:
 * - Bypasses ad blockers
 * - More reliable tracking
 * - Better attribution
 * - iOS 14+ compatible
 */

const https = require('https');
const crypto = require('crypto');

// Default Facebook Configuration
const DEFAULT_PIXEL_ID = '1009559858452835';
const DEFAULT_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || 'EAAOyWjBiFr8BR1XwqnDREIDyDXatlwoeeuWFoZBS8Agxv4hOkLqbqfe6dkM0mbhmVnrLEltavpQdrkFmVjfaB0lfZCrXjvRDAIV74s1ZBesffgZAxQUndhbWZAZAWKAlaA2njp9w9VMNkSFSRxR7U0EAPiFCH2oJvDGIZCQnJGscnrxoaIv6IFt93AVhOZA8JDJZBCQZDZD';
const API_VERSION = 'v18.0';

/**
 * Hash data for privacy (required by Facebook)
 */
function hashData(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
}

/**
 * Make HTTPS request to Facebook API
 */
function sendToFacebook(pixelId, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        
        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/${API_VERSION}/${pixelId}/events`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data, 'utf8')
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (res.statusCode === 200) {
                        resolve(result);
                    } else {
                        reject({ statusCode: res.statusCode, error: result });
                    }
                } catch (error) {
                    reject({ statusCode: res.statusCode, error: responseData });
                }
            });
        });
        
        req.on('error', (error) => {
            reject({ error: error.message });
        });
        
        req.write(data);
        req.end();
    });
}

/**
 * Main handler function
 */
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const {
            pixelId: customPixelId,
            accessToken: customAccessToken,
            testEventCode,
            eventName,
            eventSourceUrl,
            name,
            phone,
            governorate,
            address,
            quantity,
            subtotal,
            shippingCost,
            total,
            userAgent,
            clientIp,
            fbp,
            fbc
        } = req.body;
        
        const pixelId = customPixelId || DEFAULT_PIXEL_ID;
        const accessToken = customAccessToken || DEFAULT_ACCESS_TOKEN;

        // Validate required fields
        if (!eventName) {
            return res.status(400).json({ error: 'eventName is required' });
        }
        
        // Prepare user data (hashed for privacy)
        const userData = {
            client_ip_address: clientIp || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1',
            client_user_agent: userAgent || req.headers['user-agent']
        };
        
        // Add phone if provided (hash it)
        if (phone) {
            const cleanPhone = phone.replace(/^0+/, '');
            userData.ph = hashData(`+20${cleanPhone}`);
        }
        
        // Add name if provided
        if (name) {
            const nameParts = name.trim().split(/\s+/);
            if (nameParts.length > 0) {
                userData.fn = hashData(nameParts[0]);
            }
            if (nameParts.length > 1) {
                userData.ln = hashData(nameParts[nameParts.length - 1]);
            }
        }
        
        // Add governorate as city (hashed)
        if (governorate) {
            userData.ct = hashData(governorate);
        }
        
        // Add Facebook Click ID and Browser ID if available
        if (fbp) userData.fbp = fbp;
        if (fbc) userData.fbc = fbc;
        
        // Prepare custom data
        const customData = {
            currency: 'EGP',
            content_type: 'product',
            content_ids: ['ihair-serum'],
            content_name: 'سيرم iHair للشعر'
        };
        
        // Add value and quantity based on event
        if (eventName === 'Purchase' || eventName === 'InitiateCheckout') {
            if (total) customData.value = parseFloat(total);
            if (quantity) customData.num_items = parseInt(quantity);
        } else if (eventName === 'AddToCart' || eventName === 'ViewContent') {
            if (subtotal) customData.value = parseFloat(subtotal);
            if (quantity) customData.num_items = parseInt(quantity);
        }
        
        // Add delivery category for Purchase events
        if (eventName === 'Purchase' && shippingCost !== undefined) {
            customData.delivery_category = shippingCost === 0 ? 'home_delivery_free' : 'home_delivery_paid';
        }
        
        // Prepare event data
        const eventData = {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_source_url: eventSourceUrl || req.headers.referer || 'https://ihair-egypt.com',
            action_source: 'website',
            user_data: userData,
            custom_data: customData
        };
        
        // Generate event_id for deduplication
        eventData.event_id = crypto.randomBytes(16).toString('hex');
        
        // Prepare request payload
        const payload = {
            data: [eventData],
            access_token: accessToken
        };

        if (testEventCode) {
            payload.test_event_code = testEventCode;
        }
        
        console.log('[Facebook CAPI] Sending event:', {
            event: eventName,
            pixelId,
            testEventCode: testEventCode || 'none',
            value: customData.value
        });
        
        // Send to Facebook
        try {
            const result = await sendToFacebook(pixelId, payload);
            
            console.log('[Facebook CAPI] Success:', result);
            
            return res.status(200).json({
                success: true,
                eventId: eventData.event_id,
                eventsReceived: result.events_received,
                fbResponse: result,
                message: 'Event sent successfully'
            });
        } catch (fbError) {
            console.error('[Facebook CAPI] Error response:', fbError);
            return res.status(500).json({
                success: false,
                error: 'Facebook API error',
                details: fbError
            });
        }
        
    } catch (error) {
        console.error('[Facebook CAPI] Server error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
