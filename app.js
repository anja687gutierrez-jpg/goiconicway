/**
 * GoIconicWay — app.js
 * Phase 3: Modular JS Architecture (IIFE, zero globals)
 * Modules: Analytics, CoreUI, Booking, KlausyAI, LeadCapture
 */
(function() {
    'use strict';

    // =========================================================================
    // SITE CONFIG — only part that differs between AMA and GIW
    // =========================================================================
    const SITE_CONFIG = {
        SITE_ID: 'giw',
        DEFAULT_LANG: 'en',
        STORAGE_PREFIX: 'giw',
        CONCIERGE_API_URL: 'https://giw-api.anja687gutierrez.workers.dev/api/concierge',
        CHECKOUT_API: 'https://abenteuer-mieten-platform.vercel.app/api/public/checkout',
        BOOKING_SOURCE: 'goiconicway',
        GOOGLE_SHEETS_URL: 'https://script.google.com/macros/s/REPLACE_WITH_NEW_APPS_SCRIPT_ENDPOINT/exec',
        GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX',
        GOOGLE_ADS_ID: 'AW-XXXXXXXXXX',
        META_PIXEL_ID: 'XXXXXXXXXXXXXXXX',
        CLARITY_ID: 'XXXXXXXXXX',
        WHATSAPP_NUMBER: '13106006624',
        WHATSAPP_URL: 'https://wa.me/13106006624'
    };

    // =========================================================================
    // UTILITY: HTML Sanitizer (XSS prevention for AI concierge output)
    // =========================================================================
    function sanitizeHTML(str) {
        var temp = document.createElement('div');
        temp.textContent = str;
        var sanitized = temp.innerHTML;
        // Allow basic formatting tags only
        sanitized = str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^>]*>/gi, '')
            .replace(/\bon\w+\s*=/gi, 'data-removed=');
        return sanitized;
    }

    // =========================================================================
    // UTILITY: Focus Trap (accessibility — keeps Tab inside open modals)
    // =========================================================================
    var _focusTrapHandler = null;
    var _lastFocused = null;
    var FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function trapFocus(modalEl) {
        _lastFocused = document.activeElement;
        var focusables = modalEl.querySelectorAll(FOCUSABLE_SELECTOR);
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];

        _focusTrapHandler = function(e) {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        modalEl.addEventListener('keydown', _focusTrapHandler);
        first.focus();
    }

    function releaseFocus(modalEl) {
        if (_focusTrapHandler && modalEl) {
            modalEl.removeEventListener('keydown', _focusTrapHandler);
        }
        _focusTrapHandler = null;
        if (_lastFocused && _lastFocused.focus) {
            _lastFocused.focus();
            _lastFocused = null;
        }
    }

    // =========================================================================
    // MODULE 1: Analytics
    // =========================================================================
    var Analytics = (function() {
        // Cookie helpers
        function getCookie(name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }

        function setCookie(name, value, days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = name + '=' + value + ';expires=' + date.toUTCString() + ';path=/;SameSite=Lax';
        }

        // Analytics loading functions
        function loadGoogleAnalytics() {
            if (!SITE_CONFIG.GA4_MEASUREMENT_ID || SITE_CONFIG.GA4_MEASUREMENT_ID.indexOf('XXXX') !== -1) {
                console.log('GA4: Please configure your Measurement ID');
                return;
            }
            var script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=' + SITE_CONFIG.GA4_MEASUREMENT_ID;
            document.head.appendChild(script);
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', SITE_CONFIG.GA4_MEASUREMENT_ID, {
                'anonymize_ip': true,
                'cookie_flags': 'SameSite=Lax;Secure'
            });
            console.log('GA4 loaded');
        }

        function loadGoogleAds() {
            if (SITE_CONFIG.GOOGLE_ADS_ID === 'AW-XXXXXXXXXX') return;
            if (window.gtag) {
                window.gtag('config', SITE_CONFIG.GOOGLE_ADS_ID);
            }
        }

        function loadMetaPixel() {
            if (SITE_CONFIG.META_PIXEL_ID === 'XXXXXXXXXXXXXXXX') return;
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            window.fbq('init', SITE_CONFIG.META_PIXEL_ID);
            window.fbq('track', 'PageView');
        }

        function loadMicrosoftClarity() {
            if (SITE_CONFIG.CLARITY_ID === 'XXXXXXXXXX') return;
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, 'clarity', 'script', SITE_CONFIG.CLARITY_ID);
        }

        function initializeAnalytics() {
            if (getCookie('analytics_cookies') === 'true') {
                loadGoogleAnalytics();
                loadMicrosoftClarity();
            }
        }

        function initializeMarketing() {
            if (getCookie('marketing_cookies') === 'true') {
                loadMetaPixel();
                loadGoogleAds();
            }
        }

        // Tracking object
        var tracker = {
            trackPageView: function(pageName) {
                if (window.gtag) window.gtag('event', 'page_view', { page_title: pageName });
                if (window.fbq) window.fbq('track', 'ViewContent', { content_name: pageName });
            },
            trackClick: function(buttonName, category) {
                if (window.gtag) window.gtag('event', 'click', { event_category: category || 'engagement', event_label: buttonName });
            },
            trackFormSubmit: function(formName) {
                if (window.gtag) window.gtag('event', 'form_submit', { event_category: 'lead', event_label: formName });
                if (window.fbq) window.fbq('track', 'Lead', { content_name: formName });
            },
            trackVehicleView: function(vehicleName, price) {
                if (window.gtag) window.gtag('event', 'view_item', { items: [{ item_name: vehicleName, price: price, currency: 'USD' }] });
                if (window.fbq) window.fbq('track', 'ViewContent', { content_name: vehicleName, content_type: 'vehicle', value: price, currency: 'USD' });
            },
            trackRouteView: function(routeName) {
                if (window.gtag) window.gtag('event', 'select_content', { content_type: 'route', item_id: routeName });
            },
            trackDownload: function(fileName) {
                if (window.gtag) window.gtag('event', 'file_download', { file_name: fileName, file_extension: 'kml' });
            },
            trackBookingInquiry: function(vehicle) {
                if (window.gtag) window.gtag('event', 'begin_checkout', { items: [{ item_name: vehicle }] });
                if (window.fbq) window.fbq('track', 'InitiateCheckout', { content_name: vehicle });
            },
            trackWhatsAppContact: function() {
                if (window.gtag) window.gtag('event', 'contact', { method: 'WhatsApp' });
                if (window.fbq) window.fbq('track', 'Contact');
            },
            trackLanguageChange: function(language) {
                if (window.gtag) window.gtag('event', 'select_content', { content_type: 'language', item_id: language });
            }
        };

        // Expose globally (required by inline tracking data attributes)
        window.AMA_Analytics = tracker;

        return {
            getCookie: getCookie,
            setCookie: setCookie,
            tracker: tracker,
            initializeAnalytics: initializeAnalytics,
            initializeMarketing: initializeMarketing,
            init: function() {
                // Cookie banner/consent handled in checkConsent
            },
            checkConsent: function() {
                var consent = getCookie('cookie_consent');
                if (!consent) {
                    var banner = document.getElementById('cookieBanner');
                    if (banner) setTimeout(function() { banner.classList.add('show'); }, 500);
                } else {
                    initializeAnalytics();
                    initializeMarketing();
                }
                setTimeout(function() {
                    if (getCookie('analytics_cookies') === 'true') {
                        tracker.trackPageView('Homepage');
                    }
                }, 1000);
            },
            // Cookie banner actions
            acceptAll: function() {
                setCookie('cookie_consent', 'all', 365);
                setCookie('analytics_cookies', 'true', 365);
                setCookie('marketing_cookies', 'true', 365);
                hideCookieBanner();
                closeCookieModal();
                initializeAnalytics();
                initializeMarketing();
            },
            declineOptional: function() {
                setCookie('cookie_consent', 'essential', 365);
                setCookie('analytics_cookies', 'false', 365);
                setCookie('marketing_cookies', 'false', 365);
                hideCookieBanner();
                closeCookieModal();
            },
            openSettings: function() {
                var modal = document.getElementById('cookieModal');
                if (modal) {
                    modal.classList.add('show');
                    var ac = document.getElementById('analyticsCookies');
                    var mc = document.getElementById('marketingCookies');
                    if (ac) ac.checked = getCookie('analytics_cookies') === 'true';
                    if (mc) mc.checked = getCookie('marketing_cookies') === 'true';
                    trapFocus(modal);
                }
            },
            closeSettings: function() {
                closeCookieModal();
            },
            saveCustom: function() {
                var analytics = document.getElementById('analyticsCookies');
                var marketing = document.getElementById('marketingCookies');
                var a = analytics ? analytics.checked : false;
                var m = marketing ? marketing.checked : false;
                setCookie('cookie_consent', 'custom', 365);
                setCookie('analytics_cookies', a.toString(), 365);
                setCookie('marketing_cookies', m.toString(), 365);
                hideCookieBanner();
                closeCookieModal();
                if (a) initializeAnalytics();
                if (m) initializeMarketing();
            }
        };

        function hideCookieBanner() {
            var banner = document.getElementById('cookieBanner');
            if (banner) banner.classList.remove('show');
        }
        function closeCookieModal() {
            var modal = document.getElementById('cookieModal');
            if (modal) {
                releaseFocus(modal);
                modal.classList.remove('show');
            }
        }
    })();

    // =========================================================================
    // MODULE 2: CoreUI
    // =========================================================================
    var CoreUI = (function() {
        var currentLang;

        function getLang() { return currentLang; }

        function setLanguage(lang) {
            currentLang = lang;
            localStorage.setItem(SITE_CONFIG.STORAGE_PREFIX + '_lang', lang);
            document.documentElement.setAttribute('lang', lang);
            document.body.className = document.body.className.replace(/\blang-\w+\b/g, '');
            document.body.classList.add('lang-' + lang);

            if (window.AMA_Analytics) window.AMA_Analytics.trackLanguageChange(lang);

            // Update toggle buttons
            var langToggle = document.getElementById('langToggle');
            if (langToggle) {
                langToggle.querySelectorAll('.lang-btn').forEach(function(btn) {
                    btn.classList.toggle('active', btn.dataset.lang === lang);
                });
            }

            // Update all translatable elements
            document.querySelectorAll('[data-de][data-en]').forEach(function(el) {
                var text = el.dataset[lang];
                if (!text) return;

                // Skip if element has a child span with its own data attributes
                var spanWithData = el.querySelector('span[data-de][data-en]');
                if (spanWithData) return;

                // No children — replace text directly
                if (!el.children.length) {
                    el.textContent = text;
                    return;
                }

                // Span child without data attributes (old structure)
                var plainSpan = Array.from(el.children).find(function(c) {
                    return c.tagName === 'SPAN' && !c.dataset.de;
                });
                if (plainSpan) {
                    plainSpan.textContent = text;
                    return;
                }

                // Icon + text pattern
                var icon = el.querySelector('i');
                if (icon && el.children.length === 1) {
                    var iconClone = icon.cloneNode(true);
                    el.innerHTML = '';
                    el.appendChild(iconClone);
                    el.appendChild(document.createTextNode(' ' + text));
                    return;
                }
            });

            // Update placeholders
            document.querySelectorAll('[data-de-placeholder][data-en-placeholder]').forEach(function(el) {
                el.placeholder = el.dataset[lang + 'Placeholder'];
            });
        }

        function initHeaderScroll() {
            var header = document.getElementById('header');
            if (!header) return;
            window.addEventListener('scroll', function() {
                if (window.scrollY > 50) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            });
        }

        function initMobileNav() {
            var toggle = document.getElementById('mobileMenuToggle');
            var overlay = document.getElementById('mobileNavOverlay');
            var drawer = document.getElementById('mobileNavDrawer');
            var close = document.getElementById('mobileNavClose');
            var links = document.querySelectorAll('.mobile-nav-link');

            function open() {
                if (toggle) toggle.classList.add('active');
                if (overlay) overlay.classList.add('active');
                if (drawer) drawer.classList.add('active');
                document.body.classList.add('menu-open');
            }
            function shut() {
                if (toggle) toggle.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (drawer) drawer.classList.remove('active');
                document.body.classList.remove('menu-open');
            }

            if (toggle) toggle.addEventListener('click', function() {
                drawer && drawer.classList.contains('active') ? shut() : open();
            });
            if (overlay) overlay.addEventListener('click', shut);
            if (close) close.addEventListener('click', shut);
            links.forEach(function(l) { l.addEventListener('click', shut); });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && drawer && drawer.classList.contains('active')) shut();
            });
            window.addEventListener('resize', function() {
                if (window.innerWidth > 768 && drawer && drawer.classList.contains('active')) shut();
            });
        }

        function initLanguageToggle() {
            currentLang = localStorage.getItem(SITE_CONFIG.STORAGE_PREFIX + '_lang') || SITE_CONFIG.DEFAULT_LANG;
            setLanguage(currentLang);

            var langToggle = document.getElementById('langToggle');
            if (langToggle) {
                langToggle.querySelectorAll('.lang-btn').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        setLanguage(btn.dataset.lang);
                    });
                });
            }
        }

        function initLegalModals() {
            // Close on overlay click
            document.querySelectorAll('.legal-modal-overlay').forEach(function(overlay) {
                overlay.addEventListener('click', function(e) {
                    if (e.target === overlay) {
                        overlay.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                });
            });

            // Close on Escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    document.querySelectorAll('.legal-modal-overlay.active').forEach(function(modal) {
                        releaseFocus(modal);
                        modal.classList.remove('active');
                    });
                    document.body.style.overflow = '';
                    // Also close cookie settings modal
                    var cookieModal = document.getElementById('cookieModal');
                    if (cookieModal && cookieModal.classList.contains('show')) {
                        Analytics.closeSettings();
                    }
                }
            });
        }

        function openModal(id) {
            var el = document.getElementById(id);
            if (el) {
                el.classList.add('active');
                document.body.style.overflow = 'hidden';
                trapFocus(el);
            }
        }
        function closeModal(id) {
            var el = document.getElementById(id);
            if (el) {
                releaseFocus(el);
                el.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        function initCardInfoPopups() {
            var overlay = document.createElement('div');
            overlay.className = 'card-info-overlay';
            document.body.appendChild(overlay);

            function closeCardModal() {
                overlay.classList.remove('active');
                overlay.innerHTML = '';
            }
            overlay.addEventListener('click', function(e) { if (e.target === overlay) closeCardModal(); });
            document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeCardModal(); });

            document.querySelectorAll('.card-info-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var src = btn.querySelector('.card-info-popup');
                    if (!src) return;
                    var clone = src.cloneNode(true);
                    var closeBtn = document.createElement('button');
                    closeBtn.className = 'popup-close';
                    closeBtn.innerHTML = '&times;';
                    closeBtn.setAttribute('aria-label', 'Close');
                    closeBtn.addEventListener('click', closeCardModal);
                    clone.insertBefore(closeBtn, clone.firstChild);
                    overlay.innerHTML = '';
                    overlay.appendChild(clone);
                    overlay.classList.add('active');
                });
            });
        }

        function initGearManifest() {
            document.querySelectorAll('.gear-toggle-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var wrap = this.closest('.card-img-wrap');
                    var manifest = wrap.querySelector('.gear-manifest');
                    var icon = this.querySelector('i');

                    // Close others
                    document.querySelectorAll('.gear-manifest.visible').forEach(function(m) {
                        if (m !== manifest) {
                            m.classList.remove('visible');
                            var otherBtn = m.closest('.card-img-wrap').querySelector('.gear-toggle-btn');
                            otherBtn.classList.remove('active');
                            otherBtn.querySelector('i').classList.replace('fa-times', 'fa-info');
                            m.closest('.card-img-wrap').classList.remove('manifest-active');
                        }
                    });

                    manifest.classList.toggle('visible');
                    this.classList.toggle('active');
                    wrap.classList.toggle('manifest-active');
                    if (manifest.classList.contains('visible')) icon.classList.replace('fa-info', 'fa-times');
                    else icon.classList.replace('fa-times', 'fa-info');
                });
            });

            document.addEventListener('click', function(e) {
                if (!e.target.closest('.card-img-wrap')) {
                    document.querySelectorAll('.gear-manifest.visible').forEach(function(m) {
                        m.classList.remove('visible');
                        var btn = m.closest('.card-img-wrap').querySelector('.gear-toggle-btn');
                        btn.classList.remove('active');
                        btn.querySelector('i').classList.replace('fa-times', 'fa-info');
                        m.closest('.card-img-wrap').classList.remove('manifest-active');
                    });
                }
            });
        }

        function initFAB() {
            var fab = document.getElementById('unifiedFab');
            var fabMain = document.getElementById('fabMain');
            if (!fab || !fabMain) return;

            fabMain.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                fab.classList.toggle('open');
                var icon = this.querySelector('i');
                if (fab.classList.contains('open')) {
                    icon.classList.remove('fa-headset');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-headset');
                }
            });

            document.addEventListener('click', function(e) {
                if (!e.target.closest('.unified-fab')) {
                    fab.classList.remove('open');
                    var icon = fabMain.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-headset');
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && fab.classList.contains('open')) {
                    fab.classList.remove('open');
                    fabMain.querySelector('i').className = 'fas fa-headset';
                    fabMain.focus();
                }
            });

            fab.querySelectorAll('.fab-option').forEach(function(option) {
                option.addEventListener('click', function(e) {
                    var action = this.getAttribute('data-action');
                    if (action === 'concierge') {
                        e.preventDefault();
                        fab.classList.remove('open');
                        fabMain.querySelector('i').className = 'fas fa-headset';
                        if (window.showKlausyHelp) setTimeout(window.showKlausyHelp, 300);
                    }
                    if (action === 'guide') {
                        e.preventDefault();
                        fab.classList.remove('open');
                        fabMain.querySelector('i').className = 'fas fa-headset';
                        var exitPopup = document.getElementById('exitPopup');
                        if (exitPopup) exitPopup.classList.add('active');
                    }
                });
            });
        }

        function initFlightPlan() {
            document.querySelectorAll('.flight-plan-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var card = this.closest('.route-card');
                    var btnText = this.querySelector('.btn-text');
                    card.classList.toggle('active');
                    if (card.classList.contains('active')) {
                        btnText.textContent = 'Close Plan';
                    } else {
                        btnText.textContent = 'View Itinerary';
                    }
                });
            });
        }

        function initFleetRentButtons() {
            var vehicleMap = {
                'Tesla Model Y Camping-Paket': 1,
                'Cybertruck Off-Grid': 2,
                'Model Y Budget': 3
            };
            document.querySelectorAll('.pokemon-card .rent-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var card = this.closest('.pokemon-card');
                    var carName = card.querySelector('.card-name').textContent.trim();
                    var carSelect = document.getElementById('carSelect');
                    if (carSelect && vehicleMap[carName] !== undefined) {
                        carSelect.selectedIndex = vehicleMap[carName];
                        carSelect.dispatchEvent(new Event('change'));
                    }
                    var bookingBar = document.getElementById('booking-bar');
                    if (bookingBar) bookingBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            });
        }

        function initAppDownload() {
            var btn = document.querySelector('.app-download-btn');
            if (btn) {
                btn.addEventListener('click', function() {
                    window.open(SITE_CONFIG.WHATSAPP_URL + '?text=' + encodeURIComponent('Hi! I\'m interested in the app. How can I download it?'), '_blank');
                });
            }
        }

        function initRouteConciergeButtons() {
            document.querySelectorAll('.route-concierge-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var prompt = this.dataset.promptEn;
                    var aiInput = document.getElementById('ai-input');
                    if (aiInput && prompt) {
                        aiInput.value = prompt;
                        aiInput.focus();
                    }
                    var concierge = document.getElementById('concierge');
                    if (concierge) concierge.scrollIntoView({ behavior: 'smooth' });
                });
            });
        }

        function initScrollSpy() {
            var mobileNavItems = document.querySelectorAll('.mobile-nav-item');
            var desktopNavLinks = document.querySelectorAll('.nav-links a[href^="#"]');
            var sectionNavMap = {
                'home': 'home', 'fleet': 'fleet', 'routes': 'routes',
                'testimonials': 'testimonials', 'contact': 'contact',
                'booking-bar': 'booking-bar', 'concept': 'fleet',
                'concierge': 'routes', 'founder': 'testimonials', 'app-portal': 'contact'
            };

            function updateActiveNav() {
                var current = 'home';
                var scrollPos = window.scrollY + 200;
                document.querySelectorAll('section[id]').forEach(function(section) {
                    if (scrollPos >= section.offsetTop - 100) {
                        current = sectionNavMap[section.id] || section.id;
                    }
                });
                if (window.scrollY < 100) current = 'home';

                mobileNavItems.forEach(function(item) {
                    item.classList.toggle('active', item.getAttribute('data-section') === current);
                });
                desktopNavLinks.forEach(function(link) {
                    var href = (link.getAttribute('href') || '').replace('#', '');
                    link.classList.toggle('active', href === current);
                });
            }

            var navScrollTimeout;
            window.addEventListener('scroll', function() {
                if (navScrollTimeout) return;
                navScrollTimeout = setTimeout(function() {
                    updateActiveNav();
                    navScrollTimeout = null;
                }, 50);
            }, { passive: true });

            mobileNavItems.forEach(function(item) {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    mobileNavItems.forEach(function(i) { i.classList.remove('active'); });
                    item.classList.add('active');
                    var targetId = item.getAttribute('href');
                    var target = document.querySelector(targetId);
                    if (target) {
                        window.scrollTo({
                            top: target.getBoundingClientRect().top + window.pageYOffset - 60,
                            behavior: 'smooth'
                        });
                    }
                });
            });

            updateActiveNav();
        }

        function initFloatingCta() {
            var floatingCta = document.getElementById('floating-cta');
            if (!floatingCta) return;
            floatingCta.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            floatingCta.style.opacity = '0';
            floatingCta.style.pointerEvents = 'none';
            floatingCta.style.transform = 'translateY(20px)';

            window.addEventListener('scroll', function() {
                if (window.innerWidth > 768) return;
                var bookingBar = document.getElementById('booking-bar');
                var bookingBarTop = bookingBar ? bookingBar.offsetTop : 500;
                if (window.scrollY > bookingBarTop + 200) {
                    floatingCta.style.opacity = '1';
                    floatingCta.style.pointerEvents = 'auto';
                    floatingCta.style.transform = 'translateY(0)';
                } else {
                    floatingCta.style.opacity = '0';
                    floatingCta.style.pointerEvents = 'none';
                    floatingCta.style.transform = 'translateY(20px)';
                }
                var footer = document.querySelector('footer');
                if (footer && window.scrollY + window.innerHeight > footer.offsetTop + 100) {
                    floatingCta.style.opacity = '0';
                    floatingCta.style.pointerEvents = 'none';
                }
            }, { passive: true });
        }

        function initMobileOptimizations() {
            // Remove video on mobile
            var video = document.querySelector('.hero-video');
            if (video && window.innerWidth <= 768) {
                video.removeAttribute('autoplay');
                video.pause();
                var source = video.querySelector('source');
                if (source) source.remove();
                video.load();
            }

            // Set default dates
            var startDate = document.getElementById('startDate');
            var returnDate = document.getElementById('returnDate');
            if (startDate && returnDate) {
                var today = new Date();
                var nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                var fmt = function(d) { return d.toISOString().split('T')[0]; };
                startDate.min = fmt(today);
                returnDate.min = fmt(today);
                startDate.value = fmt(today);
                returnDate.value = fmt(nextWeek);
            }

            // Haptic feedback
            document.querySelectorAll('.mobile-nav-item, .floating-cta').forEach(function(el) {
                el.addEventListener('touchstart', function() {
                    if ('vibrate' in navigator) navigator.vibrate(10);
                }, { passive: true });
            });
        }

        return {
            getLang: getLang,
            setLanguage: setLanguage,
            openModal: openModal,
            closeModal: closeModal,
            init: function() {
                initHeaderScroll();
                initMobileNav();
                initLanguageToggle();
                initLegalModals();
                initCardInfoPopups();
                initGearManifest();
                initFAB();
                initFlightPlan();
                initFleetRentButtons();
                initAppDownload();
                initRouteConciergeButtons();
                initScrollSpy();
                initFloatingCta();
                initMobileOptimizations();
            }
        };
    })();

    // =========================================================================
    // MODULE 3: Booking
    // =========================================================================
    var Booking = (function() {
        function init() {
            var form = document.getElementById('bookingForm');
            if (!form) return;

            var locationSelect = document.getElementById('pickupSelect');
            var carSelect = document.getElementById('carSelect');
            var startDateInput = document.getElementById('startDate');
            var returnDateInput = document.getElementById('returnDate');
            var checkBtn = form.querySelector('.check-btn');
            var estimateContainer = document.getElementById('bookingEstimate');
            var totalDaysEl = document.getElementById('totalDays');
            var totalCostEl = document.getElementById('totalCost');

            var today = new Date().toISOString().split('T')[0];
            if (startDateInput) startDateInput.setAttribute('min', today);
            if (returnDateInput) returnDateInput.setAttribute('min', today);

            function calculateEstimate() {
                if (!startDateInput.value || !returnDateInput.value) {
                    if (estimateContainer) estimateContainer.classList.remove('visible');
                    return;
                }
                var start = new Date(startDateInput.value);
                var end = new Date(returnDateInput.value);
                if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
                    if (estimateContainer) estimateContainer.classList.remove('visible');
                    return;
                }
                var days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                var selectedOption = carSelect.options[carSelect.selectedIndex];
                if (!selectedOption.getAttribute('data-price')) {
                    if (estimateContainer) estimateContainer.classList.remove('visible');
                    return;
                }
                var pricePerDay = parseInt(selectedOption.getAttribute('data-price'));
                var totalPrice = days * pricePerDay;
                if (totalDaysEl) totalDaysEl.textContent = days === 1 ? '1 day' : days + ' days';
                if (totalCostEl) totalCostEl.textContent = '$' + totalPrice.toLocaleString();
                if (estimateContainer) estimateContainer.classList.add('visible');
            }

            if (startDateInput && returnDateInput) {
                startDateInput.addEventListener('change', function() {
                    returnDateInput.setAttribute('min', this.value);
                    if (returnDateInput.value && returnDateInput.value < this.value) returnDateInput.value = '';
                    calculateEstimate();
                });
                returnDateInput.addEventListener('change', calculateEstimate);
            }
            if (carSelect) carSelect.addEventListener('change', calculateEstimate);

            // Email modal checkout
            var emailModal = document.getElementById('emailModal');
            var emailInput = document.getElementById('emailModalInput');
            var emailSubmit = document.getElementById('emailModalSubmit');
            var emailClose = document.getElementById('emailModalClose');
            var emailError = document.getElementById('emailModalError');
            var emailSummary = document.getElementById('emailModalSummary');
            var pendingCheckout = null;

            if (checkBtn) {
                checkBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var lang = CoreUI.getLang();
                    var isEN = lang === 'en';

                    if (!startDateInput.value || !returnDateInput.value) {
                        alert('Please select a start and return date.');
                        return;
                    }
                    var startD = new Date(startDateInput.value);
                    var returnD = new Date(returnDateInput.value);
                    if (isNaN(startD.getTime()) || isNaN(returnD.getTime()) || returnD <= startD) {
                        alert('Return date must be after the start date.');
                        return;
                    }
                    var selectedOption = carSelect.options[carSelect.selectedIndex];
                    if (!selectedOption.getAttribute('data-type')) {
                        alert('Please select a vehicle.');
                        return;
                    }

                    var days = Math.ceil((returnD - startD) / (1000 * 60 * 60 * 24));
                    var pricePerDay = parseInt(selectedOption.getAttribute('data-price'));
                    var totalPrice = days * pricePerDay;

                    pendingCheckout = {
                        vehicleType: selectedOption.getAttribute('data-type'),
                        pickupDate: startDateInput.value,
                        dropoffDate: returnDateInput.value,
                        pickupLocation: locationSelect.value,
                    };

                    var dayLabel = days > 1 ? 'days' : 'day';
                    var feeLabel = 'Service Fee';
                    var disclaimer = 'Final price confirmed after availability check';
                    emailSummary.innerHTML = '<strong>' + carSelect.value + '</strong> &middot; ' + days + ' ' + dayLabel + ' &middot; $' + totalPrice.toLocaleString() + ' &middot; ' + locationSelect.value + '<br><span style="color:#f97316;font-weight:600">+ $139 ' + feeLabel + '</span><br><span style="font-size:0.75rem;color:#999;">' + disclaimer + '</span>';
                    emailError.style.display = 'none';
                    emailInput.value = '';
                    emailModal.style.display = 'flex';
                    trapFocus(emailModal);
                    emailInput.focus();
                });
            }

            if (emailClose) emailClose.addEventListener('click', function() { releaseFocus(emailModal); emailModal.style.display = 'none'; });
            if (emailModal) emailModal.addEventListener('click', function(e) { if (e.target === emailModal) { releaseFocus(emailModal); emailModal.style.display = 'none'; } });

            if (emailSubmit) {
                emailSubmit.addEventListener('click', async function() {
                    var email = emailInput.value.trim();
                    if (!email || !email.includes('@')) {
                        emailError.textContent = 'Please enter a valid email address.';
                        emailError.style.display = 'block';
                        return;
                    }
                    emailSubmit.disabled = true;
                    emailSubmit.textContent = 'Processing...';
                    emailError.style.display = 'none';

                    try {
                        var res = await fetch(SITE_CONFIG.CHECKOUT_API, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(Object.assign({}, pendingCheckout, {
                                customerEmail: email,
                                source: SITE_CONFIG.BOOKING_SOURCE,
                                locale: CoreUI.getLang(),
                            })),
                        });
                        var data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Checkout failed');
                        window.location.href = data.checkoutUrl;
                    } catch (err) {
                        emailError.textContent = err.message || 'Something went wrong. Please try again.';
                        emailError.style.display = 'block';
                        emailSubmit.disabled = false;
                        emailSubmit.textContent = 'Book Now — Secure Checkout';
                    }
                });
            }

            // Escape key closes email modal
            if (emailModal) {
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && emailModal.style.display !== 'none' && emailModal.style.display !== '') {
                        releaseFocus(emailModal);
                        emailModal.style.display = 'none';
                    }
                });
            }

            // Belt-and-suspenders: clear invalid return date on manual input
            if (returnDateInput) {
                returnDateInput.addEventListener('input', function() {
                    if (this.value && startDateInput.value && this.value < startDateInput.value) {
                        this.value = '';
                    }
                    calculateEstimate();
                });
            }
        }

        return { init: init };
    })();

    // =========================================================================
    // MODULE 4: KlausyAI
    // =========================================================================
    var KlausyAI = (function() {
        function initConcierge() {
            var aiInput = document.getElementById('ai-input');
            var aiOutput = document.getElementById('ai-output');
            if (!aiInput || !aiOutput) return;

            var currentMode = 'route';

            document.querySelectorAll('.mode-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('active'); });
                    this.classList.add('active');
                    currentMode = this.dataset.mode;
                    var placeholders = { route: 'e.g. Plan a 7-day trip to Zion from Las Vegas...', packing: 'e.g. What should I pack for a winter camping trip?', tesla: 'e.g. How does Camp Mode work?', vehicle: 'e.g. Which Tesla is best for a family of 4?', traffic: 'e.g. Best time for Grand Canyon?' };
                    aiInput.placeholder = placeholders[currentMode] || '';
                });
            });

            // Expose askAI for event delegation
            function askAI() {
                if (!aiInput.value.trim()) return;
                aiOutput.style.display = 'block';
                aiOutput.innerHTML = '<span style="color:#64748b"><i class="fas fa-circle-notch fa-spin"></i> Planning your adventure...</span>';

                fetch(SITE_CONFIG.CONCIERGE_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: aiInput.value.trim(), mode: currentMode, language: 'en' })
                })
                .then(function(response) {
                    return response.json().then(function(data) { return { status: response.status, ok: response.ok, data: data }; });
                })
                .then(function(result) {
                    if (result.status === 429) {
                        var msg = result.data.error || 'Rate limit reached. Please try again later.';
                        aiOutput.innerHTML = '<div style="display:flex;align-items:flex-start;gap:0.75rem"><i class="fas fa-clock" style="color:#f59e0b;margin-top:2px"></i><div><strong style="color:var(--text-main)">' + msg + '</strong></div></div>';
                        aiOutput.classList.add('visible');
                        return;
                    }
                    if (!result.ok || result.data.error) throw new Error(result.data.error || 'API_ERROR');
                    aiOutput.innerHTML = sanitizeHTML(result.data.reply);
                    aiOutput.classList.add('visible');
                })
                .catch(function(error) {
                    console.error('AI Concierge Exception:', error);
                    var title = 'Our concierge is currently offline.';
                    var text = 'Please use the WhatsApp button below for human assistance.';
                    aiOutput.innerHTML = '<div style="display:flex;align-items:flex-start;gap:0.75rem"><i class="fas fa-satellite-dish" style="color:var(--accent-blue);margin-top:2px"></i><div><strong style="color:var(--text-main)">' + title + '</strong><br><span style="color:var(--text-muted)">' + text + '</span></div></div>';
                    aiOutput.classList.add('visible');
                });
            }

            // Store for event delegation
            KlausyAI._askAI = askAI;
        }

        function initBubble() {
            var klausyBubble = document.getElementById('klausyBubble');
            var klausyText = document.getElementById('klausyText');
            var klausyActions = document.getElementById('klausyActions');
            var klausyClose = document.getElementById('klausyClose');
            if (!klausyBubble) return;

            var getLang = function() { return CoreUI.getLang(); };
            var whatsappUrl = SITE_CONFIG.WHATSAPP_URL + '?text=' + encodeURIComponent('Hi, Klausy sent me!');

            var messages = {
                welcome: { text: "Hi there! \ud83d\udc4b I'm Klausy, your AI travel advisor. Dreaming of a Tesla road trip through the USA?", buttons: [{ text: 'Yes, tell me more!', action: 'scroll', target: '#fleet', primary: true }, { text: 'Maybe later', action: 'dismiss' }] },
                fleet: { text: 'Great choice! \ud83d\ude97 The Model Y Camping Package is our bestseller - perfect for couples. The Cybertruck is ideal for off-road adventures!', buttons: [{ text: 'View Routes', action: 'scroll', target: '#routes', primary: true }, { text: 'WhatsApp Chat', action: 'whatsapp' }] },
                routes: { text: "Route 66 is legendary! \ud83d\udee3\ufe0f 14 days from Chicago to L.A. - an unforgettable experience. Or prefer the National Parks?", buttons: [{ text: 'Try AI Route Planner', action: 'scroll', target: '#concierge', primary: true }, { text: 'Check Prices', action: 'scroll', target: '#booking-bar' }] },
                concierge: { text: 'Try our AI Route Planner! \ud83e\udd16 It creates a personalized route based on your interests.', buttons: [{ text: 'Book Now', action: 'scroll', target: '#booking-bar', primary: true }, { text: 'Questions? WhatsApp', action: 'whatsapp' }] },
                inactive: { text: "Still there? \ud83d\ude0a Can I help you with planning? Our team is also available via WhatsApp!", buttons: [{ text: 'Get Help', action: 'whatsapp', primary: true }, { text: 'Just browsing', action: 'dismiss' }] },
                exitIntent: { text: "Wait! \ud83c\udf81 Get our FREE Roadtrip Guide with packing list and insider tips before you go!", buttons: [{ text: 'Get Free Guide', action: 'scroll', target: '#heroLeadCapture', primary: true }, { text: 'No thanks', action: 'dismiss' }] },
                userHelp_home: { text: "Hey! \ud83d\udc4b I'm Klausy, your friendly AI Concierge. How can I help?", buttons: [{ text: 'Show Vehicles', action: 'scroll', target: '#fleet', primary: true }, { text: 'Plan more with Klausy', action: 'scroll', target: '#concierge' }] },
                userHelp_fleet: { text: "Checking out the available vehicles! \ud83d\ude97 Need help choosing?", buttons: [{ text: 'Ask Klausy', action: 'scroll', target: '#concierge', primary: true }, { text: 'WhatsApp Chat', action: 'whatsapp' }] },
                userHelp_routes: { text: "The routes are fantastic! \ud83d\udee3\ufe0f Want me to tell you more?", buttons: [{ text: 'Plan with Klausy', action: 'scroll', target: '#concierge', primary: true }, { text: 'Check Prices', action: 'scroll', target: '#booking-bar' }] },
                userHelp_concierge: { text: "Welcome to my section! \ud83e\udd16 Try my route planner above!", buttons: [{ text: 'Book Now', action: 'scroll', target: '#booking-bar', primary: true }, { text: 'WhatsApp for Questions', action: 'whatsapp' }] },
                userHelp_testimonials: { text: "Our guests love their adventures! \u2b50 Have questions?", buttons: [{ text: 'Plan with Klausy', action: 'scroll', target: '#concierge', primary: true }, { text: 'Get in Touch', action: 'whatsapp' }] },
                userHelp_contact: { text: "Ready to book? \ud83c\udf89 For questions, we're available via WhatsApp!", buttons: [{ text: 'WhatsApp Chat', action: 'whatsapp', primary: true }, { text: 'View Routes Again', action: 'scroll', target: '#routes' }] },
                pdfDelivery: { text: "\ud83c\udf89 Your roadtrip guide is ready! Click below to download.", buttons: [{ text: '\ud83d\udce5 Download Guide', action: 'download', target: '#PDF_PLACEHOLDER_EN', primary: true }, { text: 'Plan with Klausy', action: 'scroll', target: '#concierge' }] }
            };

            var state = {
                sessionStart: Date.now(), lastActivity: Date.now(),
                sectionsViewed: new Set(), sectionsAtDismiss: new Set(),
                currentSection: 'home', messageShown: new Set(),
                dismissed: false, cooldownUntil: 0,
                totalShown: parseInt(sessionStorage.getItem('klausy_total_shown') || '0', 10),
                maxMessages: 4, scrollDepth: 0
            };

            function renderButtons(btns) {
                return btns.map(function(b) {
                    var cls = b.primary ? 'klausy-btn klausy-btn-primary' : 'klausy-btn klausy-btn-secondary';
                    return '<button class="' + cls + '" data-action="' + b.action + '" data-target="' + (b.target || '') + '">' + b.text + '</button>';
                }).join('');
            }

            function showMessage(key) {
                if (state.dismissed || state.messageShown.has(key) || Date.now() < state.cooldownUntil || state.totalShown >= state.maxMessages || klausyBubble.classList.contains('visible')) return;
                var msg = messages[key];
                if (!msg) return;
                state.messageShown.add(key);
                state.totalShown++;
                sessionStorage.setItem('klausy_total_shown', state.totalShown);
                klausyText.innerHTML = msg.text;
                klausyActions.innerHTML = renderButtons(msg.buttons);
                klausyBubble.classList.add('visible');
                if (window.gtag) window.gtag('event', 'klausy_message', { message_type: key });
            }

            function hideMessage(cooldownSeconds) {
                klausyBubble.classList.remove('visible');
                if (cooldownSeconds > 0) {
                    state.cooldownUntil = Date.now() + (cooldownSeconds * 1000);
                    state.sectionsAtDismiss = new Set(state.sectionsViewed);
                }
            }

            function showUserHelp() {
                if (klausyBubble.classList.contains('visible')) { hideMessage(0); return; }
                var key = 'userHelp_' + state.currentSection;
                var msg = messages[key] || messages['userHelp_home'];
                if (!msg) return;
                klausyText.innerHTML = msg.text;
                klausyActions.innerHTML = renderButtons(msg.buttons);
                klausyBubble.classList.add('visible');
                if (window.gtag) window.gtag('event', 'klausy_user_help', { section: state.currentSection });
            }
            window.showKlausyHelp = showUserHelp;

            function showPdfDelivery() {
                var msg = messages['pdfDelivery'];
                if (!msg) return;
                klausyText.innerHTML = msg.text;
                klausyActions.innerHTML = renderButtons(msg.buttons);
                klausyBubble.classList.add('visible');
                if (window.gtag) window.gtag('event', 'klausy_pdf_delivery', { language: lang });
            }
            window.showKlausyPdfDelivery = showPdfDelivery;

            // Button click handler
            klausyActions.addEventListener('click', function(e) {
                var btn = e.target.closest('.klausy-btn');
                if (!btn) return;
                var action = btn.dataset.action;
                var target = btn.dataset.target;
                switch (action) {
                    case 'scroll':
                        hideMessage(0);
                        var el = document.querySelector(target);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        break;
                    case 'whatsapp':
                        hideMessage(0);
                        window.open(whatsappUrl, '_blank');
                        break;
                    case 'download':
                        hideMessage(0);
                        if (target && target.indexOf('#PDF_PLACEHOLDER') === -1) {
                            window.open(target, '_blank');
                        } else {
                            alert('Your guide will be delivered to your email shortly!');
                        }
                        break;
                    case 'dismiss':
                        hideMessage(180);
                        break;
                    default:
                        hideMessage(0);
                }
                if (window.gtag) window.gtag('event', 'klausy_click', { action: action, target: target });
            });

            klausyClose.addEventListener('click', function() { hideMessage(90); });

            // Section detection
            function detectSection() {
                var sections = ['home', 'fleet', 'routes', 'concierge', 'testimonials', 'contact'];
                var scrollPos = window.scrollY + window.innerHeight / 2;
                for (var i = 0; i < sections.length; i++) {
                    var el = document.getElementById(sections[i]);
                    if (el && scrollPos >= el.offsetTop && scrollPos < el.offsetTop + el.offsetHeight) {
                        if (state.currentSection !== sections[i]) {
                            state.currentSection = sections[i];
                            state.sectionsViewed.add(sections[i]);
                            var section = sections[i];
                            var isNew = !state.sectionsAtDismiss.has(section);
                            setTimeout(function() {
                                if (state.currentSection === section && messages[section] && isNew) showMessage(section);
                            }, 3000);
                        }
                        break;
                    }
                }
            }

            // Welcome after 15s
            setTimeout(function() {
                if (!state.dismissed && state.sectionsViewed.size <= 1) showMessage('welcome');
            }, 15000);

            // Event listeners
            window.addEventListener('scroll', function() {
                detectSection();
                state.lastActivity = Date.now();
                state.scrollDepth = Math.max(state.scrollDepth, window.scrollY);
            }, { passive: true });
            document.addEventListener('mousemove', function() { state.lastActivity = Date.now(); }, { passive: true });
            document.addEventListener('click', function() { state.lastActivity = Date.now(); }, { passive: true });
            document.addEventListener('mouseleave', function(e) {
                if (e.clientY < 10 && !state.messageShown.has('exitIntent')) showMessage('exitIntent');
            });
            setInterval(function() {
                if (Date.now() - state.lastActivity > 45000 && !state.messageShown.has('inactive')) showMessage('inactive');
            }, 10000);
            detectSection();
        }

        return {
            _askAI: null,
            init: function() {
                initConcierge();
                initBubble();
            }
        };
    })();

    // =========================================================================
    // MODULE 5: LeadCapture
    // =========================================================================
    var LeadCapture = (function() {
        function init() {
            var prefix = SITE_CONFIG.STORAGE_PREFIX;
            var lcState = {
                hasSubscribed: localStorage.getItem(prefix + '_subscribed') === 'true',
                popupShown: sessionStorage.getItem(prefix + '_popup_shown') === 'true',
                stickyBarClosed: sessionStorage.getItem(prefix + '_sticky_closed') === 'true'
            };

            var exitPopup = document.getElementById('exitPopup');
            var closePopupBtn = document.getElementById('closePopup');
            var stickyBar = document.getElementById('stickyBar');
            var closeStickyBarBtn = document.getElementById('closeStickyBar');
            var heroLeadForm = document.getElementById('heroLeadForm');
            var popupLeadForm = document.getElementById('popupLeadForm');
            var stickyLeadForm = document.getElementById('stickyLeadForm');

            function showFormSuccess(formElement) {
                var thankYou = 'Thank You!';
                var subtext = 'Klausy has your guide!';
                formElement.innerHTML = '<div class="lead-form-success"><i class="fas fa-check-circle"></i><h4>' + thankYou + '</h4><p>' + subtext + '</p></div>';
                setTimeout(function() {
                    if (window.showKlausyPdfDelivery) window.showKlausyPdfDelivery();
                }, 1500);
            }

            function handleLeadSubmit(e, formId) {
                e.preventDefault();
                var form = e.target;
                var emailInput = form.querySelector('input[type="email"]');
                var email = emailInput.value;
                var submitBtn = form.querySelector('button[type="submit"]');
                if (!email) return;

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

                fetch(SITE_CONFIG.GOOGLE_SHEETS_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, source: formId })
                })
                .then(function() {
                    localStorage.setItem(prefix + '_subscribed', 'true');
                    lcState.hasSubscribed = true;
                    showFormSuccess(form);
                    setTimeout(function() {
                        if (exitPopup && exitPopup.classList.contains('active')) exitPopup.classList.remove('active');
                        if (stickyBar) stickyBar.classList.add('hidden');
                    }, 2000);
                })
                .catch(function() {
                    localStorage.setItem(prefix + '_subscribed', 'true');
                    lcState.hasSubscribed = true;
                    showFormSuccess(form);
                });
            }

            // Exit popup
            function showExitPopup() {
                if (lcState.hasSubscribed || lcState.popupShown) return;
                if (exitPopup) {
                    exitPopup.classList.add('active');
                    trapFocus(exitPopup);
                }
                sessionStorage.setItem(prefix + '_popup_shown', 'true');
                lcState.popupShown = true;
            }
            function closeExitPopup() {
                if (exitPopup) {
                    releaseFocus(exitPopup);
                    exitPopup.classList.remove('active');
                }
            }

            document.addEventListener('mouseout', function(e) {
                if (e.clientY <= 0 && !lcState.hasSubscribed && !lcState.popupShown) showExitPopup();
            });
            if (closePopupBtn) closePopupBtn.addEventListener('click', closeExitPopup);
            if (exitPopup) exitPopup.addEventListener('click', function(e) { if (e.target === exitPopup) closeExitPopup(); });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && exitPopup && exitPopup.classList.contains('active')) closeExitPopup();
            });

            // Sticky bar
            function showStickyBar() {
                if (lcState.hasSubscribed || lcState.stickyBarClosed || !stickyBar) return;
                stickyBar.classList.add('visible');
                stickyBar.classList.remove('hidden');
            }
            function hideStickyBar() {
                if (!stickyBar) return;
                stickyBar.classList.remove('visible');
                stickyBar.classList.add('hidden');
                sessionStorage.setItem(prefix + '_sticky_closed', 'true');
                lcState.stickyBarClosed = true;
            }

            var stickyTimeout;
            window.addEventListener('scroll', function() {
                if (lcState.hasSubscribed || lcState.stickyBarClosed) return;
                clearTimeout(stickyTimeout);
                stickyTimeout = setTimeout(function() {
                    if (window.scrollY > 600) showStickyBar();
                }, 100);
            });
            if (closeStickyBarBtn) closeStickyBarBtn.addEventListener('click', hideStickyBar);

            // Form submissions
            if (heroLeadForm) heroLeadForm.addEventListener('submit', function(e) { handleLeadSubmit(e, 'hero'); });
            if (popupLeadForm) popupLeadForm.addEventListener('submit', function(e) { handleLeadSubmit(e, 'popup'); });
            if (stickyLeadForm) stickyLeadForm.addEventListener('submit', function(e) { handleLeadSubmit(e, 'sticky'); });
        }

        return { init: init };
    })();

    // =========================================================================
    // EVENT DELEGATION (replaces all inline onclick handlers)
    // =========================================================================
    function initEventDelegation() {
        document.addEventListener('click', function(e) {
            var target = e.target.closest('[data-modal]');
            if (target) {
                e.preventDefault();
                var modalName = target.dataset.modal;
                var modalMap = { terms: 'termsModal', privacy: 'privacyModal', impressum: 'impressumModal' };
                if (modalMap[modalName]) CoreUI.openModal(modalMap[modalName]);
                return;
            }

            // Legal modal close buttons
            if (e.target.closest('.legal-modal-close')) {
                var overlay = e.target.closest('.legal-modal-overlay');
                if (overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
                return;
            }

            // Cookie actions
            var actionEl = e.target.closest('[data-action]');
            if (actionEl) {
                var action = actionEl.dataset.action;
                switch (action) {
                    case 'cookie-accept': Analytics.acceptAll(); break;
                    case 'cookie-decline': Analytics.declineOptional(); break;
                    case 'cookie-settings': Analytics.openSettings(); break;
                    case 'cookie-cancel': Analytics.closeSettings(); break;
                    case 'cookie-save': Analytics.saveCustom(); break;
                }
            }

            // Ask AI button
            if (e.target.closest('.ask-btn-gradient')) {
                if (KlausyAI._askAI) KlausyAI._askAI();
                return;
            }

            // Vehicle view tracking
            var vehicleBtn = e.target.closest('[data-vehicle]');
            if (vehicleBtn) {
                var name = vehicleBtn.dataset.vehicle;
                var price = parseInt(vehicleBtn.dataset.price || '0');
                if (window.AMA_Analytics) window.AMA_Analytics.trackVehicleView(name, price);
                return;
            }

            // Download tracking
            var downloadEl = e.target.closest('[data-track]');
            if (downloadEl && window.AMA_Analytics) {
                window.AMA_Analytics.trackDownload(downloadEl.dataset.track);
                return;
            }

            // WhatsApp tracking
            if (e.target.closest('[data-track-wa]') && window.AMA_Analytics) {
                window.AMA_Analytics.trackWhatsAppContact();
                return;
            }
        });

        // Cookie modal outside click
        var cookieModal = document.getElementById('cookieModal');
        if (cookieModal) {
            cookieModal.addEventListener('click', function(e) {
                if (e.target === cookieModal) Analytics.closeSettings();
            });
        }

        // Enter key on AI input
        var aiInput = document.getElementById('ai-input');
        if (aiInput) {
            aiInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && KlausyAI._askAI) KlausyAI._askAI();
            });
        }

        // Space key support for data-modal/data-action elements (Enter already works on <a> tags)
        document.addEventListener('keydown', function(e) {
            if (e.key !== ' ') return;
            var target = e.target.closest('[data-modal], [data-action]');
            if (!target) return;
            e.preventDefault();
            target.click();
        });
    }

    // =========================================================================
    // INIT
    // =========================================================================
    function init() {
        Analytics.init();
        CoreUI.init();
        Booking.init();
        KlausyAI.init();
        LeadCapture.init();
        initEventDelegation();
        Analytics.checkConsent();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
