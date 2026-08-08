(function () {
  'use strict';

  var PAGE_SIZE = 36;
  var SEARCH_MAX = 200;
  var CHALLENGE_THRESHOLD = 0.8;
  var INSTANT_DISCOUNT = 0.1;
  var LOCK_DEPOSIT = 2222;
  var MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;
  var SEARCH_DEBOUNCE_MS = 100;
  var SHEET_URL =
    'https://script.google.com/macros/s/AKfycbwVllMnXYQ35TmWUHAP52bmdPa45zYcfOoz5Q4O6DKF-csF7K-Ekh-Riu1EhLHmwsCLAA/exec';

  var activeTab = 'stays';
  var activeState = '';
  var searchQuery = '';
  var typeFilter = '';
  var budgetFilter = '';
  var resortsShown = PAGE_SIZE;
  var holidaysShown = PAGE_SIZE;

  var destinationInput = document.getElementById('exp-destination');
  var searchClearBtn = document.getElementById('exp-search-clear');
  var resultsMeta = document.getElementById('exp-results-meta');
  var typeSelect = document.getElementById('exp-type-filter');
  var budgetSelect = document.getElementById('exp-budget-filter');
  var stateFiltersEl = document.getElementById('exp-state-filters');
  var resortsGrid = document.getElementById('exp-resorts-grid');
  var holidaysGrid = document.getElementById('exp-holidays-grid');
  var resortsEmpty = document.getElementById('exp-resorts-empty');
  var holidaysEmpty = document.getElementById('exp-holidays-empty');
  var holidaysLoading = document.getElementById('exp-holidays-loading');
  var holidaysUnavailable = document.getElementById('exp-holidays-unavailable');
  var regionIndexEl = document.getElementById('exp-region-index');
  var tabStays = document.getElementById('tab-stays');
  var tabHolidays = document.getElementById('tab-holidays');

  var resorts = typeof RESORTS !== 'undefined' ? RESORTS.slice() : [];
  var holidays = [];
  var holidaysLoadState = 'idle';

  function resolveHolidaysFromGlobals() {
    if (typeof HOLIDAYS !== 'undefined' && HOLIDAYS.length) return HOLIDAYS.slice();
    if (window.HOLIDAYS && window.HOLIDAYS.length) return window.HOLIDAYS.slice();
    return [];
  }

  function setHolidaysLoading(isLoading) {
    if (holidaysLoading) holidaysLoading.hidden = !isLoading;
    if (isLoading && holidaysUnavailable) holidaysUnavailable.hidden = true;
  }

  function setHolidaysUnavailable(show) {
    if (holidaysUnavailable) holidaysUnavailable.hidden = !show;
    if (show) {
      if (holidaysEmpty) holidaysEmpty.hidden = true;
      if (holidaysGrid) holidaysGrid.innerHTML = '';
      setHolidaysLoading(false);
    }
  }

  function loadHolidayPackages(done) {
    var cached = resolveHolidaysFromGlobals();
    if (cached.length) {
      holidays = cached;
      holidaysLoadState = 'ready';
      done(true);
      return;
    }

    holidaysLoadState = 'loading';
    setHolidaysLoading(true);

    function finish(ok) {
      holidaysLoadState = ok ? 'ready' : 'error';
      setHolidaysLoading(false);
      if (!ok) setHolidaysUnavailable(true);
      done(ok);
    }

    function loadScriptFallback() {
      var existing = document.querySelector('script[data-holidays-loader]');
      if (existing) return;

      var script = document.createElement('script');
      script.src = 'js/holidays-data.js';
      script.dataset.holidaysLoader = '1';
      script.onload = function () {
        holidays = resolveHolidaysFromGlobals();
        finish(holidays.length > 0);
      };
      script.onerror = function () {
        finish(false);
      };
      document.head.appendChild(script);
    }

    fetch('js/holidays-data.json', { cache: 'force-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('Holiday data HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        holidays = Array.isArray(data) ? data : [];
        window.HOLIDAYS = holidays;
        finish(holidays.length > 0);
      })
      .catch(function () {
        loadScriptFallback();
      });
  }

  var resortFilterCache = { key: '', list: [] };
  var holidayFilterCache = { key: '', list: [] };
  var searchTokens = [];
  var renderScheduled = false;
  var searchDebounceTimer = null;

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parsePriceMin(priceRange) {
    if (!priceRange) return 0;
    var nums = String(priceRange).replace(/,/g, '').match(/\d+/g);
    if (!nums || !nums.length) return 0;
    return parseInt(nums[0], 10) || 0;
  }

  function parseQuotedPrice(raw) {
    var nums = String(raw || '').replace(/,/g, '').match(/\d+/g);
    if (!nums || !nums.length) return 0;
    return parseInt(nums[0], 10) || 0;
  }

  function formatInr(num) {
    if (!num) return 'On request';
    return '₹' + Number(num).toLocaleString('en-IN');
  }

  function generateToken() {
    return 'pc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function needsScreenshot(quotedPrice, listedPrice) {
    if (!listedPrice || listedPrice <= 0 || !quotedPrice) return false;
    if (quotedPrice < listedPrice * CHALLENGE_THRESHOLD) return true;
    return getLockedPrice(listedPrice) >= quotedPrice;
  }

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[·,|/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenizeQuery(q) {
    return normalizeText(q).split(' ').filter(Boolean);
  }

  function buildSearchIndex() {
    resorts.forEach(function (r) {
      r._search = normalizeText([
        r.name, r.region, r.state, r.location, r.category,
        r.experienceType, r.brand, r.roomTypes, r.priceTier,
        r.destinationTier, r.roomQuality, r.priceRange
      ].join(' '));
      r._priceMin = parsePriceMin(r.priceRange);
    });

    holidays.forEach(function (h) {
      h._search = normalizeText([
        h.title, h.country, h.region, h.theme, h.tags, h.style,
        h.tier, h.flyFrom, h.days, (h.highlights || []).join(' ')
      ].join(' '));
    });
  }

  function matchesTokens(text, tokens) {
    if (!tokens.length) return true;
    for (var i = 0; i < tokens.length; i++) {
      if (text.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  function matchesBudget(resort) {
    if (!budgetFilter) return true;
    var min = resort._priceMin != null ? resort._priceMin : parsePriceMin(resort.priceRange);
    if (!min) return !budgetFilter;
    if (budgetFilter === 'value') return min < 8000;
    if (budgetFilter === 'mid') return min >= 8000 && min < 15000;
    if (budgetFilter === 'upscale') return min >= 15000 && min < 30000;
    if (budgetFilter === 'luxury') return min >= 30000;
    return true;
  }

  function matchesType(resort) {
    if (!typeFilter) return true;
    var exp = normalizeText(resort.experienceType);
    return exp.indexOf(typeFilter) !== -1;
  }

  function filterCacheKey(kind) {
    if (kind === 'resorts') {
      return [searchQuery, activeState, typeFilter, budgetFilter].join('\u0001');
    }
    return searchQuery;
  }

  function hasResortImage(resort) {
    var img = resort.image;
    return !!(img && img !== '-' && String(img).indexOf('http') === 0);
  }

  function hasHolidayImage(h) {
    var img = h.imgs && h.imgs[0];
    return !!(img && String(img).indexOf('http') === 0);
  }

  function sortByImagePriority(list, hasImageFn, secondarySort) {
    return list.slice().sort(function (a, b) {
      var aImg = hasImageFn(a) ? 1 : 0;
      var bImg = hasImageFn(b) ? 1 : 0;
      if (bImg !== aImg) return bImg - aImg;
      return secondarySort(a, b);
    });
  }

  function moveCardToGridEnd(card) {
    if (!card || card.classList.contains('has-broken-image')) return;
    card.classList.add('has-broken-image');
    var grid = card.parentElement;
    if (grid && grid.classList.contains('exp-grid')) {
      grid.appendChild(card);
    }
  }

  function markImageFailed(img) {
    if (!img || img.classList.contains('is-failed')) return;
    img.classList.add('is-failed');
    moveCardToGridEnd(img.closest('.exp-card'));
  }

  function resortBrokenCardsToEnd(grid) {
    if (!grid) return;
    grid.querySelectorAll('.exp-card.has-broken-image').forEach(function (card) {
      grid.appendChild(card);
    });
  }

  function auditGridImages(grid) {
    if (!grid) return;
    grid.querySelectorAll('.exp-card-photo').forEach(function (img) {
      if (!img.complete) return;
      if (img.naturalHeight === 0) {
        markImageFailed(img);
      } else {
        img.classList.add('is-loaded');
      }
    });
    resortBrokenCardsToEnd(grid);
  }

  function scheduleImageAudit(grid) {
    requestAnimationFrame(function () { auditGridImages(grid); });
    setTimeout(function () { auditGridImages(grid); }, 600);
    setTimeout(function () { auditGridImages(grid); }, 2000);
  }

  function renderCardImage(src, alt, icon) {
    icon = icon || 'image';
    if (!src) {
      return '<div class="exp-card-image-fallback"><i data-lucide="' + icon + '"></i></div>';
    }
    return (
      '<div class="exp-card-image-fallback" aria-hidden="true"><i data-lucide="' + icon + '"></i></div>' +
      '<img class="exp-card-photo" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
    );
  }

  function getFilteredResorts() {
    var key = filterCacheKey('resorts');
    if (resortFilterCache.key === key) return resortFilterCache.list;

    var list = resorts.filter(function (r) {
      if (activeState && r.state !== activeState) return false;
      if (!matchesType(r)) return false;
      if (!matchesBudget(r)) return false;
      return matchesTokens(r._search, searchTokens);
    });

    list = sortByImagePriority(list, hasResortImage, function (a, b) {
      return (a.rank || 999) - (b.rank || 999);
    });

    resortFilterCache = { key: key, list: list };
    return list;
  }

  function getFilteredHolidays() {
    var key = filterCacheKey('holidays');
    if (holidayFilterCache.key === key) return holidayFilterCache.list;

    var list = holidays.filter(function (h) {
      return matchesTokens(h._search, searchTokens);
    });

    list = sortByImagePriority(list, hasHolidayImage, function (a, b) {
      return (b.rating || 0) - (a.rating || 0);
    });

    holidayFilterCache = { key: key, list: list };
    return list;
  }

  function hasActiveFilters() {
    return !!(searchTokens.length || activeState || typeFilter || budgetFilter);
  }

  function invalidateCache() {
    resortFilterCache.key = '';
    holidayFilterCache.key = '';
  }

  function formatPrice(priceRange) {
    if (!priceRange) return 'On request';
    return '₹' + String(priceRange).replace(/\s*-\s*/g, ' – ₹');
  }

  function formatHolidayPrice(h) {
    if (h.pp2) return 'From ₹' + Number(h.pp2).toLocaleString('en-IN') + ' / person';
    if (h.pp4) return 'From ₹' + Number(h.pp4).toLocaleString('en-IN') + ' / person';
    return 'On request';
  }

  function experienceTags(raw) {
    if (!raw) return [];
    return raw.split(/[,·]/).map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 3);
  }

  function getLockedPrice(listedPrice) {
    return Math.round(listedPrice * (1 - INSTANT_DISCOUNT));
  }

  function getQuoteSavings(quotedPrice, lockedPrice) {
    if (!quotedPrice || !lockedPrice) return 0;
    return Math.max(0, quotedPrice - lockedPrice);
  }

  function formatQuoteSaveMessage(quotedPrice, lockedPrice) {
    var savings = getQuoteSavings(quotedPrice, lockedPrice);
    if (savings > 0) {
      return 'You save ' + formatInr(savings) + ' vs the price you found';
    }
    return 'Lock this exclusive InstaHelp rate before it expires';
  }

  function renderChallengeDrawer(opts) {
    return (
      '<div class="exp-card-challenge-drawer" hidden>' +
        '<div class="exp-drawer-head">' +
          '<div>' +
            '<p class="exp-drawer-eyebrow"><i data-lucide="zap"></i> Price challenge</p>' +
            '<p class="exp-drawer-property">' + escapeHtml(opts.name) + '</p>' +
            '<p class="exp-drawer-tagline">Enter the price you found elsewhere. We will try to beat it.</p>' +
          '</div>' +
          '<button type="button" class="exp-drawer-close" aria-label="Close price challenge"><i data-lucide="x"></i></button>' +
        '</div>' +
        '<form class="exp-inline-challenge-form" novalidate' +
          ' data-item-type="' + escapeHtml(opts.type) + '"' +
          ' data-item-id="' + escapeHtml(opts.id) + '"' +
          ' data-item-name="' + escapeHtml(opts.name) + '"' +
          ' data-listed-price="' + escapeHtml(String(opts.listedPrice || 0)) + '">' +
          '<div class="exp-challenge-stage-quote">' +
            '<label class="exp-quote-label">' +
              '<span>What price did you find?</span>' +
              '<input type="text" name="quoted_price" inputmode="numeric" required placeholder="Enter competitor price in INR" autocomplete="off">' +
            '</label>' +
          '</div>' +
          '<div class="exp-fomo-offer" hidden aria-live="polite">' +
            '<div class="exp-fomo-glow" aria-hidden="true"></div>' +
            '<div class="exp-fomo-badge"><span class="exp-fomo-dot" aria-hidden="true"></span> Website exclusive · 10% off</div>' +
            '<p class="exp-fomo-status">Matching your quote...</p>' +
            '<div class="exp-fomo-drop-stage">' +
              '<span class="exp-fomo-live-price"></span>' +
              '<span class="exp-fomo-drop-label">Price dropping</span>' +
            '</div>' +
            '<div class="exp-fomo-reveal" hidden>' +
              '<p class="exp-fomo-headline"><i data-lucide="alert-triangle" aria-hidden="true"></i> Lock this price or lose it forever</p>' +
              '<div class="exp-fomo-price-row">' +
                '<span class="exp-fomo-old"></span>' +
                '<span class="exp-fomo-arrow" aria-hidden="true"><i data-lucide="arrow-down"></i></span>' +
                '<span class="exp-fomo-new"></span>' +
              '</div>' +
              '<p class="exp-fomo-save"></p>' +
              '<div class="exp-fomo-urgency">' +
                '<i data-lucide="timer" aria-hidden="true"></i>' +
                '<span><strong class="exp-fomo-timer">10:00</strong> left to lock this rate</span>' +
              '</div>' +
            '</div>' +
            '<div class="exp-fomo-ticker"><i data-lucide="lock"></i><span>Not available on any other platform. Session-only offer.</span></div>' +
          '</div>' +
          '<div class="exp-screenshot-wrap" hidden>' +
            '<label>' +
              '<span>Upload competitor screenshot</span>' +
              '<input type="file" name="screenshot" accept="image/jpeg,image/png,image/webp,image/gif">' +
            '</label>' +
            '<p class="exp-screenshot-hint">Share the quote screenshot so we can verify and respond.</p>' +
          '</div>' +
          '<div class="exp-challenge-fields exp-proof-fields" hidden>' +
            '<label><span>Travel dates</span>' +
              '<input type="text" name="dates" placeholder="e.g. 12–15 Sep">' +
            '</label>' +
          '</div>' +
          '<div class="exp-lock-checkout" hidden>' +
            '<p class="exp-lock-checkout-head"><i data-lucide="shield-check" aria-hidden="true"></i> Complete your details to lock this deal</p>' +
            '<div class="exp-lock-summary">' +
              '<div><span class="exp-lock-summary-label">Your locked rate</span><strong class="exp-lock-summary-price"></strong></div>' +
              '<div class="exp-lock-summary-save" hidden><span class="exp-lock-summary-label">Saved vs your quote</span><strong class="exp-lock-summary-savings"></strong></div>' +
              '<div><span class="exp-lock-summary-label">Refundable deposit</span><strong class="exp-lock-deposit">' + formatInr(LOCK_DEPOSIT) + '</strong></div>' +
            '</div>' +
            '<div class="exp-lock-fields">' +
              '<label><span>Full name</span><input type="text" name="lock_name" required placeholder="Your full name" autocomplete="name"></label>' +
              '<label><span>Phone</span><input type="tel" name="lock_phone" required placeholder="10-digit mobile" autocomplete="tel"></label>' +
              '<label><span>Email</span><input type="email" name="lock_email" required placeholder="you@email.com" autocomplete="email"></label>' +
              '<label><span>Travel dates</span><input type="text" name="lock_dates" required placeholder="e.g. 12–15 Sep"></label>' +
              '<label><span>Guests</span><input type="text" name="lock_guests" placeholder="e.g. 2 adults, 1 child"></label>' +
            '</div>' +
            '<button type="button" class="exp-drawer-submit exp-drawer-submit-pay exp-pay-lock-btn">' +
              '<i data-lucide="credit-card" aria-hidden="true"></i> Pay ' + formatInr(LOCK_DEPOSIT) + ' to lock the deal' +
            '</button>' +
            '<p class="exp-lock-razorpay-note"><img src="image/razorpay-logo.svg" alt="Razorpay" width="88" height="20" loading="lazy"> Secured by Razorpay</p>' +
          '</div>' +
          '<button type="button" class="exp-drawer-submit exp-drawer-submit-lock exp-lock-deal-btn" hidden>' +
            '<i data-lucide="lock" aria-hidden="true"></i> Lock the deal' +
          '</button>' +
          '<button type="submit" class="exp-drawer-submit exp-drawer-submit-proof-btn" hidden>' +
            '<i data-lucide="upload" aria-hidden="true"></i> Submit with proof' +
          '</button>' +
          '<p class="exp-drawer-success" hidden><i data-lucide="check-circle"></i> Deal locked. Our concierge will confirm within 24 hours.</p>' +
        '</form>' +
      '</div>'
    );
  }

  function renderResortCard(resort) {
    var tags = experienceTags(resort.experienceType);
    var tagsHtml = tags.map(function (t) {
      return '<span class="exp-card-tag">' + escapeHtml(t) + '</span>';
    }).join('');

    var imageHtml = renderCardImage(
      hasResortImage(resort) ? resort.image : '',
      resort.name,
      'image'
    );

    var discountBadge = resort.discount
      ? '<span class="exp-card-discount">' + escapeHtml(resort.discount) + '% off</span>'
      : '';

    var ratingHtml = resort.rating
      ? '<span class="exp-card-rating"><i data-lucide="star"></i>' + escapeHtml(String(resort.rating)) + '</span>'
      : '';

    var website = resort.website && resort.website.indexOf('http') === 0 ? resort.website : '';
    var listedPrice = resort._priceMin != null ? resort._priceMin : parsePriceMin(resort.priceRange);

    return (
      '<article class="exp-card" data-resort-id="' + escapeHtml(resort.id) + '">' +
        '<div class="exp-card-image">' + imageHtml +
          '<span class="exp-card-rank">#' + escapeHtml(String(resort.rank)) + ' in ' + escapeHtml(resort.region) + '</span>' +
          discountBadge +
        '</div>' +
        '<div class="exp-card-body">' +
          '<div class="exp-card-meta">' +
            '<span class="exp-card-region">' + escapeHtml(resort.region) + '</span>' +
            (resort.stars ? '<span class="exp-card-stars">' + escapeHtml(resort.stars) + '★</span>' : '') +
          '</div>' +
          '<h3>' + escapeHtml(resort.name) + '</h3>' +
          '<p class="exp-card-location">' + escapeHtml(resort.location) + ', ' + escapeHtml(resort.state) + '</p>' +
          (tagsHtml ? '<div class="exp-card-tags">' + tagsHtml + '</div>' : '') +
          '<div class="exp-card-footer">' +
            '<div class="exp-card-price">' + escapeHtml(formatPrice(resort.priceRange)) + '<span>per night (indicative)</span></div>' +
            ratingHtml +
          '</div>' +
          '<div class="exp-card-actions">' +
            (website
              ? '<a class="exp-card-link" href="' + escapeHtml(website) + '" target="_blank" rel="noopener noreferrer">View property <i data-lucide="external-link"></i></a>'
              : '<span class="exp-card-link is-disabled">View property</span>') +
            '<button type="button" class="exp-card-challenge">Price challenge</button>' +
          '</div>' +
        '</div>' +
        renderChallengeDrawer({
          type: 'resort', id: resort.id, name: resort.name,
          listedPrice: listedPrice, listedDisplay: formatPrice(resort.priceRange)
        }) +
      '</article>'
    );
  }

  function renderHolidayCard(h) {
    var imageHtml = renderCardImage(
      hasHolidayImage(h) ? h.imgs[0] : '',
      h.title,
      'globe'
    );
    var listedPrice = h.pp2 || h.pp4 || 0;

    return (
      '<article class="exp-card exp-holiday-card" data-holiday-id="' + escapeHtml(h.id) + '">' +
        '<div class="exp-card-image">' + imageHtml +
          '<span class="exp-holiday-days">' + escapeHtml(String(h.days)) + ' days</span>' +
        '</div>' +
        '<div class="exp-card-body">' +
          '<div class="exp-card-meta">' +
            '<span class="exp-holiday-tier">' + escapeHtml(h.tier || '') + '</span>' +
            '<span class="exp-card-region">' + escapeHtml(h.country || '') + '</span>' +
          '</div>' +
          '<h3>' + escapeHtml(h.title) + '</h3>' +
          '<p class="exp-card-location">' + escapeHtml(h.theme || '') + '</p>' +
          '<div class="exp-card-footer">' +
            '<div class="exp-card-price">' + escapeHtml(formatHolidayPrice(h)) + '<span>' + escapeHtml(h.style || '') + '</span></div>' +
            (h.rating ? '<span class="exp-card-rating"><i data-lucide="star"></i>' + escapeHtml(String(h.rating)) + '</span>' : '') +
          '</div>' +
          '<div class="exp-card-actions">' +
            (h.tourismUrl
              ? '<a class="exp-card-link" href="' + escapeHtml(h.tourismUrl) + '" target="_blank" rel="noopener noreferrer">Explore <i data-lucide="external-link"></i></a>'
              : '') +
            '<button type="button" class="exp-card-challenge">Price challenge</button>' +
          '</div>' +
        '</div>' +
        renderChallengeDrawer({
          type: 'holiday', id: h.id, name: h.title,
          listedPrice: listedPrice, listedDisplay: formatHolidayPrice(h)
        }) +
      '</article>'
    );
  }

  function refreshIcons(root) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ nameAttr: 'data-lucide', root: root || document });
    }
  }

  var challengeBackdrop = null;
  var mobileChallengeMq = window.matchMedia('(max-width: 639px)');

  function lockMobileScroll() {
    if (!mobileChallengeMq.matches) return;
    document.body.classList.add('exp-drawer-open');
  }

  function unlockMobileScroll() {
    document.body.classList.remove('exp-drawer-open');
  }

  function getChallengeBackdrop() {
    if (!challengeBackdrop) {
      challengeBackdrop = document.getElementById('expChallengeBackdrop');
    }
    return challengeBackdrop;
  }

  function showChallengeBackdrop() {
    var backdrop = getChallengeBackdrop();
    if (!backdrop) return;
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    lockMobileScroll();
    requestAnimationFrame(function () {
      backdrop.classList.add('is-visible');
    });
  }

  function hideChallengeBackdrop() {
    var backdrop = getChallengeBackdrop();
    if (!backdrop) return;
    backdrop.classList.remove('is-visible');
    backdrop.setAttribute('aria-hidden', 'true');
    unlockMobileScroll();
    setTimeout(function () {
      if (!backdrop.classList.contains('is-visible')) backdrop.hidden = true;
    }, 260);
  }

  function cancelPriceDropAnimation(form) {
    if (!form) return;
    if (form._priceDropRaf) {
      cancelAnimationFrame(form._priceDropRaf);
      form._priceDropRaf = null;
    }
    if (form._fomoTimer) {
      clearTimeout(form._fomoTimer);
      form._fomoTimer = null;
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function stopFomoTimer(form) {
    if (form && form._fomoTimer) {
      clearTimeout(form._fomoTimer);
      form._fomoTimer = null;
    }
  }

  function startFomoTimer(form) {
    stopFomoTimer(form);
    var timerEl = form.querySelector('.exp-fomo-timer');
    if (!timerEl) return;
    var expiresAt = Date.now() + 10 * 60 * 1000;

    function tick() {
      var left = Math.max(0, expiresAt - Date.now());
      var mins = Math.floor(left / 60000);
      var secs = Math.floor((left % 60000) / 1000);
      timerEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      if (left <= 0) {
        timerEl.textContent = '00:00';
        stopFomoTimer(form);
        return;
      }
      form._fomoTimer = setTimeout(tick, 1000);
    }
    tick();
  }

  function runPriceDropAnimation(form, quotedPrice, lockedPrice) {
    cancelPriceDropAnimation(form);
    var fomoEl = form.querySelector('.exp-fomo-offer');
    if (!fomoEl) return;

    var liveEl = fomoEl.querySelector('.exp-fomo-live-price');
    var dropStage = fomoEl.querySelector('.exp-fomo-drop-stage');
    var revealEl = fomoEl.querySelector('.exp-fomo-reveal');
    var statusEl = fomoEl.querySelector('.exp-fomo-status');
    var dropFrom = quotedPrice;
    var dropTo = lockedPrice;
    var duration = 2800;

    if (dropTo >= dropFrom) {
      dropFrom = Math.round(dropTo * 1.08);
    }

    fomoEl.hidden = false;
    fomoEl.classList.remove('is-revealed');
    fomoEl.classList.add('is-dropping');

    if (dropStage) dropStage.hidden = false;
    if (revealEl) revealEl.hidden = true;
    if (statusEl) statusEl.textContent = 'Matching your quote...';
    if (liveEl) liveEl.textContent = formatInr(dropFrom);

    var startTs = null;

    function step(ts) {
      if (!startTs) startTs = ts;
      var progress = Math.min((ts - startTs) / duration, 1);
      var eased = easeOutCubic(progress);
      var current = Math.round(dropFrom - (dropFrom - dropTo) * eased);

      if (liveEl) liveEl.textContent = formatInr(current);

      if (progress >= 0.35 && statusEl) {
        statusEl.textContent = 'Unlocking exclusive rate...';
      }

      if (progress < 1) {
        form._priceDropRaf = requestAnimationFrame(step);
        return;
      }

      form._priceDropRaf = null;
      if (liveEl) liveEl.textContent = formatInr(dropTo);

      setTimeout(function () {
        if (dropStage) dropStage.hidden = true;
        if (revealEl) {
          revealEl.hidden = false;
          revealEl.querySelector('.exp-fomo-old').textContent = formatInr(quotedPrice);
          revealEl.querySelector('.exp-fomo-new').textContent = formatInr(lockedPrice);
          revealEl.querySelector('.exp-fomo-save').textContent =
            formatQuoteSaveMessage(quotedPrice, lockedPrice);
        }
        fomoEl.classList.remove('is-dropping');
        fomoEl.classList.add('is-revealed');
        startFomoTimer(form);
        refreshIcons(fomoEl);

        var submitBtn = form.querySelector('.exp-lock-deal-btn');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.hidden = false;
          submitBtn.classList.remove('is-pending');
          submitBtn.innerHTML = '<i data-lucide="lock" aria-hidden="true"></i> Lock the deal';
          refreshIcons(form);
        }
      }, 180);
    }

    form._priceDropRaf = requestAnimationFrame(step);
  }

  function closeAllChallengeDrawers() {
    hideChallengeBackdrop();
    document.querySelectorAll('.exp-card.is-challenge-open').forEach(function (card) {
      card.classList.remove('is-challenge-open', 'is-lock-stage');
      var drawer = card.querySelector('.exp-card-challenge-drawer');
      if (drawer) {
        drawer.hidden = true;
        drawer.classList.remove('is-fomo', 'is-proof', 'is-opening');
        var form = drawer.querySelector('.exp-inline-challenge-form');
        if (form) resetChallengeUI(form);
      }
    });
  }

  function hideProofUI(form) {
    var screenshotWrap = form.querySelector('.exp-screenshot-wrap');
    var proofFields = form.querySelector('.exp-proof-fields');
    var proofBtn = form.querySelector('.exp-drawer-submit-proof-btn');
    var drawer = form.closest('.exp-card-challenge-drawer');
    if (screenshotWrap) screenshotWrap.hidden = true;
    if (proofFields) proofFields.hidden = true;
    if (proofBtn) proofBtn.hidden = true;
    if (drawer) drawer.classList.remove('is-proof');
  }

  function showProofUI(form) {
    var screenshotWrap = form.querySelector('.exp-screenshot-wrap');
    var proofFields = form.querySelector('.exp-proof-fields');
    var proofBtn = form.querySelector('.exp-drawer-submit-proof-btn');
    var lockDealBtn = form.querySelector('.exp-lock-deal-btn');
    var fomoEl = form.querySelector('.exp-fomo-offer');
    var drawer = form.closest('.exp-card-challenge-drawer');
    cancelPriceDropAnimation(form);
    if (fomoEl) {
      fomoEl.hidden = true;
      fomoEl.classList.remove('is-animate', 'is-dropping', 'is-revealed');
    }
    if (lockDealBtn) lockDealBtn.hidden = true;
    if (screenshotWrap) screenshotWrap.hidden = false;
    if (proofFields) proofFields.hidden = false;
    if (proofBtn) {
      proofBtn.hidden = false;
      proofBtn.disabled = false;
    }
    if (drawer) {
      drawer.classList.remove('is-fomo');
      drawer.classList.add('is-proof');
    }
    refreshIcons(form);
  }

  function resetChallengeUI(form) {
    cancelPriceDropAnimation(form);
    var fomoEl = form.querySelector('.exp-fomo-offer');
    var screenshotWrap = form.querySelector('.exp-screenshot-wrap');
    var proofFields = form.querySelector('.exp-proof-fields');
    var lockCheckout = form.querySelector('.exp-lock-checkout');
    var quoteStage = form.querySelector('.exp-challenge-stage-quote');
    var lockDealBtn = form.querySelector('.exp-lock-deal-btn');
    var proofBtn = form.querySelector('.exp-drawer-submit-proof-btn');
    var payBtn = form.querySelector('.exp-pay-lock-btn');
    var drawer = form.closest('.exp-card-challenge-drawer');
    var card = form.closest('.exp-card');

    if (card) card.classList.remove('is-lock-stage');
    if (quoteStage) quoteStage.hidden = false;
    if (lockCheckout) lockCheckout.hidden = true;
    if (lockDealBtn) lockDealBtn.hidden = true;
    if (proofBtn) proofBtn.hidden = true;
    if (payBtn) payBtn.disabled = false;

    if (fomoEl) {
      fomoEl.hidden = true;
      fomoEl.classList.remove('is-animate', 'is-dropping', 'is-revealed');
      var dropStage = fomoEl.querySelector('.exp-fomo-drop-stage');
      var revealEl = fomoEl.querySelector('.exp-fomo-reveal');
      var statusEl = fomoEl.querySelector('.exp-fomo-status');
      if (dropStage) dropStage.hidden = false;
      if (revealEl) revealEl.hidden = true;
      if (statusEl) statusEl.textContent = 'Matching your quote...';
    }
    if (screenshotWrap) screenshotWrap.hidden = true;
    if (proofFields) proofFields.hidden = true;
    if (drawer) drawer.classList.remove('is-fomo', 'is-proof');
    var successEl = form.querySelector('.exp-drawer-success');
    if (successEl) successEl.hidden = true;
  }

  function updateChallengeUI(form) {
    var listedPrice = parseInt(form.getAttribute('data-listed-price') || '0', 10) || 0;
    var quotedPrice = parseQuotedPrice(form.querySelector('[name="quoted_price"]').value);
    var fomoEl = form.querySelector('.exp-fomo-offer');
    var screenshotWrap = form.querySelector('.exp-screenshot-wrap');
    var proofFields = form.querySelector('.exp-proof-fields');
    var lockDealBtn = form.querySelector('.exp-lock-deal-btn');
    var proofBtn = form.querySelector('.exp-drawer-submit-proof-btn');
    var lockCheckout = form.querySelector('.exp-lock-checkout');
    var drawer = form.closest('.exp-card-challenge-drawer');
    var quoteInput = form.querySelector('[name="quoted_price"]');

    if (lockCheckout && !lockCheckout.hidden) return;

    if (!quotedPrice) {
      resetChallengeUI(form);
      if (quoteInput) quoteInput.classList.remove('is-valid');
      return;
    }

    if (quoteInput) quoteInput.classList.add('is-valid');

    if (!listedPrice) {
      hideProofUI(form);
      if (fomoEl) fomoEl.hidden = true;
      if (lockDealBtn) lockDealBtn.hidden = true;
      if (drawer) drawer.classList.remove('is-fomo');
      refreshIcons(form);
      return;
    }

    if (needsScreenshot(quotedPrice, listedPrice)) {
      showProofUI(form);
      return;
    }

    hideProofUI(form);

    var lockedPrice = getLockedPrice(listedPrice);
    form.setAttribute('data-locked-price', String(lockedPrice));
    form.setAttribute('data-quoted-price', String(quotedPrice));

    if (fomoEl) {
      runPriceDropAnimation(form, quotedPrice, lockedPrice);
    }
    if (drawer) {
      drawer.classList.remove('is-proof');
      drawer.classList.add('is-fomo');
    }
    if (lockDealBtn) {
      lockDealBtn.hidden = false;
      lockDealBtn.disabled = true;
      lockDealBtn.classList.add('is-pending');
      lockDealBtn.innerHTML = '<i data-lucide="loader" aria-hidden="true"></i> Calculating your rate...';
    }
    refreshIcons(form);
  }

  function showLockCheckoutStage(form) {
    var listedPrice = parseInt(form.getAttribute('data-listed-price') || '0', 10) || 0;
    var lockedPrice = parseInt(form.getAttribute('data-locked-price') || '0', 10) || getLockedPrice(listedPrice);
    var quotedPrice = parseInt(form.getAttribute('data-quoted-price') || '0', 10) ||
      parseQuotedPrice(form.querySelector('[name="quoted_price"]').value);
    var card = form.closest('.exp-card');
    var quoteStage = form.querySelector('.exp-challenge-stage-quote');
    var lockCheckout = form.querySelector('.exp-lock-checkout');
    var lockDealBtn = form.querySelector('.exp-lock-deal-btn');
    var fomoEl = form.querySelector('.exp-fomo-offer');
    var priceEl = form.querySelector('.exp-lock-summary-price');
    var saveEl = form.querySelector('.exp-lock-summary-savings');
    var saveRow = form.querySelector('.exp-lock-summary-save');

    if (priceEl) priceEl.textContent = formatInr(lockedPrice);
    if (saveEl && saveRow) {
      var savings = getQuoteSavings(quotedPrice, lockedPrice);
      if (savings > 0) {
        saveEl.textContent = formatInr(savings);
        saveRow.hidden = false;
      } else {
        saveRow.hidden = true;
      }
    }
    if (quoteStage) quoteStage.hidden = true;
    if (lockDealBtn) lockDealBtn.hidden = true;
    if (fomoEl) fomoEl.classList.add('is-compact');
    if (lockCheckout) lockCheckout.hidden = false;
    if (card) card.classList.add('is-lock-stage');

    var datesInput = form.querySelector('[name="lock_dates"]');
    var proofDates = form.querySelector('[name="dates"]');
    if (datesInput && proofDates && proofDates.value.trim()) {
      datesInput.value = proofDates.value.trim();
    }

    refreshIcons(form);
    if (lockCheckout) {
      var first = lockCheckout.querySelector('input[name="lock_name"]');
      if (first) first.focus();
    }
  }

  function validateLockCheckout(form) {
    var name = (form.querySelector('[name="lock_name"]') || {}).value || '';
    var phone = (form.querySelector('[name="lock_phone"]') || {}).value || '';
    var email = (form.querySelector('[name="lock_email"]') || {}).value || '';
    var dates = (form.querySelector('[name="lock_dates"]') || {}).value || '';

    name = name.trim();
    phone = phone.replace(/\D/g, '');
    email = email.trim();
    dates = dates.trim();

    if (!name) return 'Please enter your full name.';
    if (phone.length < 10) return 'Please enter a valid 10-digit phone number.';
    if (!email || email.indexOf('@') === -1) return 'Please enter a valid email address.';
    if (!dates) return 'Please enter your travel dates.';
    return '';
  }

  function handleLockPayment(form) {
    var err = validateLockCheckout(form);
    if (err) {
      alert(err);
      return;
    }

    var Payment = window.InstaHelpPayment;
    var API = window.InstaHelpAPI;
    if (!Payment || !API) {
      alert('Payment system is unavailable. Please call our concierge at +91 70227 02220.');
      return;
    }

    var Config = window.InstaHelpPaymentConfig;
    if (Config) {
      var settings = Config.getSettings();
      if (!settings.paymentsEnabled) {
        alert('Online payments are temporarily unavailable. Please contact concierge.');
        return;
      }
    }

    var listedPrice = parseInt(form.getAttribute('data-listed-price') || '0', 10) || 0;
    var lockedPrice = parseInt(form.getAttribute('data-locked-price') || '0', 10) || getLockedPrice(listedPrice);
    var itemName = form.getAttribute('data-item-name') || 'Experience';
    var itemType = form.getAttribute('data-item-type') || '';
    var itemId = form.getAttribute('data-item-id') || '';
    var quotedPrice = parseQuotedPrice(form.querySelector('[name="quoted_price"]').value);
    var token = generateToken();

    var payBtn = form.querySelector('.exp-pay-lock-btn');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = '<i data-lucide="loader" aria-hidden="true"></i> Opening Razorpay…';
      refreshIcons(form);
    }

    var payload = {
      form_id: 'price_challenge',
      token: token,
      timestamp: new Date().toISOString(),
      item_type: itemType,
      item_id: itemId,
      property_name: itemName,
      listed_price: listedPrice || '',
      quoted_price: quotedPrice,
      locked_price: lockedPrice || '',
      savings_from_quote: getQuoteSavings(quotedPrice, lockedPrice),
      lock_deposit: LOCK_DEPOSIT,
      offer_type: 'instant_10_lock',
      instant_discount_pct: 10,
      payment_status: 'pending',
      name: form.querySelector('[name="lock_name"]').value.trim(),
      phone: form.querySelector('[name="lock_phone"]').value.trim(),
      email: form.querySelector('[name="lock_email"]').value.trim(),
      travel_dates: form.querySelector('[name="lock_dates"]').value.trim(),
      guests: (form.querySelector('[name="lock_guests"]') || {}).value || '',
      landing_page: window.location.href
    };

    postToGoogleSheet(payload);

    if (API.warmupBackend) API.warmupBackend();

    Payment.initiateCheckout({
      serviceName: 'Price Lock – ' + itemName,
      vendorName: 'InstaHelp Experiences',
      quantity: 1,
      price: LOCK_DEPOSIT,
      discount: 0,
      applyGst: false,
      provider: 'RAZORPAY',
      idempotencyKey: token
    }, { provider: 'RAZORPAY' }).then(function (res) {
      if (!res || !res.ok) {
        alert((res && res.error) || 'Payment could not be started. Please try again.');
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.innerHTML = '<i data-lucide="credit-card" aria-hidden="true"></i> Pay ' + formatInr(LOCK_DEPOSIT) + ' to lock the deal';
          refreshIcons(form);
        }
      }
    }).catch(function () {
      alert('Payment could not be started. Please try again.');
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = '<i data-lucide="credit-card" aria-hidden="true"></i> Pay ' + formatInr(LOCK_DEPOSIT) + ' to lock the deal';
        refreshIcons(form);
      }
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function postToGoogleSheet(payload) {
    var frame = document.getElementById('ihPriceChallengeFrame');
    var target = frame ? frame.name : 'ihPriceChallengeFrame';

    try {
      var f = document.createElement('form');
      f.method = 'POST';
      f.action = SHEET_URL;
      f.target = target;
      f.setAttribute('accept-charset', 'UTF-8');
      var h = document.createElement('input');
      h.type = 'hidden';
      h.name = 'data';
      h.value = JSON.stringify(payload);
      f.appendChild(h);
      document.body.appendChild(f);
      f.submit();
      document.body.removeChild(f);
    } catch (err) {
      console.warn('Price challenge iframe POST failed:', err);
    }

    try {
      fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: 'data=' + encodeURIComponent(JSON.stringify(payload))
      });
    } catch (err) {
      console.warn('Price challenge fetch POST failed:', err);
    }
  }

  function handleChallengeSubmit(form) {
    var listedPrice = parseInt(form.getAttribute('data-listed-price') || '0', 10) || 0;
    var itemName = form.getAttribute('data-item-name') || '';
    var itemType = form.getAttribute('data-item-type') || '';
    var itemId = form.getAttribute('data-item-id') || '';
    var quotedRaw = form.querySelector('[name="quoted_price"]').value.trim();
    var quotedPrice = parseQuotedPrice(quotedRaw);
    var dates = (form.querySelector('[name="dates"]') || {}).value;
    dates = dates ? dates.trim() : '';
    var screenshotInput = form.querySelector('[name="screenshot"]');
    var screenshotRequired = needsScreenshot(quotedPrice, listedPrice);

    if (!quotedPrice) {
      alert('Please enter the price you found.');
      return;
    }

    if (screenshotRequired && (!screenshotInput || !screenshotInput.files || !screenshotInput.files[0])) {
      alert('Please upload a screenshot of the competitor quote to continue.');
      return;
    }

    if (!screenshotRequired && listedPrice > 0) {
      return;
    }

    var lockedPrice = 0;

    var proofBtn = form.querySelector('.exp-drawer-submit-proof-btn');
    if (proofBtn) {
      proofBtn.disabled = true;
      proofBtn.textContent = 'Submitting…';
    }

    var buildPayload = function (screenshotData, screenshotName) {
      var threshold = listedPrice ? Math.round(listedPrice * CHALLENGE_THRESHOLD) : 0;
      var diffPct = listedPrice && quotedPrice
        ? Math.round(((listedPrice - quotedPrice) / listedPrice) * 100)
        : 0;

      return {
        form_id: 'price_challenge',
        token: generateToken(),
        timestamp: new Date().toISOString(),
        item_type: itemType,
        item_id: itemId,
        property_name: itemName,
        listed_price: listedPrice || '',
        quoted_price: quotedPrice,
        quoted_price_raw: quotedRaw,
        locked_price: lockedPrice || '',
        offer_type: 'verify_quote',
        instant_discount_pct: '',
        threshold_price: threshold,
        diff_percent: diffPct,
        screenshot_required: screenshotRequired ? 'YES' : 'NO',
        screenshot_name: screenshotName || '',
        screenshot_base64: screenshotData || '',
        travel_dates: dates,
        competitor_link: '',
        name: '',
        phone: '',
        landing_page: window.location.href
      };
    };

    var finish = function (payload) {
      postToGoogleSheet(payload);
      form.querySelector('.exp-drawer-success').hidden = false;
      if (proofBtn) proofBtn.hidden = true;
      setTimeout(closeAllChallengeDrawers, 2800);
    };

    if (screenshotInput && screenshotInput.files && screenshotInput.files[0]) {
      var file = screenshotInput.files[0];
      if (file.size > MAX_SCREENSHOT_BYTES) {
        alert('Screenshot must be under 2 MB.');
        if (proofBtn) {
          proofBtn.disabled = false;
          proofBtn.innerHTML = '<i data-lucide="upload" aria-hidden="true"></i> Submit with proof';
          refreshIcons(form);
        }
        return;
      }
      readFileAsDataUrl(file).then(function (dataUrl) {
        finish(buildPayload(dataUrl, file.name));
      }).catch(function () {
        alert('Could not read the screenshot. Please try another image.');
        if (proofBtn) {
          proofBtn.disabled = false;
          proofBtn.innerHTML = '<i data-lucide="upload" aria-hidden="true"></i> Submit with proof';
          refreshIcons(form);
        }
      });
    } else {
      finish(buildPayload('', ''));
    }
  }

  function getDisplayLimit(total, shown, filtered) {
    if (filtered) return Math.min(total, SEARCH_MAX);
    return Math.min(shown, total);
  }

  function updateTabLabels(stayCount, holidayCount) {
    tabStays.innerHTML = 'Luxury Stays' + (stayCount ? ' <span class="exp-tab-count">(' + stayCount + ')</span>' : '');
    tabHolidays.innerHTML = 'Holiday Packages' + (holidayCount ? ' <span class="exp-tab-count">(' + holidayCount + ')</span>' : '');
  }

  function updateResultsMeta(stayCount, holidayCount, stayShown, holidayShown) {
    if (!resultsMeta) return;

    if (!hasActiveFilters()) {
      resultsMeta.textContent = '';
      return;
    }

    var parts = [];
    if (searchTokens.length) {
      parts.push('“' + searchQuery.trim() + '”');
    }

    if (activeTab === 'stays') {
      parts.push(stayShown + ' of ' + stayCount + ' stays shown');
      if (holidayCount > 0 && stayCount === 0) {
        parts.push(holidayCount + ' packages in Holidays tab');
      }
    } else {
      parts.push(holidayShown + ' of ' + holidayCount + ' packages shown');
      if (stayCount > 0 && holidayCount === 0) {
        parts.push(stayCount + ' stays in Luxury Stays tab');
      }
    }

    resultsMeta.textContent = parts.join(' · ');
  }

  function maybeAutoSwitchTab(stayCount, holidayCount) {
    if (searchTokens.length < 1) return;

    if (activeTab === 'stays' && stayCount === 0 && holidayCount > 0) {
      switchTab('holidays', true);
    } else if (activeTab === 'holidays' && holidayCount === 0 && stayCount > 0) {
      switchTab('stays', true);
    }
  }

  function renderGrid(grid, emptyEl, kind, filtered, shown, renderCard) {
    var isFiltered = hasActiveFilters();
    var limit = getDisplayLimit(filtered.length, shown, isFiltered);
    var slice = filtered.slice(0, limit);

    if (!slice.length) {
      grid.innerHTML = '';
      emptyEl.hidden = false;
      removeLoadMore(kind);
      return 0;
    }

    emptyEl.hidden = true;
    closeAllChallengeDrawers();
    grid.innerHTML = slice.map(renderCard).join('');
    renderLoadMore(kind, filtered.length, limit, isFiltered);
    refreshIcons(grid);
    scheduleImageAudit(grid);
    return slice.length;
  }

  function renderResorts(stayCount) {
    var filtered = stayCount != null ? getFilteredResorts() : getFilteredResorts();
    if (stayCount == null) stayCount = filtered.length;
    var shown = renderGrid(
      resortsGrid, resortsEmpty, 'resorts', filtered, resortsShown, renderResortCard
    );
    return { total: stayCount, shown: shown };
  }

  function renderHolidays(holidayCount) {
    if (holidaysLoadState === 'loading') {
      setHolidaysLoading(true);
      return { total: 0, shown: 0 };
    }
    if (holidaysLoadState === 'error') {
      setHolidaysUnavailable(true);
      return { total: 0, shown: 0 };
    }
    setHolidaysUnavailable(false);

    var filtered = holidayCount != null ? getFilteredHolidays() : getFilteredHolidays();
    if (holidayCount == null) holidayCount = filtered.length;
    var shown = renderGrid(
      holidaysGrid, holidaysEmpty, 'holidays', filtered, holidaysShown, renderHolidayCard
    );
    return { total: holidayCount, shown: shown };
  }

  function renderAll() {
    var filteredStays = getFilteredResorts();
    var filteredHolidays = getFilteredHolidays();
    var stayCount = filteredStays.length;
    var holidayCount = filteredHolidays.length;

    updateTabLabels(stayCount, holidayCount);
    maybeAutoSwitchTab(stayCount, holidayCount);

    var stays = renderResorts(stayCount);
    var hols = renderHolidays(holidayCount);
    updateResultsMeta(stayCount, holidayCount, stays.shown, hols.shown);
  }

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(function () {
      renderScheduled = false;
      renderAll();
    });
  }

  function applySearch(fromInput) {
    if (fromInput) {
      searchQuery = destinationInput.value;
      searchTokens = tokenizeQuery(searchQuery);
      if (searchClearBtn) searchClearBtn.hidden = !searchQuery.trim();
    }
    invalidateCache();
    if (hasActiveFilters()) {
      resortsShown = SEARCH_MAX;
      holidaysShown = SEARCH_MAX;
    } else {
      resortsShown = PAGE_SIZE;
      holidaysShown = PAGE_SIZE;
    }
    scheduleRender();
  }

  function renderLoadMore(kind, total, shown, isFiltered) {
    removeLoadMore(kind);
    if (isFiltered || shown >= total) return;

    var wrap = document.createElement('div');
    wrap.className = 'exp-load-more-wrap';
    wrap.setAttribute('data-load-more', kind);
    wrap.innerHTML = '<button type="button" class="exp-load-more">Show more (' + (total - shown) + ' remaining)</button>';

    var grid = kind === 'resorts' ? resortsGrid : holidaysGrid;
    var empty = kind === 'resorts' ? resortsEmpty : holidaysEmpty;
    grid.parentNode.insertBefore(wrap, empty);

    wrap.querySelector('.exp-load-more').addEventListener('click', function () {
      if (kind === 'resorts') {
        resortsShown += PAGE_SIZE;
      } else {
        holidaysShown += PAGE_SIZE;
      }
      scheduleRender();
    });
  }

  function removeLoadMore(kind) {
    var existing = document.querySelector('[data-load-more="' + kind + '"]');
    if (existing) existing.remove();
  }

  function buildStateFilters() {
    var states = [];
    var seen = {};
    resorts.forEach(function (r) {
      if (r.state && !seen[r.state]) {
        seen[r.state] = true;
        states.push(r.state);
      }
    });
    states.sort();

    stateFiltersEl.innerHTML = '<button type="button" class="exp-filter-chip is-active" data-state="">All India</button>' +
      states.map(function (s) {
        return '<button type="button" class="exp-filter-chip" data-state="' + escapeHtml(s) + '">' + escapeHtml(s) + '</button>';
      }).join('');
  }

  function buildTypeFilter() {
    var types = {};
    resorts.forEach(function (r) {
      experienceTags(r.experienceType).forEach(function (t) {
        types[normalizeText(t)] = t;
      });
    });

    Object.keys(types).sort().slice(0, 24).forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = types[key];
      typeSelect.appendChild(opt);
    });
  }

  function buildRegionIndex() {
    var byRegion = {};
    resorts.forEach(function (r) {
      if (!byRegion[r.region]) byRegion[r.region] = [];
      if (byRegion[r.region].length < 4) byRegion[r.region].push(r);
    });

    var regions = Object.keys(byRegion).sort(function (a, b) {
      var rankA = byRegion[a][0] ? byRegion[a][0].rank : 999;
      var rankB = byRegion[b][0] ? byRegion[b][0].rank : 999;
      return rankA - rankB;
    }).slice(0, 24);

    regionIndexEl.innerHTML = regions.map(function (region) {
      var items = byRegion[region].map(function (r) {
        return '<li><a href="#" data-search="' + escapeHtml(r.name) + '">' + escapeHtml(r.name) + '</a></li>';
      }).join('');
      return '<div class="exp-region-col"><h4>Top Resorts in ' + escapeHtml(region) + '</h4><ul>' + items + '</ul></div>';
    }).join('');
  }

  function switchTab(tab, silent) {
    activeTab = tab;
    document.querySelectorAll('.exp-tab').forEach(function (btn) {
      var isActive = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.getElementById('panel-stays').hidden = tab !== 'stays';
    document.getElementById('panel-stays').classList.toggle('is-active', tab === 'stays');
    document.getElementById('panel-holidays').hidden = tab !== 'holidays';
    document.getElementById('panel-holidays').classList.toggle('is-active', tab === 'holidays');
    stateFiltersEl.style.display = tab === 'stays' ? '' : 'none';
    closeAllChallengeDrawers();

    if (!silent) {
      scheduleRender();
      var panel = tab === 'stays' ? document.getElementById('panel-stays') : document.getElementById('panel-holidays');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function bindGridDelegation() {
    function onGridClick(e) {
      var challengeBtn = e.target.closest('.exp-card-challenge');
      if (challengeBtn) {
        e.preventDefault();
        var card = challengeBtn.closest('.exp-card');
        if (!card) return;

        if (card.classList.contains('is-challenge-open')) {
          closeAllChallengeDrawers();
          return;
        }

        closeAllChallengeDrawers();
        card.classList.add('is-challenge-open');
        showChallengeBackdrop();
        var drawer = card.querySelector('.exp-card-challenge-drawer');
        if (drawer) {
          drawer.hidden = false;
          drawer.classList.add('is-opening');
          setTimeout(function () { drawer.classList.remove('is-opening'); }, 420);
          var priceInput = drawer.querySelector('[name="quoted_price"]');
          if (priceInput) priceInput.focus();
          refreshIcons(drawer);
        }
        return;
      }

      var lockBtn = e.target.closest('.exp-lock-deal-btn');
      if (lockBtn) {
        e.preventDefault();
        var lockForm = lockBtn.closest('.exp-inline-challenge-form');
        if (lockForm && !lockBtn.disabled) showLockCheckoutStage(lockForm);
        return;
      }

      var payBtn = e.target.closest('.exp-pay-lock-btn');
      if (payBtn) {
        e.preventDefault();
        var payForm = payBtn.closest('.exp-inline-challenge-form');
        if (payForm && !payBtn.disabled) handleLockPayment(payForm);
        return;
      }

      var closeBtn = e.target.closest('.exp-drawer-close');
      if (closeBtn) {
        e.preventDefault();
        closeAllChallengeDrawers();
      }
    }

    function onGridInput(e) {
      if (e.target.matches('[name="quoted_price"]')) {
        var form = e.target.closest('.exp-inline-challenge-form');
        if (form) updateChallengeUI(form);
      }
    }

    function onGridSubmit(e) {
      var form = e.target.closest('.exp-inline-challenge-form');
      if (form) {
        e.preventDefault();
        handleChallengeSubmit(form);
      }
    }

    function onGridImageError(e) {
      var img = e.target;
      if (!img || !img.classList.contains('exp-card-photo')) return;
      markImageFailed(img);
      resortBrokenCardsToEnd(img.closest('.exp-grid'));
    }

    function onGridImageLoad(e) {
      var img = e.target;
      if (!img || !img.classList.contains('exp-card-photo') || img.classList.contains('is-failed')) return;
      img.classList.add('is-loaded');
    }

    resortsGrid.addEventListener('error', onGridImageError, true);
    holidaysGrid.addEventListener('error', onGridImageError, true);
    resortsGrid.addEventListener('load', onGridImageLoad, true);
    holidaysGrid.addEventListener('load', onGridImageLoad, true);

    resortsGrid.addEventListener('click', onGridClick);
    holidaysGrid.addEventListener('click', onGridClick);
    resortsGrid.addEventListener('input', onGridInput);
    holidaysGrid.addEventListener('input', onGridInput);
    resortsGrid.addEventListener('submit', onGridSubmit);
    holidaysGrid.addEventListener('submit', onGridSubmit);
  }

  function bindEvents() {
    document.querySelectorAll('.exp-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    destinationInput.addEventListener('input', function () {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        applySearch(true);
      }, SEARCH_DEBOUNCE_MS);
    });

    destinationInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchDebounceTimer);
        applySearch(true);
      }
    });

    destinationInput.addEventListener('search', function () {
      if (!destinationInput.value) {
        clearTimeout(searchDebounceTimer);
        applySearch(true);
      }
    });

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', function () {
        destinationInput.value = '';
        applySearch(true);
        destinationInput.focus();
      });
    }

    typeSelect.addEventListener('change', function () {
      typeFilter = typeSelect.value;
      applySearch(false);
    });

    budgetSelect.addEventListener('change', function () {
      budgetFilter = budgetSelect.value;
      applySearch(false);
    });

    stateFiltersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.exp-filter-chip');
      if (!btn) return;
      stateFiltersEl.querySelectorAll('.exp-filter-chip').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      activeState = btn.getAttribute('data-state') || '';
      applySearch(false);
    });

    regionIndexEl.addEventListener('click', function (e) {
      var link = e.target.closest('[data-search]');
      if (!link) return;
      e.preventDefault();
      switchTab('stays', true);
      destinationInput.value = link.getAttribute('data-search') || '';
      activeState = '';
      stateFiltersEl.querySelectorAll('.exp-filter-chip').forEach(function (b, i) {
        b.classList.toggle('is-active', i === 0);
      });
      applySearch(true);
      document.getElementById('panel-stays').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllChallengeDrawers();
    });

    var backdrop = getChallengeBackdrop();
    if (backdrop) {
      backdrop.addEventListener('click', closeAllChallengeDrawers);
    }
  }

  function init() {
    if (window.InstaHelpAPI && window.InstaHelpAPI.warmupBackend) {
      window.InstaHelpAPI.warmupBackend();
    }
    loadHolidayPackages(function () {
      if (!resorts.length && !holidays.length) return;
      buildSearchIndex();
      buildStateFilters();
      buildTypeFilter();
      buildRegionIndex();
      bindGridDelegation();
      bindEvents();
      updateTabLabels(resorts.length, holidays.length);
      scheduleRender();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
