/**
 * InstaHelp Razorpay Checkout - official Razorpay Checkout.js SDK
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */
(function (global) {
  'use strict';

  var SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
  var scriptPromise = null;

  function loadRazorpayScript() {
    if (global.Razorpay) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load Razorpay Checkout SDK')); };
      document.head.appendChild(s);
    });

    return scriptPromise;
  }

  function openCheckout(paymentData, callbacks) {
    callbacks = callbacks || {};

    return loadRazorpayScript().then(function () {
      var rz = paymentData.razorpay || paymentData;
      var API = global.InstaHelpAPI;
      var settings = global.InstaHelpPaymentConfig
        ? global.InstaHelpPaymentConfig.getSettings()
        : {};

      var options = {
        key: rz.keyId,
        amount: rz.amount,
        currency: rz.currency || 'INR',
        name: rz.name || settings.businessName || 'InstaHelp',
        description: rz.description || paymentData.serviceName || 'InstaHelp Plan',
        order_id: rz.orderId,
        handler: function (response) {
          if (!API) {
            callbacks.onFailure && callbacks.onFailure(new Error('API client not loaded'));
            return;
          }

          API.verifyRazorpayPayment({
            orderId: paymentData.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          }).then(function (res) {
            var data = res.data;
            sessionStorage.setItem('instahelp_pending_tx', JSON.stringify({
              transactionId: paymentData.transactionId,
              orderId: paymentData.orderNumber,
              backendOrderId: paymentData.orderId,
              amount: paymentData.amount,
              serviceName: rz.description,
              date: new Date().toISOString()
            }));

            var url = new URL(data.successUrl || 'payment-success.html', window.location.origin);
            url.searchParams.set('orderId', paymentData.orderNumber);
            url.searchParams.set('txn', paymentData.transactionId);
            url.searchParams.set('amount', String(paymentData.amount));

            if (callbacks.onSuccess) callbacks.onSuccess(data);
            window.location.href = url.toString();
          }).catch(function (err) {
            if (callbacks.onFailure) callbacks.onFailure(err);
          });
        },
        modal: {
          ondismiss: function () {
            if (callbacks.onDismiss) callbacks.onDismiss();
          }
        },
        theme: { color: '#141413' }
      };

      var rzp = new global.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        if (callbacks.onFailure) {
          callbacks.onFailure(new Error(
            (resp.error && resp.error.description) || 'Payment failed'
          ));
        }
      });
      rzp.open();
      return rzp;
    });
  }

  global.InstaHelpRazorpay = {
    loadRazorpayScript: loadRazorpayScript,
    openCheckout: openCheckout
  };

  if (typeof global.location !== 'undefined') {
    var path = (global.location.pathname || '').toLowerCase();
    if (/\/(pay|plans|experiences)(\.html)?$/.test(path) || path.endsWith('/pay') || path.endsWith('/plans') || path.endsWith('/experiences')) {
      loadRazorpayScript().catch(function () {});
    }
  }
})(typeof window !== 'undefined' ? window : this);
