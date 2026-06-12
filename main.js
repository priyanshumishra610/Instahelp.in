
/* ── REVEAL ON SCROLL ── */
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
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

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

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
      if (!navigator.geolocation) {
        alert('Location is not supported in this browser. Type your city instead.');
        return;
      }
      qhDetect.disabled = true;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const r = await fetch(
              'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' +
                lat +
                '&lon=' +
                lon,
              { headers: { 'Accept-Language': 'en' } }
            );
            const j = await r.json();
            const addr = j.address || {};
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.county ||
              addr.state_district ||
              addr.state ||
              '';
            const locInput = document.getElementById('qh_location');
            if (locInput) {
              locInput.value =
                city || lat.toFixed(4) + ', ' + lon.toFixed(4);
            }
          } catch (err) {
            alert('Could not resolve city. Please type your location.');
          }
          qhDetect.disabled = false;
        },
        () => {
          qhDetect.disabled = false;
          alert('Location permission denied. You can still type your city.');
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
      );
    });
  }
});

/* ── SERVICE OPTIONS ── */
const SERVICE_TABS = [
  "Home & Personal","Business & Corporate","Tech & Creative",
  "Personal Care & Wellness","Events & Travel","Education",
  "Real Estate","Manufacturers & Suppliers","Anything Else"
];
const sel = document.getElementById('serviceSelect');
SERVICE_TABS.forEach(t => {
  const o = document.createElement('option');
  o.value = t; o.textContent = t;
  sel.appendChild(o);
});

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

  // Consent gate
  const consentBox = form.querySelector('input[name="evidence_consent"]');
  if (consentBox && !consentBox.checked) {
    consentBox.focus();
    return;
  }

  btn.textContent = 'Sending…';
  btn.disabled = true;

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
    service:  g('service'),
    message:  g('message'),

    // Evidence fields
    source:                  g('source'),
    prior_payment:           g('prior_payment'),
    evidence_consent:        consentBox?.checked ? 'YES' : 'NO',
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
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxFSRdQaYURJyuhN6Vojf76nMtxWlCHuxW53tYQsIKSOkrRTKP2hn22-b19rNAcNCsH9g/exec';

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

  showNotif();

  btn.textContent = 'Request Sent!';
  setTimeout(() => {
    btn.textContent = 'Submit Request →';
    btn.disabled = false;
  }, 2500);
}

/* ── SMOOTH ANCHOR SCROLL (offset for fixed header) ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 100;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
