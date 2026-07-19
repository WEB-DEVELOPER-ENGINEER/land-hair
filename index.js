document.addEventListener('DOMContentLoaded', () => {
    
    // Track Facebook Pixel ViewContent Event on page load (Browser-side)
    if (typeof fbq !== 'undefined') {
        fbq('track', 'ViewContent', {
            content_name: 'سيرم iHair للشعر',
            content_type: 'product',
            content_ids: ['ihair-serum'],
            value: 450,
            currency: 'EGP'
        });
        console.log('[FB Pixel] ViewContent event tracked');
    }
    
    // Track ViewContent via Conversions API (Server-side)
    if (typeof FacebookCAPI !== 'undefined') {
        FacebookCAPI.trackViewContent();
    }

    // ==========================================
    // 1. Before & After Slider Logic
    // ==========================================
    const slides = document.querySelectorAll('.proof-slide');

    function initSlider(slide) {
        const rangeInput = slide.querySelector('.comparison-range');
        const imgAfter = slide.querySelector('.image-after');
        const handle = slide.querySelector('.slider-handle');

        if (!rangeInput || !imgAfter || !handle) return;

        // Force the slider container and input to LTR to ensure consistent behavior across browsers
        const sliderContainer = slide.querySelector('.comparison-slider');
        if (sliderContainer) {
            sliderContainer.style.direction = 'ltr';
            rangeInput.style.direction = 'ltr';
        }

        const updateSlider = () => {
            const val = rangeInput.value;
            // Since LTR is forced:
            // val% is the position from the left.
            // .image-after is visible on the left side, so we clip its right side:
            // clip-path: inset(top right bottom left) -> inset(0 (100 - val)% 0 0)
            imgAfter.style.clipPath = `inset(0 ${100 - val}% 0 0)`;
            handle.style.left = `${val}%`;
        };

        rangeInput.addEventListener('input', updateSlider);
        // Run once initially
        updateSlider();
    }

    // Initialize all sliders
    slides.forEach(initSlider);


    // ==========================================
    // 2. Before & After Tabs Switcher
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked tab
            btn.classList.add('active');

            const tabIndex = btn.getAttribute('data-tab');

            // Hide all slides
            slides.forEach(slide => slide.classList.remove('active'));
            
            // Show target slide
            const targetSlide = document.getElementById(`slide-${tabIndex}`);
            if (targetSlide) {
                targetSlide.classList.add('active');
                // Re-initialize the active slider just in case of layout reflows
                initSlider(targetSlide);
            }
        });
    });


    // ==========================================
    // 3. FAQ Accordion Logic
    // ==========================================
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isActive = item.classList.contains('active');

            // Close all FAQ items
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

            // Toggle current if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });


    // ==========================================
    // 4. Order Form Calculator & Validation
    // ==========================================
    const orderForm = document.getElementById('lead-order-form');
    const selectGov = document.getElementById('select-gov');
    const calcShippingCost = document.getElementById('calc-shipping-cost');
    const calcTotalCost = document.getElementById('calc-total-cost');
    const calcQuantityDisplay = document.getElementById('calc-quantity-display');
    const calcSubtotal = document.getElementById('calc-subtotal');
    
    // Quantity controls
    const qtyInput = document.getElementById('quantity-input');
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');

    // List of coastal governorate values
    const coastalGovs = ['hurghada', 'matrouh', 'north_coast', 'sharm', 'sokhna', 'new_valley'];
    
    function getBasePrice() {
        if (window.IHAIR_SETTINGS && window.IHAIR_SETTINGS.base_price) {
            return parseFloat(window.IHAIR_SETTINGS.base_price) || 450;
        }
        try {
            const local = localStorage.getItem('ihair_settings');
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed.base_price) return parseFloat(parsed.base_price) || 450;
            }
        } catch (e) {}
        return 450;
    }

    function getShippingCost(govValue) {
        if (!govValue) return null;
        let coastalCost = 50;
        if (window.IHAIR_SETTINGS && window.IHAIR_SETTINGS.shipping_coastal !== undefined) {
            coastalCost = parseFloat(window.IHAIR_SETTINGS.shipping_coastal);
        } else {
            try {
                const local = localStorage.getItem('ihair_settings');
                if (local) {
                    const parsed = JSON.parse(local);
                    if (parsed.shipping_coastal !== undefined) coastalCost = parseFloat(parsed.shipping_coastal);
                }
            } catch (e) {}
        }
        return coastalGovs.includes(govValue) ? coastalCost : 0;
    }

    // Get current quantity
    function getQuantity() {
        const qty = parseInt(qtyInput.value) || 1;
        return Math.max(1, Math.min(99, qty)); // Clamp between 1 and 99
    }
    
    // Update quantity in input
    function setQuantity(qty) {
        const clamped = Math.max(1, Math.min(99, qty));
        const oldQty = parseInt(qtyInput.value) || 1;
        qtyInput.value = clamped;
        
        // Update button states
        qtyMinus.disabled = clamped <= 1;
        qtyPlus.disabled = clamped >= 99;
        
        // Track AddToCart event when quantity increases above 1
        if (clamped > oldQty && clamped > 1 && typeof fbq !== 'undefined') {
            const subtotal = getBasePrice() * clamped;
            
            // Browser-side tracking
            fbq('track', 'AddToCart', {
                value: subtotal,
                currency: 'EGP',
                content_name: 'سيرم iHair للشعر',
                content_type: 'product',
                content_ids: ['ihair-serum'],
                num_items: clamped
            });
            console.log('[FB Pixel] AddToCart event tracked:', { quantity: clamped });
            
            // Server-side tracking
            if (typeof FacebookCAPI !== 'undefined') {
                FacebookCAPI.trackAddToCart(clamped, subtotal);
            }
        }
        
        // Visual feedback - add animation class
        qtyInput.style.transform = 'scale(1.1)';
        setTimeout(() => {
            qtyInput.style.transform = 'scale(1)';
        }, 150);
        
        // Update price display
        updatePriceDisplay();
    }

    function updatePriceDisplay() {
        const govValue = selectGov.value;
        const shipping = getShippingCost(govValue);
        const quantity = getQuantity();
        const basePrice = getBasePrice();
        const subtotal = basePrice * quantity;
        const total = subtotal + (shipping || 0);
        
        // Update quantity display
        if (calcQuantityDisplay) {
            calcQuantityDisplay.textContent = quantity;
            calcQuantityDisplay.style.transform = 'scale(1.15)';
            calcQuantityDisplay.style.color = 'var(--color-accent)';
            setTimeout(() => {
                calcQuantityDisplay.style.transform = 'scale(1)';
                calcQuantityDisplay.style.color = 'var(--color-primary)';
            }, 200);
        }

        // Update single bottle price in calc row
        const singlePriceRow = document.querySelector('.calc-row:nth-child(1) .calc-val');
        if (singlePriceRow) {
            singlePriceRow.textContent = `${basePrice} جنيه`;
        }
        
        // Update subtotal
        if (calcSubtotal) {
            calcSubtotal.textContent = `${subtotal} جنيه`;
            calcSubtotal.style.transform = 'scale(1.1)';
            setTimeout(() => {
                calcSubtotal.style.transform = 'scale(1)';
            }, 200);
        }

        if (shipping === null) {
            calcShippingCost.textContent = 'حدد المحافظة أولاً';
            calcShippingCost.style.color = 'var(--color-gray-text)';
            calcTotalCost.textContent = `${subtotal} جنيه`;
        } else if (shipping === 0) {
            calcShippingCost.textContent = 'شحن مجاني';
            calcShippingCost.style.color = 'var(--color-primary-light)';
            calcTotalCost.textContent = `${total} جنيه مصري`;
        } else {
            calcShippingCost.textContent = `${shipping} جنيه مصري`;
            calcShippingCost.style.color = 'var(--color-dark)';
            calcTotalCost.textContent = `${total} جنيه مصري`;
        }
        
        // Animate total
        calcTotalCost.style.transform = 'scale(1.15)';
        setTimeout(() => {
            calcTotalCost.style.transform = 'scale(1)';
        }, 300);
    }

    selectGov.addEventListener('change', updatePriceDisplay);
    
    // Initialize
    setQuantity(1);

    // Form Validation helper
    function validateField(inputElement, errorElement, validationFn) {
        const value = inputElement.value.trim();
        const isValid = validationFn(value);
        const group = inputElement.closest('.form-group');

        if (!isValid) {
            group.classList.add('has-error');
        } else {
            group.classList.remove('has-error');
        }
        return isValid;
    }

    // Validation definitions
    const validateName = (val) => val.length > 0 && val.split(/\s+/).filter(Boolean).length >= 2;
    const validatePhone = (val) => /^01[0125][0-9]{8}$/.test(val);
    const validateGov = (val) => val !== '';
    const validateAddress = (val) => val.length >= 8;

    // Realtime validation on input loss of focus
    const inputName = document.getElementById('input-name');
    const inputPhone = document.getElementById('input-phone');
    const inputAddress = document.getElementById('input-address');

    inputName.addEventListener('blur', () => validateField(inputName, null, validateName));
    inputPhone.addEventListener('blur', () => validateField(inputPhone, null, validatePhone));
    selectGov.addEventListener('blur', () => validateField(selectGov, null, validateGov));
    inputAddress.addEventListener('blur', () => validateField(inputAddress, null, validateAddress));

    // ==========================================
    // Google Sheets Integration Configuration
    // ==========================================
    const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzeb4UqSxZI7eJiE-i0NB6WWKZswtagKu3j6twRtZ8jA_XKqlPRmO2mpgWAR6EaQZCf/exec';

    // Function to send data to Google Sheets
    async function sendToGoogleSheets(orderData) {
        try {
            await fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending to Google Sheets:', error);
            return { success: true, error: error.message };
        }
    }

    // Save lead locally for Admin Dashboard viewing
    function saveLeadLocally(leadData) {
        try {
            const leads = JSON.parse(localStorage.getItem('ihair_leads') || '[]');
            leads.unshift({
                id: 'ORD-' + Date.now().toString(36).toUpperCase(),
                date: new Date().toISOString(),
                status: 'جديد',
                ...leadData
            });
            localStorage.setItem('ihair_leads', JSON.stringify(leads));
        } catch (e) {
            console.error('[Index] Error saving lead locally:', e);
        }
    }

    // Form Submission
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const basePrice = getBasePrice();
        const quantity = getQuantity();
        const govVal = selectGov.value;
        const shipping = getShippingCost(govVal);
        const subtotal = basePrice * quantity;
        const total = subtotal + shipping;
        
        // Track Facebook Pixel InitiateCheckout Event (Browser-side)
        if (typeof fbq !== 'undefined') {
            fbq('track', 'InitiateCheckout', {
                value: total,
                currency: 'EGP',
                content_name: 'سيرم iHair للشعر',
                content_type: 'product',
                content_ids: ['ihair-serum'],
                num_items: quantity
            });
            console.log('[FB Pixel] InitiateCheckout event tracked');
        }
        
        // Track InitiateCheckout via Conversions API (Server-side)
        if (typeof FacebookCAPI !== 'undefined') {
            FacebookCAPI.trackInitiateCheckout(quantity, total);
        }

        // Run all validations
        const isNameValid = validateField(inputName, null, validateName);
        const isPhoneValid = validateField(inputPhone, null, validatePhone);
        const isGovValid = validateField(selectGov, null, validateGov);
        const isAddressValid = validateField(inputAddress, null, validateAddress);

        if (isNameValid && isPhoneValid && isGovValid && isAddressValid) {
            const name = inputName.value.trim();
            const phone = inputPhone.value.trim();
            const govText = selectGov.options[selectGov.selectedIndex].text;
            const address = inputAddress.value.trim();

            const orderData = {
                name: name,
                phone: phone,
                governorate: govText,
                address: address,
                quantity: quantity,
                unitPrice: `${basePrice} جنيه`,
                subtotal: `${subtotal} جنيه`,
                shippingCost: shipping === 0 ? 'مجاني' : `${shipping} جنيه`,
                total: `${total} جنيه`
            };

            // Save lead locally so Admin Dashboard can view and manage leads!
            saveLeadLocally({
                name,
                phone,
                governorate: govText,
                address,
                quantity,
                unitPrice: basePrice,
                subtotal,
                shippingCost: shipping,
                total
            });

            // Disable submit button
            const submitBtn = document.getElementById('submit-order-btn');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>جاري الإرسال...</span>';

            // Send to Google Sheets
            await sendToGoogleSheets(orderData);

            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            
            // Track Facebook Pixel Purchase Event (Browser-side)
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Purchase', {
                    value: total,
                    currency: 'EGP',
                    content_name: 'سيرم iHair للشعر',
                    content_type: 'product',
                    content_ids: ['ihair-serum'],
                    num_items: quantity,
                    delivery_category: shipping === 0 ? 'home_delivery_free' : 'home_delivery_paid'
                });
                console.log('[FB Pixel] Purchase event tracked:', { value: total, quantity });
            }
            
            // Track Purchase via Conversions API (Server-side)
            if (typeof FacebookCAPI !== 'undefined') {
                const purchaseData = {
                    name: name,
                    phone: phone,
                    governorate: govText,
                    address: address,
                    quantity: quantity,
                    subtotal: subtotal,
                    shippingCost: shipping,
                    total: total
                };
                FacebookCAPI.trackPurchase(purchaseData);
                console.log('[FB CAPI] Purchase event sent with full order data');
            }

            // Populate summary card
            document.getElementById('summary-name').textContent = name;
            document.getElementById('summary-phone').textContent = phone;
            document.getElementById('summary-gov').textContent = govText;
            document.getElementById('summary-total').textContent = `${total} جنيه مصري (الدفع عند الاستلام) - الكمية: ${quantity}`;

            // Show Popup Modal
            document.getElementById('success-popup').classList.add('show');

            // Reset Form
            orderForm.reset();
            setQuantity(1);
            updatePriceDisplay();
        } else {
            const firstError = document.querySelector('.form-group.has-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    // Close success popup
    document.getElementById('close-success-popup').addEventListener('click', () => {
        document.getElementById('success-popup').classList.remove('show');
    });


    // ==========================================
    // 5. Sticky Footer Visibility on Scroll
    // ==========================================
    const stickyFooter = document.getElementById('floating-sticky-footer');
    const heroSection = document.querySelector('.hero-section');
    const bottomFooter = document.querySelector('.bottom-footer');

    // Track whether the bottom footer is in view (used to hide sticky footer)
    let isBottomFooterVisible = false;

    function updateStickyFooterVisibility() {
        if (!stickyFooter) return;

        // Force-hide the sticky footer when the page bottom footer is visible
        if (isBottomFooterVisible) {
            stickyFooter.classList.remove('visible');
            return;
        }

        // Normal scroll logic: show after scrolling past the hero section
        if (!heroSection) return;
        const heroHeight = heroSection.offsetHeight;
        const scrollPos = window.scrollY;

        if (scrollPos > heroHeight - 100) {
            stickyFooter.classList.add('visible');
        } else {
            stickyFooter.classList.remove('visible');
        }
    }

    if (stickyFooter && heroSection) {
        window.addEventListener('scroll', updateStickyFooterVisibility, { passive: true });
    }

    // Watch the bottom footer via IntersectionObserver so the sticky footer
    // disappears as soon as the user reaches the very end of the page.
    if (stickyFooter && bottomFooter && 'IntersectionObserver' in window) {
        const footerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isBottomFooterVisible = entry.isIntersecting;
                updateStickyFooterVisibility();
            });
        }, { threshold: 0.1 });
        footerObserver.observe(bottomFooter);
    }


    // ==========================================
    // 6. Countdown Timer Logic
    // ==========================================
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    // Countdown: Start with 2 hours, 45 minutes, 30 seconds
    let totalSeconds = (2 * 3600) + (45 * 60) + 30;

    function updateTimer() {
        if (totalSeconds <= 0) {
            // Reset timer back to 2h 45m 30s to keep urgency active for future visitors
            totalSeconds = (2 * 3600) + (45 * 60) + 30;
        }

        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        hoursEl.textContent = String(hrs).padStart(2, '0');
        minutesEl.textContent = String(mins).padStart(2, '0');
        secondsEl.textContent = String(secs).padStart(2, '0');

        totalSeconds--;
    }

    // Run timer immediately and set interval
    updateTimer();
    setInterval(updateTimer, 1000);


    // ==========================================
    // 7. Customer Reviews Carousel Logic
    // ==========================================
    
    // Make carousel initialization a global function so it can be called after dynamic updates
    window.initializeReviewsCarousel = function() {
        const reviewsTrack = document.getElementById('reviews-track');
        const prevBtn = document.getElementById('carousel-prev-btn');
        const nextBtn = document.getElementById('carousel-next-btn');
        const dotsContainer = document.getElementById('carousel-dots');

        if (!reviewsTrack || !prevBtn || !nextBtn) {
            console.warn('[Carousel] Required elements not found');
            return;
        }

        // Remove old event listeners by cloning buttons
        const newPrevBtn = prevBtn.cloneNode(true);
        const newNextBtn = nextBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

        const cards = reviewsTrack.querySelectorAll('.review-card');

        if (cards.length === 0) {
            console.warn('[Carousel] No review cards found');
            return;
        }

        console.log(`[Carousel] Initializing with ${cards.length} cards`);

        // Detect RTL once (page direction controls scroll direction)
        const isRTL = (window.getComputedStyle(reviewsTrack).direction === 'rtl') ||
                      (document.documentElement.dir === 'rtl');

        function getScrollStep() {
            if (cards.length === 0) return 0;
            const cardWidth = cards[0].offsetWidth;
            const trackStyle = window.getComputedStyle(reviewsTrack);
            const gap = parseFloat(trackStyle.gap) || 0;
            return cardWidth + gap;
        }

        // Maximum scrollable index based on actual scrollable width
        function getMaxIndex() {
            const step = getScrollStep();
            if (step === 0) return 0;
            const maxScroll = reviewsTrack.scrollWidth - reviewsTrack.clientWidth;
            return Math.max(0, Math.round(maxScroll / step));
        }

        // Get current card index from scroll position (works for both LTR & RTL)
        function getCurrentIndex() {
            const step = getScrollStep();
            if (step === 0) return 0;
            return Math.round(Math.abs(reviewsTrack.scrollLeft) / step);
        }

        // Scroll to a specific card index (clamped to valid range)
        function scrollToIndex(index) {
            const maxIdx = getMaxIndex();
            const targetIdx = Math.max(0, Math.min(index, maxIdx));
            const step = getScrollStep();
            const target = targetIdx * step;
            // In RTL browsers expect negative scrollLeft for forward scroll
            const actualTarget = isRTL ? -target : target;
            
            console.log(`[Carousel] Scrolling to index ${targetIdx}, position: ${actualTarget}px`);
            reviewsTrack.scrollTo({ left: actualTarget, behavior: 'smooth' });
        }

        newPrevBtn.addEventListener('click', () => {
            console.log('[Carousel] Prev button clicked');
            scrollToIndex(getCurrentIndex() - 1);
        });

        newNextBtn.addEventListener('click', () => {
            console.log('[Carousel] Next button clicked');
            scrollToIndex(getCurrentIndex() + 1);
        });

        // Update arrow + dot state based on scroll position
        function updateCarouselState() {
            const currentIndex = getCurrentIndex();
            const maxIdx = getMaxIndex();

            // Disable prev when at start, disable next when at end
            newPrevBtn.disabled = currentIndex <= 0;
            newNextBtn.disabled = currentIndex >= maxIdx;

            // Update dots
            if (dotsContainer && cards.length > 0) {
                const dots = dotsContainer.querySelectorAll('.carousel-dot');
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
            }
        }

        // Generate dot indicators (one per card)
        function buildDots() {
            if (!dotsContainer) return;
            dotsContainer.innerHTML = '';
            cards.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'carousel-dot';
                dot.setAttribute('aria-label', `الانتقال إلى الرأي ${i + 1}`);
                dot.addEventListener('click', () => {
                    scrollToIndex(i);
                });
                dotsContainer.appendChild(dot);
            });
        }

        buildDots();
        
        // Remove old scroll listener
        reviewsTrack.removeEventListener('scroll', updateCarouselState);
        reviewsTrack.addEventListener('scroll', updateCarouselState);
        
        // Initial state — wait for layout
        requestAnimationFrame(updateCarouselState);
        
        console.log('[Carousel] Initialization complete');
    };

    // Initialize carousel on page load
    window.initializeReviewsCarousel();


    // ==========================================
    // 8. Certificate Modal (Warranty)
    // ==========================================
    const certModal = document.getElementById('certificate-modal');
    const certOpenBtns = document.querySelectorAll('.cert-open-btn');
    const certClose = document.getElementById('certificate-modal-close');

    if (certModal && certOpenBtns.length > 0 && certClose) {
        function openCertModal() {
            certModal.classList.add('show');
            certModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeCertModal() {
            certModal.classList.remove('show');
            certModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        // Bind to every trigger button (pricing section, footer, etc.)
        certOpenBtns.forEach(btn => btn.addEventListener('click', openCertModal));
        certClose.addEventListener('click', closeCertModal);

        // Close on backdrop click
        certModal.addEventListener('click', (e) => {
            if (e.target === certModal) closeCertModal();
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && certModal.classList.contains('show')) {
                closeCertModal();
            }
        });
    }


    // ==========================================
    // 9. Review Image Lightbox (tap-to-zoom)
    // ==========================================
    const lightbox = document.getElementById('review-lightbox');
    const lightboxImg = document.getElementById('review-lightbox-img');
    const lightboxClose = document.getElementById('review-lightbox-close');
    const reviewsTrackForLightbox = document.getElementById('reviews-track');
    const reviewImgs = reviewsTrackForLightbox ? reviewsTrackForLightbox.querySelectorAll('.review-card-img') : [];

    if (lightbox && lightboxImg && lightboxClose && reviewImgs.length > 0) {
        function openLightbox(src, alt) {
            lightboxImg.src = src;
            lightboxImg.alt = alt || 'رأي العميل';
            lightbox.classList.add('show');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            lightbox.classList.remove('show');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            // Clear src after fade-out for memory cleanup
            setTimeout(() => { lightboxImg.src = ''; }, 300);
        }

        // Bind click to each review image
        reviewImgs.forEach(img => {
            img.addEventListener('click', (e) => {
                e.preventDefault();
                openLightbox(img.src, img.alt);
            });
            // Keyboard accessibility (Enter on focused image)
            img.setAttribute('tabindex', '0');
            img.setAttribute('role', 'button');
            img.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(img.src, img.alt);
                }
            });
        });

        lightboxClose.addEventListener('click', closeLightbox);

        // Close on backdrop click (anywhere on the lightbox except the image)
        lightbox.addEventListener('click', (e) => {
            if (e.target !== lightboxImg) closeLightbox();
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('show')) {
                closeLightbox();
            }
        });
    }
});
