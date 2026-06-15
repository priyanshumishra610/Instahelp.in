/**
 * Production API bootstrap — load before payment-config.js and api.js.
 * Fixes Netlify/cached JS pointing at localhost or same-origin instead of Render.
 */
(function (global) {
  'use strict';

  var PRODUCTION_API = 'https://instahelp-in.onrender.com';

  function isProductionSite(host) {
    return host === 'instahelp.in' || host === 'www.instahelp.in' || host === 'instahelp-in.onrender.com';
  }

  function isLocalApiUrl(url) {
    return /localhost|127\.0\.0\.1/.test(url || '');
  }

  if (!global.location) return;

  var host = global.location.hostname;
  if (!isProductionSite(host)) return;

  var apiBase = host === 'instahelp-in.onrender.com'
    ? global.location.origin.replace(/\/$/, '')
    : PRODUCTION_API;

  global.INSTAHELP_API_BASE = apiBase;

  try {
    global.localStorage.setItem('instahelp_api_base', apiBase);

    var raw = global.localStorage.getItem('paymentSettings');
    if (raw) {
      var settings = JSON.parse(raw);
      if (!settings.apiBaseUrl || isLocalApiUrl(settings.apiBaseUrl)) {
        settings.apiBaseUrl = apiBase;
        settings.apiMode = settings.apiMode || 'backend';
        global.localStorage.setItem('paymentSettings', JSON.stringify(settings));
      }
    }
  } catch (e) {
    /* ignore storage errors */
  }
})(typeof window !== 'undefined' ? window : this);
