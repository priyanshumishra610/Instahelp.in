/**
 * InstaHelp Payment Flow — frontend-only PhonePe payment link redirect
 */
(function (global) {
  'use strict';

  var PENDING_ORDER_KEY = 'instahelp_pending_order';
  var PENDING_TX_KEY = 'instahelp_pending_tx';
  var PAY_LOCK_KEY = 'instahelp_pay_lock';

  var CONVENIENCE_FEE_RATE = 0.02; /* 2% */
  var GST_RATE = 0.18; /* 18% on convenience fee */

  function formatINR(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function parseOrderFromQuery() {
    var params = new URLSearchParams(window.location.search);
    if (!params.has('service') && !params.has('price') && !params.has('amount')) return null;
    return {
      serviceName: params.get('service') || 'Service Request',
      vendorName: params.get('vendor') || 'InstaHelp Verified Provider',
      quantity: Math.max(1, parseInt(params.get('qty') || params.get('quantity') || '1', 10)),
      price: parseFloat(params.get('price') || params.get('amount') || '0'),
      discount: parseFloat(params.get('discount') || '0'),
      applyGst: params.get('gst') !== '0'
    };
  }

  function getPendingOrder() {
    try {
      var raw = sessionStorage.getItem(PENDING_ORDER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setPendingOrder(order) {
    sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(order));
  }

  function getDefaultOrder() {
    return {
      serviceName: 'Home Deep Cleaning',
      vendorName: 'SparkClean Services',
      quantity: 1,
      price: 1499,
      discount: 100,
      applyGst: true
    };
  }

  function resolveOrderInput(input) {
    if (input && input.serviceName) return input;
    var fromQuery = parseOrderFromQuery();
    if (fromQuery) return fromQuery;
    var pending = getPendingOrder();
    if (pending) return pending;
    return getDefaultOrder();
  }

  function calculateTotals(order) {
    var subtotal = (order.price || 0) * (order.quantity || 1);
    var discount = Math.min(order.discount || 0, subtotal);
    var afterDiscount = Math.max(0, subtotal - discount);
    var convenienceFee = Math.round(afterDiscount * CONVENIENCE_FEE_RATE);
    var gst = order.applyGst !== false ? Math.round(convenienceFee * GST_RATE) : 0;
    var grandTotal = afterDiscount + convenienceFee + gst;
    return {
      subtotal: subtotal,
      discount: discount,
      convenienceFee: convenienceFee,
      gst: gst,
      grandTotal: grandTotal
    };
  }

  function validateOrder(order, totals) {
    var errors = [];
    if (!order.serviceName || !order.serviceName.trim()) errors.push('Service name is required.');
    if (!order.vendorName || !order.vendorName.trim()) errors.push('Vendor name is required.');
    if (!order.quantity || order.quantity < 1) errors.push('Quantity must be at least 1.');
    if (!order.price || order.price <= 0) errors.push('Price must be greater than zero.');
    if (!totals.grandTotal || totals.grandTotal <= 0) errors.push('Grand total must be greater than zero.');
    return errors;
  }

  function isPayLocked() {
    var lock = sessionStorage.getItem(PAY_LOCK_KEY);
    if (!lock) return false;
    var ts = parseInt(lock, 10);
    return Date.now() - ts < 15000;
  }

  function setPayLock() {
    sessionStorage.setItem(PAY_LOCK_KEY, String(Date.now()));
  }

  function clearPayLock() {
    sessionStorage.removeItem(PAY_LOCK_KEY);
  }

  /**
   * Initiate checkout — PhonePe SDK (backend) redirects straight to PhonePe checkout.
   * Legacy payment-link mode still uses pay.html as a redirect shim.
   */
  function initiateCheckout(orderData) {
    orderData = orderData || {};
    setPendingOrder(orderData);

    if (useBackendApi()) {
      return processPaymentViaBackend(orderData, { redirectDelay: 400 });
    }

    var qs = new URLSearchParams({
      service: orderData.serviceName || '',
      vendor: orderData.vendorName || '',
      qty: String(orderData.quantity || 1),
      price: String(orderData.price || 0),
      discount: String(orderData.discount || 0),
      gst: orderData.applyGst === false ? '0' : '1'
    });
    window.location.href = 'pay.html?' + qs.toString();
  }

  /** Alias — start PhonePe SDK checkout without custom InstaHelp pay UI */
  function redirectToPhonePeCheckout(orderData) {
    return initiateCheckout(orderData);
  }

  function useBackendApi() {
    var API = global.InstaHelpAPI;
    var Config = global.InstaHelpPaymentConfig;
    if (!API || !Config) return false;
    var s = Config.getSettings();
    return s.apiMode === 'backend' || (s.phonepe && s.phonepe.apiMode === 'pg_api');
  }

  function processPaymentViaBackend(order, options) {
    options = options || {};
    var API = global.InstaHelpAPI;
    var Config = global.InstaHelpPaymentConfig;
    var resolved = resolveOrderInput(order);
    var totals = calculateTotals(resolved);
    var errors = validateOrder(resolved, totals);

    if (errors.length) return { ok: false, errors: errors };

    if (API && Config && Config.resolveApiBaseUrl) {
      API.setApiBase(Config.resolveApiBaseUrl());
    } else if (Config && Config.getSettings().apiBaseUrl) {
      API.setApiBase(Config.getSettings().apiBaseUrl);
    }

    setPayLock();
    setPendingOrder(resolved);

    var provider = (order && order.provider) || options.provider || 'PHONEPE';

    return API.createPayment({
      serviceName: resolved.serviceName,
      vendorName: resolved.vendorName,
      quantity: resolved.quantity,
      price: resolved.price,
      discount: resolved.discount,
      applyGst: resolved.applyGst,
      provider: provider
    }).then(function (res) {
      var data = res.data;

      if (options.onBeforeRedirect) {
        options.onBeforeRedirect({ order: data, totals: totals });
      }

      if (data.provider === 'RAZORPAY' && global.InstaHelpRazorpay) {
        return global.InstaHelpRazorpay.openCheckout(data, {
          onDismiss: function () {
            clearPayLock();
          },
          onFailure: function (err) {
            clearPayLock();
            throw err;
          }
        }).then(function () {
          return { ok: true, order: data, totals: totals, provider: 'RAZORPAY' };
        });
      }

      sessionStorage.setItem(PENDING_TX_KEY, JSON.stringify({
        transactionId: data.transactionId,
        orderId: data.orderNumber,
        backendOrderId: data.orderId,
        amount: data.amount,
        serviceName: resolved.serviceName,
        vendorName: resolved.vendorName,
        date: new Date().toISOString()
      }));

      window.location.href = data.redirectUrl;

      return {
        ok: true,
        order: data,
        totals: totals,
        redirectUrl: data.redirectUrl,
        environment: data.environment,
        provider: 'PHONEPE',
        testMode: data.environment === 'sandbox'
      };
    }).catch(function (err) {
      clearPayLock();
      return { ok: false, error: err.message || 'Payment could not be initiated.' };
    });
  }

  /**
   * Process payment — validate, create records, redirect to PhonePe (link or backend API)
   */
  function processPayment(order, options) {
    options = options || {};
    var Config = global.InstaHelpPaymentConfig;
    var Orders = global.InstaHelpOrders;
    var Transactions = global.InstaHelpTransactions;

    if (!Config || !Orders || !Transactions) {
      return { ok: false, error: 'Payment modules not loaded.' };
    }

    if (isPayLocked()) {
      return { ok: false, error: 'Payment already in progress. Please wait.' };
    }

    var settings = Config.getSettings();
    var resolved = resolveOrderInput(order);
    var totals = calculateTotals(resolved);
    var errors = validateOrder(resolved, totals);

    if (errors.length) {
      return { ok: false, errors: errors };
    }

    if (!settings.paymentsEnabled) {
      return { ok: false, error: 'Online payments are temporarily unavailable. Please contact support.' };
    }

    if (useBackendApi()) {
      return processPaymentViaBackend(order, options);
    }

    var PhonePe = global.InstaHelpPhonePe;
    if (!PhonePe) {
      return { ok: false, error: 'PhonePe module not loaded.' };
    }

    var ppStatus = PhonePe.getStatus();
    if (!ppStatus.configured) {
      return { ok: false, error: ppStatus.message || 'PhonePe is not configured. Contact InstaHelp support.' };
    }

    setPayLock();

    var orderId = Orders.generateOrderId();
    var createdOrder = Orders.createOrder({
      orderId: orderId,
      serviceName: resolved.serviceName,
      vendorName: resolved.vendorName,
      quantity: resolved.quantity,
      amount: totals.grandTotal,
      status: 'pending'
    });

    var tx = Transactions.createTransaction({
      orderId: orderId,
      amount: totals.grandTotal,
      status: 'pending',
      vendor: resolved.vendorName,
      service: resolved.serviceName,
      method: 'PhonePe'
    });

    sessionStorage.setItem(PENDING_TX_KEY, JSON.stringify({
      transactionId: tx.transactionId,
      orderId: orderId,
      amount: totals.grandTotal,
      serviceName: resolved.serviceName,
      vendorName: resolved.vendorName,
      date: tx.date
    }));

    setPendingOrder(resolved);

    if (options.onBeforeRedirect) {
      options.onBeforeRedirect({ order: createdOrder, transaction: tx, totals: totals });
    }

    var ppResult = PhonePe.startPayment({
      orderId: orderId,
      amount: totals.grandTotal,
      serviceName: resolved.serviceName,
      vendorName: resolved.vendorName,
      transactionId: tx.transactionId
    }, {
      redirectDelay: options.redirectDelay || 1200,
      skipRedirect: true
    });

    if (!ppResult.ok) {
      clearPayLock();
      return { ok: false, error: ppResult.error };
    }

    setTimeout(function () {
      window.location.href = ppResult.redirectUrl;
    }, options.redirectDelay || 1200);

    return {
      ok: true,
      order: createdOrder,
      transaction: tx,
      totals: totals,
      redirectUrl: ppResult.redirectUrl,
      environment: ppResult.environment,
      testMode: ppResult.environment === 'sandbox'
    };
  }

  function getPendingTransaction() {
    try {
      var raw = sessionStorage.getItem(PENDING_TX_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function markPaymentSuccess(extra) {
    var pending = getPendingTransaction();
    if (!pending) return null;
    var Orders = global.InstaHelpOrders;
    var Transactions = global.InstaHelpTransactions;
    if (Orders) Orders.updateOrderStatus(pending.orderId, 'success');
    if (Transactions) Transactions.updateTransactionStatus(pending.transactionId, 'success');
    sessionStorage.removeItem(PENDING_TX_KEY);
    clearPayLock();
    return Object.assign({}, pending, extra || {});
  }

  function markPaymentFailed(reason) {
    var pending = getPendingTransaction();
    if (!pending) return null;
    var Orders = global.InstaHelpOrders;
    var Transactions = global.InstaHelpTransactions;
    if (Orders) Orders.updateOrderStatus(pending.orderId, 'failed');
    if (Transactions) Transactions.updateTransactionStatus(pending.transactionId, 'failed');
    var result = Object.assign({}, pending, { failureReason: reason || 'unknown' });
    sessionStorage.setItem('instahelp_last_failed', JSON.stringify(result));
    sessionStorage.removeItem(PENDING_TX_KEY);
    clearPayLock();
    return result;
  }

  global.InstaHelpPayment = {
    PENDING_ORDER_KEY: PENDING_ORDER_KEY,
    formatINR: formatINR,
    resolveOrderInput: resolveOrderInput,
    calculateTotals: calculateTotals,
    validateOrder: validateOrder,
    initiateCheckout: initiateCheckout,
    redirectToPhonePeCheckout: redirectToPhonePeCheckout,
    useBackendApi: useBackendApi,
    processPayment: processPayment,
    getPendingTransaction: getPendingTransaction,
    markPaymentSuccess: markPaymentSuccess,
    markPaymentFailed: markPaymentFailed,
    isPayLocked: isPayLocked,
    clearPayLock: clearPayLock,
    getDefaultOrder: getDefaultOrder
  };
})(typeof window !== 'undefined' ? window : this);
