/**
 * InstaHelp API Client
 * All PhonePe operations go through the backend — never call PhonePe directly.
 */
(function (global) {
  'use strict';

  var TOKEN_KEY = 'instahelp_auth_token';
  var API_BASE_KEY = 'instahelp_api_base';

  function getApiBase() {
    var Config = global.InstaHelpPaymentConfig;
    if (Config && Config.resolveApiBaseUrl) {
      return Config.resolveApiBaseUrl();
    }
    var stored = localStorage.getItem(API_BASE_KEY);
    if (stored) return stored.replace(/\/$/, '');
    if (global.INSTAHELP_API_BASE) return String(global.INSTAHELP_API_BASE).replace(/\/$/, '');
    if (global.location && global.location.origin) {
      var host = global.location.hostname;
      var port = global.location.port;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return global.location.origin;
      }
      if (port === '4000' || port === '4001') {
        return global.location.origin;
      }
    }
    return 'http://localhost:4001';
  }

  function syncApiBase() {
    var base = getApiBase();
    localStorage.setItem(API_BASE_KEY, base);
    return base;
  }

  function setApiBase(url) {
    localStorage.setItem(API_BASE_KEY, url);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function isBackendEnabled() {
    var Config = global.InstaHelpPaymentConfig;
    if (!Config) return false;
    var s = Config.getSettings();
    return s.apiMode === 'backend' || (s.phonepe && s.phonepe.apiMode === 'pg_api');
  }

  function request(method, path, body, options) {
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    return fetch(getApiBase() + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
      mode: 'cors'
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || data.message || 'Request failed');
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function createPayment(orderData) {
    var idempotencyKey = 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    return request('POST', '/api/payments/create', {
      serviceName: orderData.serviceName,
      vendorName: orderData.vendorName,
      vendorId: orderData.vendorId,
      quantity: orderData.quantity || 1,
      price: orderData.price,
      discount: orderData.discount || 0,
      applyGst: orderData.applyGst !== false,
      idempotencyKey: orderData.idempotencyKey || idempotencyKey,
      ownerType: orderData.ownerType || 'ADMIN',
      provider: orderData.provider || 'PHONEPE'
    }, { idempotencyKey: orderData.idempotencyKey || idempotencyKey });
  }

  function getPaymentGateways() {
    return request('GET', '/api/payments/gateways');
  }

  function verifyRazorpayPayment(data) {
    return request('POST', '/api/payments/razorpay/verify', data);
  }

  function verifyPayment(params) {
    return request('POST', '/api/payments/verify', params || {});
  }

  function getPaymentStatus(orderId) {
    return request('GET', '/api/payments/status/' + encodeURIComponent(orderId));
  }

  function getOrder(orderId) {
    return request('GET', '/api/orders/' + encodeURIComponent(orderId));
  }

  function getUserOrders() {
    return request('GET', '/api/orders/user');
  }

  function getTransactions() {
    return request('GET', '/api/transactions');
  }

  function getProfile() {
    return request('GET', '/api/auth/profile');
  }

  function sendOtp(phone) {
    return request('POST', '/api/auth/send-otp', { phone: phone });
  }

  function verifyOtp(phone, otp, name, email) {
    return request('POST', '/api/auth/verify-otp', {
      phone: phone,
      otp: otp,
      name: name,
      email: email
    }).then(function (res) {
      if (res.data && res.data.token) setToken(res.data.token);
      return res;
    });
  }

  function getAdminPaymentSettings() {
    return request('GET', '/api/admin/payment-settings');
  }

  function updateAdminPaymentSettings(data) {
    return request('PUT', '/api/admin/payment-settings', data);
  }

  function healthCheck() {
    return fetch(getApiBase() + '/health').then(function (r) { return r.json(); });
  }

  global.InstaHelpAPI = {
    TOKEN_KEY: TOKEN_KEY,
    API_BASE_KEY: API_BASE_KEY,
    getApiBase: getApiBase,
    syncApiBase: syncApiBase,
    setApiBase: setApiBase,
    getToken: getToken,
    setToken: setToken,
    isBackendEnabled: isBackendEnabled,
    createPayment: createPayment,
    getPaymentGateways: getPaymentGateways,
    verifyRazorpayPayment: verifyRazorpayPayment,
    verifyPayment: verifyPayment,
    getPaymentStatus: getPaymentStatus,
    getOrder: getOrder,
    getUserOrders: getUserOrders,
    getTransactions: getTransactions,
    getProfile: getProfile,
    sendOtp: sendOtp,
    verifyOtp: verifyOtp,
    getAdminPaymentSettings: getAdminPaymentSettings,
    updateAdminPaymentSettings: updateAdminPaymentSettings,
    healthCheck: healthCheck
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      if (global.InstaHelpPaymentConfig) syncApiBase();
    });
  }
})(typeof window !== 'undefined' ? window : this);
