/**
 * InstaHelp PhonePe Gateway Module
 * ─────────────────────────────────
 * Central module for all PhonePe payment operations.
 * Currently: Payment Link redirect (frontend-only, no backend).
 * Future: Swap initiatePayment() body to call your server API
 *         which handles checksum, /pg/v1/pay, and callbacks.
 */
(function (global) {
  'use strict';

  /* ── PhonePe constants ── */
  var PHONEPE = {
    NAME: 'PhonePe',
    BRAND_COLOR: '#5f259f',
    ALLOWED_HOSTS: [
      'phonepe.com',
      'www.phonepe.com',
      'mercury.phonepe.com',
      'mercury-uat.phonepe.com',
      'pay.phonepe.com',
      'pay-uat.phonepe.com'
    ],
    /* Future API endpoints — used when backend is added */
    API: {
      PRODUCTION: 'https://api.phonepe.com/apis/hermes',
      SANDBOX: 'https://api-preprod.phonepe.com/apis/hermes'
    },
    DOCS: 'https://developer.phonepe.com'
  };

  function getConfig() {
    var Config = global.InstaHelpPaymentConfig;
    if (!Config) return null;
    return Config.getPhonePeSettings();
  }

  function isAllowedHost(hostname) {
    if (!hostname) return false;
    var host = hostname.toLowerCase();
    return PHONEPE.ALLOWED_HOSTS.some(function (allowed) {
      return host === allowed || host.endsWith('.' + allowed);
    });
  }

  function isValidPhonePeLink(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      var parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
      return isAllowedHost(parsed.hostname);
    } catch (e) {
      return false;
    }
  }

  function isConfigured() {
    var cfg = getConfig();
    if (!cfg) return false;
    var link = getActivePaymentLink(cfg);
    return cfg.enabled !== false && !!link && isValidPhonePeLink(link);
  }

  function getEnvironment(cfg) {
    cfg = cfg || getConfig();
    return (cfg && cfg.environment === 'sandbox') ? 'sandbox' : 'production';
  }

  function getActivePaymentLink(cfg) {
    cfg = cfg || getConfig();
    if (!cfg) return '';
    if (getEnvironment(cfg) === 'sandbox') {
      return (cfg.testPaymentLink || cfg.paymentLink || '').trim();
    }
    return (cfg.paymentLink || '').trim();
  }

  /**
   * Build redirect URL with order metadata appended as query params.
   * PhonePe Payment Links may ignore these; useful for tracking & future API migration.
   */
  function buildPaymentUrl(orderMeta) {
    var cfg = getConfig();
    var baseLink = getActivePaymentLink(cfg);
    if (!baseLink) return null;

    if (!isValidPhonePeLink(baseLink)) return null;

    orderMeta = orderMeta || {};
    try {
      var url = new URL(baseLink);
      if (orderMeta.orderId)     url.searchParams.set('orderId', orderMeta.orderId);
      if (orderMeta.amount)      url.searchParams.set('amount', String(Math.round(orderMeta.amount * 100)));
      if (orderMeta.serviceName) url.searchParams.set('note', orderMeta.serviceName.substring(0, 80));
      return url.toString();
    } catch (e) {
      return baseLink;
    }
  }

  function getRedirectUrls(cfg) {
    cfg = cfg || getConfig();
    var Config = global.InstaHelpPaymentConfig;
    var resolve = Config ? Config.resolveUrl : function (u) { return u; };
    return {
      success: resolve((cfg && cfg.successUrl) || 'payment-success.html'),
      failure: resolve((cfg && cfg.failureUrl) || 'payment-failed.html')
    };
  }

  function isSdkMode() {
    var Config = global.InstaHelpPaymentConfig;
    if (!Config) return false;
    var s = Config.getSettings();
    return s.apiMode === 'backend' || (s.phonepe && s.phonepe.apiMode === 'pg_api');
  }

  function getStatus() {
    var cfg = getConfig();
    var env = getEnvironment(cfg);
    var link = getActivePaymentLink(cfg);
    var valid = isValidPhonePeLink(link);
    var enabled = cfg && cfg.enabled !== false;
    var sdk = isSdkMode();

    var state = 'not_configured';
    if (sdk && enabled) state = 'ready';
    else if (enabled && valid) state = 'ready';
    else if (enabled && link && !valid) state = 'invalid_link';
    else if (!enabled) state = 'disabled';

    return {
      state: state,
      environment: env,
      configured: (sdk && enabled) || (valid && enabled),
      integrationMode: sdk ? 'phonepe_sdk' : 'payment_link',
      merchantName: (cfg && cfg.merchantName) || '',
      merchantId: (cfg && cfg.merchantId) || '',
      paymentLink: link,
      isTestMode: env === 'sandbox',
      redirectUrls: getRedirectUrls(cfg),
      message: statusMessage(state, env)
    };
  }

  function statusMessage(state, env) {
    switch (state) {
      case 'ready':
        if (isSdkMode()) {
          return env === 'sandbox'
            ? 'PhonePe SDK Sandbox checkout is ready.'
            : 'PhonePe SDK Live checkout is ready.';
        }
        return env === 'sandbox'
          ? 'PhonePe Sandbox is configured and ready.'
          : 'PhonePe Live payments are configured and ready.';
      case 'invalid_link':
        return 'Payment link must be a valid PhonePe URL (phonepe.com).';
      case 'disabled':
        return 'PhonePe payments are disabled. Enable in admin settings.';
      default:
        return 'Add your PhonePe Payment Link in admin to get started.';
    }
  }

  /**
   * Initialize PhonePe — validate config, return status.
   * Call on admin load and checkout page load.
   */
  function initPhonePe() {
    var status = getStatus();
    if (global.console && global.console.info) {
      console.info('[InstaHelp PhonePe]', status.message);
    }
    return status;
  }

  /**
   * Start payment — main entry point (like an API call).
   * Returns { ok, redirectUrl, error, status }
   */
  function startPayment(orderMeta, options) {
    options = options || {};
    var status = getStatus();

    if (status.state === 'disabled') {
      return { ok: false, error: 'PhonePe payments are currently disabled.', status: status };
    }
    if (status.state === 'not_configured' || status.state === 'invalid_link') {
      return { ok: false, error: status.message, status: status };
    }

    var redirectUrl = buildPaymentUrl(orderMeta);
    if (!redirectUrl) {
      return { ok: false, error: 'Could not build PhonePe payment URL.', status: status };
    }

    if (options.onRedirect) {
      options.onRedirect(redirectUrl, orderMeta);
    } else if (!options.skipRedirect) {
      var delay = options.redirectDelay ?? 0;
      if (delay > 0) {
        setTimeout(function () {
          global.location.href = redirectUrl;
        }, delay);
      } else {
        global.location.href = redirectUrl;
      }
    }

    return {
      ok: true,
      redirectUrl: redirectUrl,
      environment: status.environment,
      merchantName: status.merchantName,
      status: status
    };
  }

  /**
   * Future API stub — when backend exists, replace body with fetch() to your server.
   * Server should call PhonePe /pg/v1/pay and return redirectUrl.
   */
  function initiatePaymentAPI(payload) {
    var API = global.InstaHelpAPI;
    if (!API) {
      return {
        ok: false,
        error: 'Backend API client not loaded. Include js/api.js.',
        payload: payload
      };
    }
    return API.createPayment(payload).then(function (res) {
      return { ok: true, data: res.data, redirectUrl: res.data.redirectUrl };
    }).catch(function (err) {
      return { ok: false, error: err.message, payload: payload };
    });
  }

  global.InstaHelpPhonePe = {
    PHONEPE: PHONEPE,
    initPhonePe: initPhonePe,
    getStatus: getStatus,
    isConfigured: isConfigured,
    isSdkMode: isSdkMode,
    isValidPhonePeLink: isValidPhonePeLink,
    getActivePaymentLink: getActivePaymentLink,
    getEnvironment: getEnvironment,
    buildPaymentUrl: buildPaymentUrl,
    getRedirectUrls: getRedirectUrls,
    startPayment: startPayment,
    initiatePaymentAPI: initiatePaymentAPI
  };
})(typeof window !== 'undefined' ? window : this);
