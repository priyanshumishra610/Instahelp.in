/**
 * InstaHelp Payment Configuration
 * All settings stored in localStorage under `paymentSettings`.
 * PhonePe config lives under `phonepe` key — managed via admin-payment.html.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'paymentSettings';

  var DEFAULTS = {
    businessName: 'InstaHelp',
    supportNumber: '+91 70227 02220',
    supportEmail: 'mail@instahelp.in',
    paymentsEnabled: true,
    /* PhonePe — primary gateway */
    apiMode: 'backend',
    apiBaseUrl: 'http://localhost:4001',
    phonepe: {
      enabled: true,
      environment: 'production',
      merchantId: '',
      merchantName: 'InstaHelp Payments',
      paymentLink: '',
      testPaymentLink: '',
      successUrl: 'payment-success.html',
      failureUrl: 'payment-failed.html',
      clientId: '',
      clientVersion: '1',
      apiMode: 'pg_api'
    }
  };

  function readRaw() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function mergePhonePe(stored) {
    var base = Object.assign({}, DEFAULTS.phonepe);
    if (!stored) return base;
    if (stored.phonepe) return Object.assign(base, stored.phonepe);
    /* Migrate legacy flat keys */
    return Object.assign(base, {
      merchantName: stored.merchantName || base.merchantName,
      paymentLink: stored.paymentLink || base.paymentLink,
      testPaymentLink: stored.testPaymentLink || base.testPaymentLink,
      successUrl: stored.successUrl || base.successUrl,
      failureUrl: stored.failureUrl || base.failureUrl,
      environment: stored.testMode ? 'sandbox' : (stored.environment || base.environment)
    });
  }

  function getSettings() {
    var stored = readRaw();
    var settings = Object.assign({}, DEFAULTS);
    if (stored) {
      settings.businessName = stored.businessName || DEFAULTS.businessName;
      settings.supportNumber = stored.supportNumber || DEFAULTS.supportNumber;
      settings.supportEmail = stored.supportEmail || DEFAULTS.supportEmail;
      settings.paymentsEnabled = stored.paymentsEnabled !== false;
    }
    settings.phonepe = mergePhonePe(stored);
    if (stored) {
      settings.apiMode = stored.apiMode || settings.apiMode;
      settings.apiBaseUrl = stored.apiBaseUrl || settings.apiBaseUrl;
    }
    return settings;
  }

  function getPhonePeSettings() {
    return getSettings().phonepe;
  }

  function saveSettings(partial) {
    var current = getSettings();
    var next = {
      businessName: partial.businessName !== undefined ? partial.businessName : current.businessName,
      supportNumber: partial.supportNumber !== undefined ? partial.supportNumber : current.supportNumber,
      supportEmail: partial.supportEmail !== undefined ? partial.supportEmail : current.supportEmail,
      paymentsEnabled: partial.paymentsEnabled !== undefined ? partial.paymentsEnabled : current.paymentsEnabled,
      phonepe: Object.assign({}, current.phonepe, partial.phonepe || {}),
      apiMode: partial.apiMode !== undefined ? partial.apiMode : current.apiMode,
      apiBaseUrl: partial.apiBaseUrl !== undefined ? partial.apiBaseUrl : current.apiBaseUrl
    };

    /* Allow flat phonepe field updates at top level for convenience */
    if (partial.merchantName !== undefined) next.phonepe.merchantName = partial.merchantName;
    if (partial.paymentLink !== undefined) next.phonepe.paymentLink = partial.paymentLink;
    if (partial.testPaymentLink !== undefined) next.phonepe.testPaymentLink = partial.testPaymentLink;
    if (partial.successUrl !== undefined) next.phonepe.successUrl = partial.successUrl;
    if (partial.failureUrl !== undefined) next.phonepe.failureUrl = partial.failureUrl;
    if (partial.testMode !== undefined) next.phonepe.environment = partial.testMode ? 'sandbox' : 'production';
    if (partial.environment !== undefined) next.phonepe.environment = partial.environment;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function resetSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
    return getSettings();
  }

  function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      var parsed = new URL(url.trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (e) {
      return false;
    }
  }

  function resolveUrl(pathOrUrl) {
    if (!pathOrUrl) return '';
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    try {
      return new URL(pathOrUrl, window.location.href).href;
    } catch (e) {
      return pathOrUrl;
    }
  }

  global.InstaHelpPaymentConfig = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULTS: DEFAULTS,
    getSettings: getSettings,
    getPhonePeSettings: getPhonePeSettings,
    saveSettings: saveSettings,
    resetSettings: resetSettings,
    isValidUrl: isValidUrl,
    resolveUrl: resolveUrl
  };
})(typeof window !== 'undefined' ? window : this);
