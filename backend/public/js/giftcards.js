(function () {
  'use strict';

  var iframe = document.getElementById('hubble-sdk');
  var loader = document.getElementById('loading-spinner');
  var errorState = document.getElementById('error-state');
  var errorMessage = document.getElementById('error-message');
  var retryBtn = document.getElementById('retry-btn');
  var phoneGate = document.getElementById('phone-gate');
  var phoneForm = document.getElementById('phone-gate-form');
  var DEVICE_ID_KEY = 'ih_hubble_device_id';
  var PHONE_KEY = 'ih_hubble_phone';
  var readyTimer = null;

  if (!iframe || !loader || !errorState) return;

  function apiBase() {
    if (window.InstaHelpAPI && window.InstaHelpAPI.getApiBase) {
      return window.InstaHelpAPI.getApiBase();
    }
    if (window.InstaHelpPaymentConfig && window.InstaHelpPaymentConfig.resolveApiBaseUrl) {
      return window.InstaHelpPaymentConfig.resolveApiBaseUrl();
    }
    if (window.INSTAHELP_API_BASE) return window.INSTAHELP_API_BASE.replace(/\/$/, '');
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    return window.location.origin.replace(/\/$/, '');
  }

  function authToken() {
    if (window.InstaHelpAPI && window.InstaHelpAPI.getToken) {
      return window.InstaHelpAPI.getToken();
    }
    try {
      return localStorage.getItem('instahelp_auth_token');
    } catch (err) {
      return null;
    }
  }

  function getDeviceId() {
    try {
      var existing = localStorage.getItem(DEVICE_ID_KEY);
      if (existing) return existing;
      var id = 'web_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
      return id;
    } catch (err) {
      return 'web_anonymous';
    }
  }

  function savedPhone() {
    try {
      return localStorage.getItem(PHONE_KEY) || '';
    } catch (err) {
      return '';
    }
  }

  function storePhone(phone) {
    try {
      localStorage.setItem(PHONE_KEY, phone);
    } catch (err) {}
  }

  function clearReadyTimer() {
    if (readyTimer) {
      clearTimeout(readyTimer);
      readyTimer = null;
    }
  }

  function isHubbleOrigin(origin) {
    return /myhubble\.money$/i.test(String(origin || ''));
  }

  function hideAllOverlays() {
    loader.hidden = true;
    errorState.hidden = true;
    if (phoneGate) phoneGate.hidden = true;
  }

  function showLoader() {
    clearReadyTimer();
    hideAllOverlays();
    loader.hidden = false;
    iframe.hidden = true;
    iframe.removeAttribute('src');
  }

  function showPhoneGate() {
    clearReadyTimer();
    hideAllOverlays();
    if (phoneGate) phoneGate.hidden = false;
    iframe.hidden = true;
    iframe.removeAttribute('src');
  }

  function showError(message) {
    clearReadyTimer();
    hideAllOverlays();
    errorState.hidden = false;
    iframe.hidden = true;
    if (errorMessage) errorMessage.textContent = message || 'Unable to load gift cards. Please try again.';
  }

  function revealSdk() {
    clearReadyTimer();
    hideAllOverlays();
    iframe.hidden = false;
  }

  function scheduleSdkReveal() {
    clearReadyTimer();
    iframe.hidden = false;
    readyTimer = setTimeout(revealSdk, 2500);
  }

  function handleSdkMessage(event) {
    if (!isHubbleOrigin(event.origin)) return;

    var data = event.data;
    if (!data || data.type !== 'action') return;

    if (data.action === 'app_ready') {
      revealSdk();
    } else if (data.action === 'close') {
      window.location.href = '/';
    } else if (data.action === 'error') {
      showError('Gift cards could not be loaded. Please try again.');
    }
  }

  window.addEventListener('message', handleSdkMessage);

  function loadSdk(options) {
    options = options || {};
    showLoader();

    var headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    var token = authToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    var phoneNumber = options.phoneNumber || savedPhone();
    var body = { deviceId: getDeviceId() };
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (options.name) body.name = options.name;

    fetch(apiBase() + '/api/hubble/init', {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      headers: headers,
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (payload) {
          if (!res.ok) {
            if (payload && payload.code === 'PHONE_REQUIRED') {
              showPhoneGate();
              return null;
            }
            var msg = (payload && (payload.error || payload.message)) || 'Gift cards are temporarily unavailable.';
            throw new Error(msg);
          }
          return payload;
        });
      })
      .then(function (payload) {
        if (!payload) return;
        var sdkUrl = payload && payload.data && payload.data.sdkUrl;
        if (!sdkUrl) throw new Error('Invalid gift card configuration.');
        if (phoneNumber) storePhone(phoneNumber);
        iframe.onload = function () {
          scheduleSdkReveal();
        };
        iframe.src = sdkUrl;
      })
      .catch(function (err) {
        if (String(err && err.message).toLowerCase().indexOf('failed to fetch') !== -1) {
          showError('Could not reach the server. Start the backend or check your connection.');
          return;
        }
        showError(err && err.message ? err.message : 'Unable to load gift cards.');
      });
  }

  if (retryBtn) retryBtn.addEventListener('click', function () { loadSdk(); });

  if (phoneForm) {
    phoneForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var phoneInput = document.getElementById('gc_phone');
      var nameInput = document.getElementById('gc_name');
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var digits = phone.replace(/\D/g, '').slice(-10);
      if (!/^\d{10}$/.test(digits)) {
        if (phoneInput) phoneInput.focus();
        return;
      }
      loadSdk({
        phoneNumber: digits,
        name: nameInput ? nameInput.value.trim() : '',
      });
    });
  }

  loadSdk();
})();
