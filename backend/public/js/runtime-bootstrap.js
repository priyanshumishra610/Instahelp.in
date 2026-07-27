/**
 * Production API bootstrap — load before payment-config.js and api.js.
 * Netlify frontend → same-origin /api/* (proxied in netlify.toml to Render).
 */
(function (global) {
  'use strict';

  /** Primary backend — change if you use Railway instead of Render */
  var BACKEND_API = 'https://instahelp-in.onrender.com';

  function hostname() {
    return global.location && global.location.hostname;
  }

  function siteOrigin() {
    return global.location && global.location.origin.replace(/\/$/, '');
  }

  function isLocalHost(host) {
    return host === 'localhost' || host === '127.0.0.1';
  }

  function isNetlifyHost(host) {
    return /\.netlify\.(app|live)$/i.test(host || '');
  }

  function usesNetlifyApiProxy(host) {
    return (
      isNetlifyHost(host) ||
      host === 'instahelp.in' ||
      host === 'www.instahelp.in'
    );
  }

  function resolveApiBase() {
    var host = hostname();
    if (!host) return BACKEND_API;

    if (isLocalHost(host)) {
      var port = global.location.port;
      if (port === '4000' || port === '4001') return siteOrigin();
      return 'http://localhost:4000';
    }

    if (host === 'instahelp-in.onrender.com') return siteOrigin();

    if (usesNetlifyApiProxy(host)) return siteOrigin();

    return BACKEND_API;
  }

  if (!global.location) return;

  var apiBase = resolveApiBase();
  global.INSTAHELP_API_BASE = apiBase;

  function isPaymentPage() {
    var path = (global.location.pathname || '').toLowerCase();
    return /\/(pay|plans)(\.html)?$/.test(path) || path.endsWith('/pay') || path.endsWith('/plans');
  }

  function warmupBackend() {
    if (!apiBase) return;
    var url = apiBase + '/health/live';
    if (typeof global.fetch === 'function') {
      global.fetch(url, { mode: 'cors', credentials: 'omit', keepalive: true }).catch(function () {});
    }
  }

  if (isPaymentPage()) {
    warmupBackend();
  }

  try {
    global.localStorage.setItem('instahelp_api_base', apiBase);

    var raw = global.localStorage.getItem('paymentSettings');
    if (raw) {
      var settings = JSON.parse(raw);
      if (!settings.apiBaseUrl || /localhost|127\.0\.0\.1/.test(settings.apiBaseUrl || '')) {
        settings.apiBaseUrl = apiBase;
        settings.apiMode = settings.apiMode || 'backend';
        global.localStorage.setItem('paymentSettings', JSON.stringify(settings));
      }
    }
  } catch (e) {
    /* ignore storage errors */
  }
})(typeof window !== 'undefined' ? window : this);
