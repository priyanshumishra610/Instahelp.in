/** Apps Script web app — must match latest code.gs deployment (see code.gs doGet version). */
const IH_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbwVllMnXYQ35TmWUHAP52bmdPa45zYcfOoz5Q4O6DKF-csF7K-Ekh-Riu1EhLHmwsCLAA/exec';
const IH_SHEET_VERSION_EXPECTED = '2026-07-29';

async function verifySheetWebApp() {
  try {
    const res = await fetch(IH_SHEET_URL);
    const text = await res.text();
    let info = null;
    try {
      info = JSON.parse(text);
    } catch (err) {
      info = null;
    }
    if (!info || !info.postSupported) {
      console.warn(
        '[InstaHelp] Form sheet web app is not ready. POST may fail — redeploy code.gs as Web app (Anyone). GET response:',
        text.slice(0, 200)
      );
      return;
    }
    if (info.version && info.version !== IH_SHEET_VERSION_EXPECTED) {
      console.warn(
        '[InstaHelp] Sheet web app version mismatch. Site expects',
        IH_SHEET_VERSION_EXPECTED + ', deployed:',
        info.version,
        '— paste code.gs and redeploy.'
      );
    }
  } catch (err) {
    console.warn('[InstaHelp] Could not reach sheet web app:', err);
  }
}

/* Scroll reveals handled by js/ui-marathon.js */

/* ── PAUSE HEAVY ANIMATIONS WHILE SCROLLING ── */
(function initScrollPerf() {
  let scrollTimer;
  const onScroll = () => {
    if (!document.body.classList.contains('is-scrolling')) {
      document.body.classList.add('is-scrolling');
    }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 120);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ── FAQ: single-open accordion (optional nicety) ── */
(function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        items.forEach((o) => { if (o !== item) o.open = false; });
      }
    });
  });
})();

/* ── INIT ICONS + WHATSAPP SHORTCUTS ── */
const IH_WA_NUMBER = '917022702220';
const IH_QH_CLICKS_KEY = 'ih_qh_clicks';
const IH_QH_WA_KEY = 'ih_qh_wa_opens';

function recordQuickHelpClick(topic) {
  try {
    const o = JSON.parse(localStorage.getItem(IH_QH_CLICKS_KEY) || '{}');
    o[topic] = (o[topic] || 0) + 1;
    localStorage.setItem(IH_QH_CLICKS_KEY, JSON.stringify(o));
  } catch (err) {}
}

function recordQuickHelpWhatsAppOpen(topic) {
  try {
    const o = JSON.parse(localStorage.getItem(IH_QH_WA_KEY) || '{}');
    o[topic] = (o[topic] || 0) + 1;
    localStorage.setItem(IH_QH_WA_KEY, JSON.stringify(o));
  } catch (err) {}
}

let qhSelectedTopic = '';

function formatAddressFromParts(addr) {
  if (!addr) return '';
  const parts = [
    addr.house_number,
    addr.road || addr.residential || addr.pedestrian,
    addr.suburb || addr.neighbourhood || addr.quarter,
    addr.city || addr.town || addr.village || addr.county,
    addr.state,
    addr.postcode
  ].filter(Boolean);
  return parts.join(', ');
}

function formatCityFromParts(addr) {
  if (!addr) return '';
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.county ||
    addr.state_district ||
    addr.state ||
    ''
  );
}

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 12000, maximumAge: 600000 };
let _ihGeoCache = null;
let _ihGeoPromise = null;

async function reverseGeocodeParts(lat, lon) {
  const r = await fetch(
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' +
      lat +
      '&lon=' +
      lon,
    { headers: { 'Accept-Language': 'en' } }
  );
  const j = await r.json();
  const addr = j.address || {};
  const fallback = j.display_name || lat.toFixed(4) + ', ' + lon.toFixed(4);
  return {
    full: formatAddressFromParts(addr) || fallback,
    city: formatCityFromParts(addr) || fallback,
  };
}

function getBrowserLocation(force) {
  if (force) {
    _ihGeoCache = null;
    _ihGeoPromise = null;
  }
  if (_ihGeoCache) return Promise.resolve(_ihGeoCache);
  if (_ihGeoPromise) return _ihGeoPromise;

  _ihGeoPromise = new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      _ihGeoPromise = null;
      reject(new Error('unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          _ihGeoCache = await reverseGeocodeParts(pos.coords.latitude, pos.coords.longitude);
          resolve(_ihGeoCache);
        } catch (err) {
          reject(err);
        } finally {
          _ihGeoPromise = null;
        }
      },
      (err) => {
        _ihGeoPromise = null;
        reject(err);
      },
      GEO_OPTIONS
    );
  });

  return _ihGeoPromise;
}

function syncFloatLabel(input) {
  const wrap = input && input.closest('.hero-field-float');
  if (wrap) wrap.classList.toggle('is-filled', !!String(input.value || '').trim());
}

function setDetectButtonState(btn, label) {
  if (!btn) return;
  const labelEl = btn.querySelector('.btn-qh-detect-label');
  if (labelEl) labelEl.textContent = label;
  else btn.textContent = label;
}

function fillAddressInput(inputId, buttonId, options) {
  const opts = options || {};
  const input = document.getElementById(inputId);
  if (!input || (input.value.trim() && !opts.force)) return;

  const btn = buttonId ? document.getElementById(buttonId) : null;
  if (!input.dataset.defaultPlaceholder) {
    input.dataset.defaultPlaceholder = input.placeholder;
  }
  if (btn && !btn.dataset.defaultLabel) {
    const labelEl = btn.querySelector('.btn-qh-detect-label');
    btn.dataset.defaultLabel = labelEl ? labelEl.textContent : btn.textContent;
  }

  if (btn) {
    btn.disabled = true;
    setDetectButtonState(btn, 'Detecting…');
  }
  input.placeholder = 'Detecting your location…';

  getBrowserLocation(opts.force)
    .then((loc) => {
      input.value = opts.mode === 'city' ? loc.city : loc.full;
      syncFloatLabel(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })
    .catch((err) => {
      if (!opts.alertOnFail) return;
      if (err && err.message === 'unsupported') {
        alert('Location is not supported in this browser. Please type your address.');
        return;
      }
      alert('Could not detect your location. Please type it manually or allow location access.');
    })
    .finally(() => {
      input.placeholder = input.dataset.defaultPlaceholder || '';
      syncFloatLabel(input);
      if (btn) {
        btn.disabled = false;
        setDetectButtonState(btn, btn.dataset.defaultLabel || 'Use my location');
        if (window.lucide) lucide.createIcons();
      }
    });
}


document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  const heroDetect = document.getElementById('heroDetectAddress');
  if (heroDetect) {
    heroDetect.addEventListener('click', () => {
      const ok = window.confirm(
        'InstaHelp will ask your browser for location only to help fill your address. You can skip this and type your address manually.'
      );
      if (!ok) return;
      fillAddressInput('exact_address', 'heroDetectAddress', { alertOnFail: true, force: true });
    });
  }

  initHeroInteractiveForm();
  initHeroPromptDemo();
  verifySheetWebApp();

  const qhModal = document.getElementById('quickHelpModal');
  const qhForm  = document.getElementById('quickHelpForm');
  const qhClose = document.getElementById('qhModalClose');
  const qhDetect = document.getElementById('qhDetectLoc');

  if (!qhModal || !qhForm) return;

  function openQuickHelpModal(topic) {
    qhSelectedTopic = topic;
    recordQuickHelpClick(topic);
    const titleEl = document.getElementById('qh-modal-title');
    const subEl   = document.getElementById('qh-modal-sub');
    if (titleEl) titleEl.textContent = topic;
    if (subEl) subEl.textContent = 'Two taps to WhatsApp. Add a quick line below.';
    document.getElementById('qh_service').value = '';
    document.getElementById('qh_name').value = '';
    document.getElementById('qh_location').value = '';
    qhModal.classList.add('show');
    qhModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      const s = document.getElementById('qh_service');
      if (s) s.focus();
    }, 80);
  }

  function closeQuickHelpModal() {
    qhModal.classList.remove('show');
    qhModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.qh-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const issue = btn.getAttribute('data-issue') || 'Help';
      openQuickHelpModal(issue);
    });
  });

  qhClose.addEventListener('click', closeQuickHelpModal);
  qhModal.addEventListener('click', (e) => {
    if (e.target === qhModal) closeQuickHelpModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qhModal.classList.contains('show')) closeQuickHelpModal();
  });

  qhForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('qh_name').value.trim();
    const service = document.getElementById('qh_service').value.trim();
    const loc = document.getElementById('qh_location').value.trim();
    if (!service) {
      document.getElementById('qh_service').focus();
      return;
    }
    const topic = qhSelectedTopic || 'Help';
    const text =
      'Hi, I need help with ' +
      topic +
      '\n\n' +
      'Name: ' +
      (name || '') +
      '\n' +
      'Service: ' +
      service +
      '\n' +
      'Location: ' +
      (loc || '') +
      '\n\n' +
      'Please assist.';
    recordQuickHelpWhatsAppOpen(topic);
    const url = 'https://wa.me/' + IH_WA_NUMBER + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
    closeQuickHelpModal();
  });

  if (qhDetect) {
    qhDetect.addEventListener('click', () => {
      const ok = window.confirm(
        'InstaHelp will ask your browser for location only to help fill your city. You can skip this and type manually.'
      );
      if (!ok) return;
      fillAddressInput('qh_location', 'qhDetectLoc', { alertOnFail: true, force: true, mode: 'city' });
    });
  }
});

/* ── HERO FORM (single panel) ── */
function initHeroInteractiveForm() {
  const form = document.getElementById('heroForm');
  if (!form) return;

  const msg = document.getElementById('message');
  const msgCount = document.getElementById('messageCount');
  const serviceSel = document.getElementById('serviceSelect');

  function validateField(input) {
    const wrap = input.closest('.hero-field-float');
    if (!wrap) return true;
    const status = wrap.querySelector('.hero-field-status');
    let ok = true;
    if (input.hasAttribute('required') && !input.value.trim()) ok = false;
    if (input.type === 'tel' && input.value.trim() && !/^[\d\s+\-()]{8,15}$/.test(input.value.trim())) ok = false;
    if (input.type === 'email' && input.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) ok = false;
    wrap.classList.toggle('is-valid', ok && input.value.trim().length > 0);
    wrap.classList.toggle('is-invalid', !ok && input.value.trim().length > 0);
    if (status) status.classList.toggle('is-valid', ok && input.value.trim().length > 0);
    return ok;
  }

  document.querySelectorAll('.hero-cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.hero-cat-chip').forEach(c => c.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      const prompt = chip.dataset.prompt || '';
      const service = chip.dataset.service || '';
      if (serviceSel && service) serviceSel.value = service;
      if (msg) {
        if (!msg.value.trim() || msg.value.startsWith('I need')) {
          msg.value = prompt;
        }
        msg.focus();
        msg.dispatchEvent(new Event('input'));
        validateField(msg);
      }
    });
  });

  if (msg && msgCount) {
    const updateCount = () => {
      msgCount.textContent = msg.value.length + ' / 1000';
    };
    msg.addEventListener('input', updateCount);
    updateCount();
  }

  form.querySelectorAll('.hero-field-float input, .hero-field-float textarea').forEach(input => {
    syncFloatLabel(input);
    input.addEventListener('blur', () => {
      syncFloatLabel(input);
      validateField(input);
    });
    input.addEventListener('input', () => {
      syncFloatLabel(input);
      if (input.value.trim()) validateField(input);
      else input.closest('.hero-field-float')?.classList.remove('is-valid', 'is-invalid');
    });
  });

  window._ih_resetHeroForm = function resetHeroForm() {
    document.querySelectorAll('.hero-cat-chip').forEach(c => c.classList.remove('is-selected'));
    form.querySelectorAll('.hero-field-float').forEach(f => {
      f.classList.remove('is-valid', 'is-invalid', 'is-filled');
    });
    if (msgCount && msg) msgCount.textContent = '0 / 1000';
  };
}

const HERO_CATEGORIES = [
  { label: 'Plumber', icon: 'wrench', prompt: 'I need a plumber to fix a leaking tap in my kitchen.', phrase: 'a plumber in Whitefield by tomorrow' },
  { label: 'CA / GST', icon: 'file-text', prompt: 'I need a CA to file my GST returns this month.', phrase: 'a CA for GST filing this week' },
  { label: 'Packers', icon: 'truck', prompt: 'I need packers and movers for a 2BHK shift next weekend.', phrase: 'packers for my 2BHK move to Pune' },
  { label: 'Electrician', icon: 'zap', prompt: 'I need an electrician — the fuse keeps tripping.', phrase: 'an electrician for a power issue at home' },
  { label: 'Deep cleaning', icon: 'sparkles', prompt: 'I need deep cleaning for my 3BHK before guests arrive.', phrase: 'deep cleaning before guests arrive' },
  { label: 'Photographer', icon: 'camera', prompt: 'I need a wedding photographer for next month.', phrase: 'a wedding photographer for my event' },
  { label: 'Interior designer', icon: 'palette', prompt: 'I need an interior designer for my new apartment.', phrase: 'an interior designer for my 2BHK' },
  { label: 'Tutor', icon: 'book-open', prompt: 'I need a home tutor for maths for Class 10.', phrase: 'a home tutor for maths this week' },
  { label: 'Pest control', icon: 'bug', prompt: 'I need pest control for cockroaches in my kitchen.', phrase: 'pest control for my apartment' },
  { label: 'Visa help', icon: 'plane', prompt: 'I need help with Schengen visa documentation.', phrase: 'Schengen visa help for Europe trip' },
  { label: 'Web developer', icon: 'code', prompt: 'I need a website developer for my small business.', phrase: 'a website developer for my startup' },
  { label: 'AC repair', icon: 'wind', prompt: 'I need urgent AC repair — not cooling properly.', phrase: 'urgent AC repair this afternoon' },
  { label: 'Event planner', icon: 'calendar-days', prompt: 'I need an event planner for a corporate offsite.', phrase: 'an event planner for a corporate event' },
  { label: 'Salon at home', icon: 'scissors', prompt: 'I need salon services at home this weekend.', phrase: 'salon at home for this Saturday' },
  { label: 'Lawyer', icon: 'scale', prompt: 'I need a lawyer to review a rental agreement.', phrase: 'a lawyer to review my contract' },
];

const HERO_PROMPT_PHRASES = HERO_CATEGORIES.map(c => c.phrase);

function renderHeroCategoryChips(container) {
  if (!container) return [];
  container.innerHTML = HERO_CATEGORIES.map((cat, i) =>
    `<button type="button" class="hero-prompt-chip${i === 0 ? ' is-cycle-active' : ''}" data-index="${i}" data-prompt="${cat.prompt.replace(/"/g, '&quot;')}">
      <i data-lucide="${cat.icon}" aria-hidden="true" class="hero-prompt-chip-icon"></i>
      ${cat.label}
    </button>`
  ).join('');
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  return container.querySelectorAll('.hero-prompt-chip');
}

function setHeroCategoryIndex(index, { animateWord = true } = {}) {
  const chips = document.querySelectorAll('.hero-prompt-chip');
  const cycleWord = document.getElementById('heroCatCycleWord');
  const cat = HERO_CATEGORIES[index];
  if (!cat) return;

  chips.forEach((chip, i) => {
    chip.classList.toggle('is-cycle-active', i === index);
    chip.classList.toggle('is-active', i === index);
  });

  const activeChip = chips[index];
  const chipScroller = document.getElementById('heroCategoryChips');
  if (activeChip && chipScroller && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const cr = chipScroller.getBoundingClientRect();
    const br = activeChip.getBoundingClientRect();
    if (br.left < cr.left || br.right > cr.right) {
      activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  if (cycleWord && animateWord) {
    cycleWord.classList.remove('is-entering');
    cycleWord.classList.add('is-exiting');
    setTimeout(() => {
      cycleWord.textContent = cat.label;
      cycleWord.classList.remove('is-exiting');
      cycleWord.classList.add('is-entering');
      setTimeout(() => cycleWord.classList.remove('is-entering'), 260);
    }, 120);
  } else if (cycleWord) {
    cycleWord.textContent = cat.label;
  }
}

function heroAnimatePhraseSwap(typedEl, nextText, onComplete) {
  if (!typedEl) {
    onComplete?.();
    return;
  }

  typedEl.classList.remove('is-entering');
  typedEl.classList.add('is-exiting');

  setTimeout(() => {
    typedEl.classList.remove('is-exiting');
    typedEl.textContent = '';
    typedEl.classList.add('is-entering');

    let i = 0;
    const typeSpeed = 12;

    function typeStep() {
      i += 1;
      typedEl.textContent = nextText.slice(0, i);
      if (i >= nextText.length) {
        typedEl.classList.remove('is-entering');
        onComplete?.();
        return;
      }
      setTimeout(typeStep, typeSpeed);
    }

    typeStep();
  }, 180);
}

function focusHeroForm(messageText) {
  const formCard = document.getElementById('heroFormCard');
  const message = document.getElementById('message');
  const target = formCard || document.getElementById('heroForm');

  if (target) ihScrollTo(target, 96);

  if (message && messageText) {
    message.value = messageText;
    syncFloatLabel(message);
    message.dispatchEvent(new Event('input', { bubbles: true }));
  }

  setTimeout(() => message?.focus(), 280);

  if (formCard) {
    formCard.classList.add('hero-form-highlight');
    setTimeout(() => formCard.classList.remove('hero-form-highlight'), 1200);
  }
}

function initHeroPromptDemo() {
  const typed = document.getElementById('heroTypedText');
  const cursor = document.getElementById('heroTypedCursor');
  const chipContainer = document.getElementById('heroCategoryChips');
  const chips = renderHeroCategoryChips(chipContainer);
  if (!typed) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused = false;
  let phraseIndex = 0;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      userPaused = true;
      phraseIndex = parseInt(chip.dataset.index, 10) || 0;
      setHeroCategoryIndex(phraseIndex);
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      focusHeroForm(chip.dataset.prompt || '');
      typed.textContent = HERO_CATEGORIES[phraseIndex].phrase;
      setTimeout(() => { userPaused = false; }, 8000);
    });
  });

  if (reducedMotion || HERO_CATEGORIES.length < 2) {
    typed.textContent = HERO_CATEGORIES[0].phrase;
    if (cursor) cursor.style.display = 'none';
    setHeroCategoryIndex(0, { animateWord: false });
    return;
  }

  const HOLD_MS = 850;
  const CYCLE_GAP_MS = 120;

  function runCycle() {
    if (userPaused) {
      setTimeout(runCycle, 250);
      return;
    }

    const phrase = HERO_PROMPT_PHRASES[phraseIndex];
    setHeroCategoryIndex(phraseIndex);

    heroAnimatePhraseSwap(typed, phrase, () => {
      setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % HERO_PROMPT_PHRASES.length;
        setTimeout(runCycle, CYCLE_GAP_MS);
      }, HOLD_MS);
    });
  }

  setTimeout(runCycle, 350);
}

/* ── SERVICE OPTIONS ── */
const SERVICE_TABS = [
  "Home & Personal","Business & Corporate","Tech & Creative",
  "Personal Care & Wellness","Events & Travel","Education",
  "Real Estate","Manufacturers & Suppliers","Anything Else"
];
const sel = document.getElementById('serviceSelect');
if (sel) {
  SERVICE_TABS.forEach(t => {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });
}

/* ── TRAFFIC + EVIDENCE CAPTURE (runs immediately) ── */
(function captureTrafficData() {
  const referrer = document.referrer || '';
  const params   = new URLSearchParams(window.location.search);
  const page     = window.location.href;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  set('referrer_url', referrer);
  set('utm_source',   params.get('utm_source')   || '');
  set('utm_medium',   params.get('utm_medium')   || '');
  set('utm_campaign', params.get('utm_campaign') || '');
  set('landing_page', page);

  // Auto-detect confusion referral sources
  const confusionDomains = [
    'magicpin.in','sulekha.com','justdial.com'
  ];
  const isConfusion = confusionDomains.some(d => referrer.toLowerCase().includes(d));
  set('confusion_referral_flag', isConfusion ? 'YES' : 'no');

  // Store for use in submit handler
  window._ih_referrer_confusion = isConfusion;
})();

/* ── SECURITY NOTE ──
   Devtools detection + copy/paste blocking were removed.
   Reasons:
   - The window.outerHeight/innerHeight check fires false-positives on
     mobile browsers, on resized desktop windows, and when the user has
     a bookmarks bar — showing the "close devtools" overlay to legit users.
   - Disabling copy/cut/paste breaks email/phone autofill on mobile
     and is a major conversion killer. It does not stop bots either.
   Real protection lives server-side: rate limiting, honeypot (kept),
   form_token (kept), and Apps Script validation. */

/* ── NOTIFICATION ── */
let _notifTimer;
const notifEl    = document.getElementById('notification');
const notifClose = notifEl.querySelector('.notification-close');

function showNotif() {
  notifEl.classList.add('show');
  notifEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  clearTimeout(_notifTimer);
  _notifTimer = setTimeout(hideNotif, 8000);
}

function hideNotif() {
  clearTimeout(_notifTimer);
  notifEl.classList.remove('show');
  notifEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

notifClose.addEventListener('click', hideNotif);
notifEl.addEventListener('click', e => { if (e.target === notifEl) hideNotif(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && notifEl.classList.contains('show')) hideNotif();
});

/* ── TOKEN ── */
function generateToken() {
  return btoa([Date.now(), Math.random(), navigator.userAgent.length].join('-'));
}

/* ── FORM SUBMIT ── */
function secureSubmitForm(e) {
  e.preventDefault();

  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');

  // Honeypot check
  if (form.querySelector('input[name="honeypot"]').value) return;

  // Rate limiting
  const count = parseInt(sessionStorage.getItem('ih_fc') || '0');
  if (count >= 4) {
    alert('Too many submissions. Please WhatsApp +91 70227 02220 directly.');
    return;
  }

  // Consent gates — both required, unticked by default
  const providerConsent = form.querySelector('input[name="evidence_consent"]');
  const privacyConsent = form.querySelector('input[name="privacy_consent"]');
  if (providerConsent && !providerConsent.checked) {
    providerConsent.focus();
    return;
  }
  if (privacyConsent && !privacyConsent.checked) {
    privacyConsent.focus();
    return;
  }

  const phoneEl = form.querySelector('[name="phone"]');
  if (phoneEl && phoneEl.hasAttribute('required') && !phoneEl.value.trim()) {
    phoneEl.focus();
    return;
  }

  const emailEl = form.querySelector('[name="email"]');
  if (emailEl && emailEl.hasAttribute('required') && !emailEl.value.trim()) {
    emailEl.focus();
    return;
  }

  const addressEl = form.querySelector('[name="address"]');
  if (addressEl && addressEl.hasAttribute('required') && !addressEl.value.trim()) {
    addressEl.focus();
    return;
  }

  const defaultLabel = btn?.dataset.defaultLabel || 'Send request';
  const labelEl = btn?.querySelector('.btn-hero-submit-text');

  if (labelEl) labelEl.textContent = 'Sending…';
  else if (btn) btn.textContent = 'Sending…';
  if (btn) btn.disabled = true;

  // Determine confusion instance
  const sourceVal   = (form.querySelector('select[name="source"]')?.value    || '').toLowerCase();
  const paymentVal  = (form.querySelector('select[name="prior_payment"]')?.value || '').toLowerCase();
  const flagEl      = document.getElementById('confusion_referral_flag');
  const referrerFlag = flagEl ? flagEl.value : 'no';

  const isConfusion =
    sourceVal === 'some' ||
    sourceVal === 'playstore' ||
    paymentVal === 'yes_elsewhere' ||
    referrerFlag === 'YES';

  // Set computed hidden fields
  const ciEl = document.getElementById('confusion_instance');
  if (ciEl) ciEl.value = isConfusion ? 'YES,REVIEW' : 'no';

  const ftEl = document.getElementById('form_token');
  if (ftEl) ftEl.value = generateToken();

  // Build payload,use name attributes for reliability
  const g = (name) => {
    const el = form.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : '';
  };

  const data = {
    // Contact
    name:     g('fullname'),
    email:    g('email'),
    phone:    g('phone'),
    address:  g('address'),
    service:  g('service'),
    message:  g('message'),

    // Evidence fields
    source:                  g('source'),
    prior_payment:           g('prior_payment'),
    evidence_consent:        providerConsent?.checked ? 'YES' : 'NO',
    privacy_consent:         privacyConsent?.checked ? 'YES' : 'NO',
    confusion_instance:      isConfusion ? 'YES,REVIEW' : 'no',

    // Traffic
    referrer_url:            g('referrer_url'),
    utm_source:              g('utm_source'),
    utm_medium:              g('utm_medium'),
    utm_campaign:            g('utm_campaign'),
    landing_page:            g('landing_page'),
    confusion_referral_flag: referrerFlag,

    // Meta
    form_id:   g('form_id') || 'hero_form',
    token:     g('form_token'),
    timestamp: new Date().toISOString()
  };

  sessionStorage.setItem('ih_fc', count + 1);

  // Web app (same project as code.gs) → spreadsheet 1d_OP7QSblYraIfMDUBbbNZIAV4Gx7aJSy_wDNTX62pk
  const SHEET_URL = IH_SHEET_URL;

  // BELT + SUSPENDERS — we send the payload via TWO independent paths.
  // Either is enough; both running in parallel reduces lead loss if one
  // path is blocked by an extension, network condition, or browser quirk.
  let deliveryAttempted = false;

  // PATH 1: Real <form> POST via hidden iframe. This is the most
  // reliable path because Apps Script doPost(e) reads e.parameter.data
  // exactly the way it would from a normal HTML form submission.
  try {
    const frame = document.getElementById('ihGsheetFrame') || { name: 'ihGsheetFrame' };
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = SHEET_URL;
    f.target = frame.name || 'ihGsheetFrame';
    f.setAttribute('accept-charset', 'UTF-8');
    const h = document.createElement('input');
    h.type = 'hidden';
    h.name = 'data';
    h.value = JSON.stringify(data);
    f.appendChild(h);
    document.body.appendChild(f);
    f.submit();
    document.body.removeChild(f);
    deliveryAttempted = true;
  } catch (err) {
    console.warn('Iframe POST failed:', err);
  }

  // PATH 2: fetch() with no-cors as a parallel backup. Fire-and-forget;
  // we cannot read the response across origins, but the request still
  // reaches Apps Script and triggers doPost(e). Different code path
  // from the iframe, so an extension blocking one may not block the other.
  try {
    const fd = new FormData();
    fd.append('data', JSON.stringify(data));
    fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: fd })
      .catch(err => console.warn('Fetch backup failed:', err));
    deliveryAttempted = true;
  } catch (err) {
    console.warn('Fetch backup threw:', err);
  }

  // PATH 3: If BOTH client paths failed to even fire, surface a mailto
  // fallback so the lead is never silently dropped.
  if (!deliveryAttempted) {
    const subject = encodeURIComponent('InstaHelp request — ' + (data.name || 'New lead'));
    const body = encodeURIComponent(
      'Name: ' + data.name + '\n' +
      'Phone: ' + data.phone + '\n' +
      'Email: ' + data.email + '\n' +
      'Address: ' + data.address + '\n' +
      'Service: ' + data.service + '\n\n' +
      'Message:\n' + data.message + '\n\n' +
      '— sent from instahelp.in fallback —'
    );
    window.location.href = 'mailto:mail@instahelp.in?subject=' + subject + '&body=' + body;
    return;
  }

  // Reset form
  form.reset();
  // Re-populate hidden traffic fields after reset
  (function rePopulateHidden() {
    const referrer = document.referrer || '';
    const params   = new URLSearchParams(window.location.search);
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('referrer_url', referrer);
    setV('utm_source',   params.get('utm_source')   || '');
    setV('utm_medium',   params.get('utm_medium')   || '');
    setV('utm_campaign', params.get('utm_campaign') || '');
    setV('landing_page', window.location.href);
    setV('confusion_referral_flag', window._ih_referrer_confusion ? 'YES' : 'no');
  })();
  fillAddressInput('exact_address', 'heroDetectAddress', { alertOnFail: false });

  showNotif();

  if (labelEl) labelEl.textContent = 'Request Sent!';
  else if (btn) btn.textContent = 'Request Sent!';
  setTimeout(() => {
    if (labelEl) labelEl.textContent = defaultLabel;
    else if (btn) btn.textContent = defaultLabel;
    if (btn) btn.disabled = false;
    if (typeof window._ih_resetHeroForm === 'function') window._ih_resetHeroForm();
  }, 2500);
}

/* ── ANCHOR SCROLL (offset for fixed header) ── */
function ihScrollTo(target, offset = 88) {
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    ihScrollTo(target);
  });
});
