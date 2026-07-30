(function () {
  'use strict';

  var SHEET_URL =
    'https://script.google.com/macros/s/AKfycbwVllMnXYQ35TmWUHAP52bmdPa45zYcfOoz5Q4O6DKF-csF7K-Ekh-Riu1EhLHmwsCLAA/exec';

  var platformLabels = {
    ios: 'iOS (App Store)',
    android: 'Android (Google Play)',
    both: 'iOS & Android',
  };

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
  }

  function selectPlatform(value) {
    var hidden = document.getElementById('waitlistPlatform');
    if (hidden) hidden.value = value;

    document.querySelectorAll('.waitlist-platform').forEach(function (btn) {
      var active = btn.getAttribute('data-platform') === value;
      btn.classList.toggle('selected', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function showSuccess(platform) {
    var formWrap = document.getElementById('waitlistFormWrap');
    var success = document.getElementById('waitlistSuccess');
    var platformText = document.getElementById('waitlistSuccessPlatform');

    if (platformText) {
      platformText.textContent = platformLabels[platform] || 'your chosen platform';
    }
    if (formWrap) formWrap.hidden = true;
    if (success) success.hidden = false;
  }

  function submitWaitlist(e) {
    e.preventDefault();

    var form = e.target;
    var honeypot = form.querySelector('input[name="honeypot"]');
    if (honeypot && honeypot.value) return;

    var count = parseInt(sessionStorage.getItem('ih_wl') || '0', 10);
    if (count >= 5) {
      alert('Too many attempts. Please WhatsApp +91 70227 02220.');
      return;
    }

    var name = (form.querySelector('[name="name"]') || {}).value || '';
    var email = (form.querySelector('[name="email"]') || {}).value || '';
    var phone = (form.querySelector('[name="phone"]') || {}).value || '';
    var platform = (form.querySelector('[name="platform"]') || {}).value || 'both';

    name = name.trim();
    email = email.trim();
    phone = phone.trim();

    if (!name || !email || !phone) {
      alert('Please fill in your name, email, and phone number.');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Joining…';
    }

    var data = {
      name: name,
      email: email,
      phone: phone,
      service: 'App Waitlist - ' + (platformLabels[platform] || platform),
      message: 'Platform: ' + (platformLabels[platform] || platform),
      source: 'app_waitlist',
      form_id: 'app_waitlist',
      landing_page: window.location.href,
      referrer_url: document.referrer || '',
      utm_source: qs('utm_source'),
      utm_medium: qs('utm_medium'),
      utm_campaign: qs('utm_campaign'),
      timestamp: new Date().toISOString(),
    };

    sessionStorage.setItem('ih_wl', String(count + 1));

    var delivered = false;

    try {
      var frame = document.getElementById('ihGsheetFrame') || { name: 'ihGsheetFrame' };
      var f = document.createElement('form');
      f.method = 'POST';
      f.action = SHEET_URL;
      f.target = frame.name || 'ihGsheetFrame';
      f.setAttribute('accept-charset', 'UTF-8');
      var h = document.createElement('input');
      h.type = 'hidden';
      h.name = 'data';
      h.value = JSON.stringify(data);
      f.appendChild(h);
      document.body.appendChild(f);
      f.submit();
      document.body.removeChild(f);
      delivered = true;
    } catch (err) {
      console.warn('Waitlist iframe POST failed:', err);
    }

    try {
      var fd = new FormData();
      fd.append('data', JSON.stringify(data));
      fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: fd }).catch(function () {});
      delivered = true;
    } catch (err2) {
      console.warn('Waitlist fetch backup failed:', err2);
    }

    if (!delivered) {
      alert('Could not submit right now. Please WhatsApp +91 70227 02220.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Join the waitlist';
      }
      return;
    }

    showSuccess(platform);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var initial = qs('platform');
    if (initial === 'ios' || initial === 'android' || initial === 'both') {
      selectPlatform(initial);
    } else {
      selectPlatform('both');
    }

    document.querySelectorAll('.waitlist-platform').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectPlatform(btn.getAttribute('data-platform'));
      });
    });

    var form = document.getElementById('waitlistForm');
    if (form) form.addEventListener('submit', submitWaitlist);
  });
})();
