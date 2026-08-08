/**
 * InstaHelp Pay Portal - custom amount checkout (hotel-style)
 */
(function (global) {
  'use strict';

  var CONVENIENCE_FEE_RATE = 0.02;
  var GST_RATE = 0.18;

  function parseQuery() {
    var params = new URLSearchParams(global.location.search);
    return {
      amount: params.get('amount') || params.get('price') || '',
      service: params.get('service') || '',
      vendor: params.get('vendor') || '',
      name: params.get('name') || '',
      email: params.get('email') || '',
      phone: params.get('phone') || '',
      note: params.get('note') || params.get('ref') || '',
      auto: params.get('auto') === '1'
    };
  }

  function parseAmount(value) {
    var cleaned = String(value || '').replace(/[^\d.]/g, '');
    var num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  function formatINR(amount) {
    if (global.InstaHelpPayment && global.InstaHelpPayment.formatINR) {
      return global.InstaHelpPayment.formatINR(amount);
    }
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function calculateFees(baseAmount) {
    var amount = Math.max(0, baseAmount);
    var convenienceFee = Math.round(amount * CONVENIENCE_FEE_RATE);
    var gst = Math.round(convenienceFee * GST_RATE);
    return {
      amount: amount,
      convenienceFee: convenienceFee,
      gst: gst,
      total: amount + convenienceFee + gst
    };
  }

  function buildOrder(formData, settings) {
    var baseAmount = parseAmount(formData.amount);
    var serviceName = (formData.note || formData.service || 'Online Payment').trim();
    var guestName = (formData.name || '').trim();
    if (guestName) {
      serviceName = serviceName + ' - ' + guestName;
    }
    if (serviceName.length > 200) {
      serviceName = serviceName.slice(0, 197) + '...';
    }

    return {
      serviceName: serviceName || 'Online Payment',
      vendorName: (formData.vendor || settings.businessName || 'InstaHelp').trim(),
      quantity: 1,
      price: baseAmount,
      discount: 0,
      applyGst: true,
      customerName: guestName,
      customerEmail: (formData.email || '').trim(),
      customerPhone: (formData.phone || '').trim()
    };
  }

  function validateForm(formData) {
    var errors = [];
    var amount = parseAmount(formData.amount);

    if (!amount || amount <= 0) {
      errors.push('Please enter a valid payment amount.');
    } else if (amount < 1) {
      errors.push('Minimum payment amount is ₹1.');
    } else if (amount > 500000) {
      errors.push('Maximum payment amount is ₹5,00,000.');
    }

    var email = (formData.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address.');
    }

    var phone = (formData.phone || '').replace(/\D/g, '');
    if (phone && phone.length < 10) {
      errors.push('Please enter a valid mobile number.');
    }

    return errors;
  }

  function readForm(root) {
    return {
      amount: root.querySelector('#payAmount').value,
      name: root.querySelector('#payName').value,
      email: root.querySelector('#payEmail').value,
      phone: root.querySelector('#payPhone').value,
      note: root.querySelector('#payNote').value,
      service: root.dataset.prefillService || '',
      vendor: root.dataset.prefillVendor || ''
    };
  }

  function updateFeesUI(root, fees) {
    root.querySelector('[data-fee="amount"]').textContent = formatINR(fees.amount);
    root.querySelector('[data-fee="convenience"]').textContent = formatINR(fees.convenienceFee);
    root.querySelector('[data-fee="gst"]').textContent = formatINR(fees.gst);
    var totalText = formatINR(fees.total);
    root.querySelector('[data-fee="total"]').textContent = totalText;
    root.querySelector('#submitBtn').disabled = fees.amount <= 0;

    ['submitAmountPreview', 'mobileTotalPreview'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = totalText;
    });
    var mobileBtn = document.getElementById('mobileSubmitBtn');
    if (mobileBtn) mobileBtn.disabled = fees.amount <= 0;

    document.dispatchEvent(new CustomEvent('feeUpdated', { detail: fees }));
  }

  function showAlert(el, message, type) {
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      el.className = 'portal-alert';
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.className = 'portal-alert show ' + (type || 'error');
  }

  function showLoading(show) {
    var overlay = document.getElementById('payLoadingOverlay');
    if (overlay) overlay.classList.toggle('show', !!show);
  }

  function brandInitials(name) {
    var parts = String(name || 'IH').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'IH';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  function bindPayPortal() {
    var form = document.getElementById('payPortalForm');
    if (!form) return;

    var Config = global.InstaHelpPaymentConfig;
    var Payment = global.InstaHelpPayment;
    var API = global.InstaHelpAPI;
    if (!Config || !Payment) return;

    var settings = Config.getSettings();
    var query = parseQuery();
    var alertEl = document.getElementById('payFormAlert');
    var selectedGateway = 'PHONEPE';
    var availableGateways = ['PHONEPE', 'RAZORPAY'];
    var gatewayButtons = form.querySelectorAll('.portal-gateway-pick');

    if (query.service) form.dataset.prefillService = query.service;
    if (query.vendor) form.dataset.prefillVendor = query.vendor;

    var businessName = settings.businessName || 'InstaHelp';
    setText('businessName', businessName);
    setText('sidebarBusinessName', businessName);
    setText('footerBusinessName', businessName);
    document.title = 'Pay Online - ' + businessName;

    var mark = document.getElementById('brandMark');
    if (mark) mark.textContent = brandInitials(businessName);

    var sidebarPhone = document.getElementById('sidebarSupportPhone');
    if (sidebarPhone && settings.supportNumber) {
      sidebarPhone.textContent = settings.supportNumber;
    }

    var footerContact = document.getElementById('footerContact');
    if (footerContact) {
      var parts = [];
      if (settings.supportNumber) parts.push(settings.supportNumber);
      if (settings.supportEmail) parts.push(settings.supportEmail);
      footerContact.textContent = parts.join(' · ');
    }

    var payHelpPhone = document.getElementById('payHelpPhone');
    if (payHelpPhone && settings.supportNumber) {
      var tel = String(settings.supportNumber).replace(/\s/g, '');
      payHelpPhone.href = 'tel:' + tel;
      payHelpPhone.textContent = settings.supportNumber;
    }

    if (query.amount) document.getElementById('payAmount').value = query.amount;
    if (query.name) document.getElementById('payName').value = query.name;
    if (query.email) document.getElementById('payEmail').value = query.email;
    if (query.phone) document.getElementById('payPhone').value = query.phone;
    if (query.note) document.getElementById('payNote').value = query.note;

    var pp = settings.phonepe || {};
    if (pp.environment === 'sandbox') {
      var banner = document.getElementById('testModeBanner');
      if (banner) {
        banner.hidden = false;
        banner.textContent = 'Test mode - payments are for demonstration only';
      }
    }

    function refreshFees() {
      var data = readForm(form);
      updateFeesUI(form, calculateFees(parseAmount(data.amount)));
    }

    form.addEventListener('input', refreshFees);
    refreshFees();

    function refreshGatewayUI() {
      gatewayButtons.forEach(function (btn) {
        var gw = btn.getAttribute('data-gateway');
        var enabled = availableGateways.indexOf(gw) !== -1;
        var selected = gw === selectedGateway;
        btn.disabled = !enabled;
        btn.hidden = !enabled;
        btn.classList.toggle('is-selected', selected);
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });

      if (availableGateways.indexOf(selectedGateway) === -1) {
        selectedGateway = availableGateways[0] || 'PHONEPE';
        refreshGatewayUI();
      }
    }

    gatewayButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        selectedGateway = btn.getAttribute('data-gateway');
        refreshGatewayUI();
      });
    });

    if (API && API.getPaymentGateways) {
      API.getPaymentGateways().then(function (res) {
        if (res.data && res.data.gateways && res.data.gateways.length) {
          availableGateways = res.data.gateways.map(function (g) { return g.id; });
          refreshGatewayUI();
        }
      }).catch(function () {
        refreshGatewayUI();
      });
    } else {
      refreshGatewayUI();
    }

    if (API && API.warmupBackend) {
      API.warmupBackend();
    }

    function submitPayment() {
      if (Payment.isPayLocked()) {
        showAlert(alertEl, 'Payment already in progress. Please wait.');
        return;
      }

      var formData = readForm(form);
      var errors = validateForm(formData);
      if (errors.length) {
        showAlert(alertEl, errors.join(' '));
        return;
      }

      if (!settings.paymentsEnabled || !pp.enabled) {
        showAlert(alertEl, 'Payments are temporarily unavailable. Please contact support.');
        return;
      }

      if (availableGateways.indexOf(selectedGateway) === -1) {
        showAlert(alertEl, 'Selected payment method is not available. Please choose another option.');
        return;
      }

      if (selectedGateway === 'RAZORPAY' && !Payment.useBackendApi()) {
        showAlert(alertEl, 'Razorpay requires the InstaHelp payment backend. Please choose PhonePe or contact support.');
        return;
      }

      showAlert(alertEl, '');
      showLoading(true);

      var loadingTitle = document.querySelector('#payLoadingOverlay .portal-loading-title');
      if (loadingTitle) {
        loadingTitle.textContent = selectedGateway === 'RAZORPAY'
          ? 'Opening Razorpay checkout'
          : 'Opening secure checkout';
      }
      var slowTimer = setTimeout(function () {
        if (loadingTitle) {
          loadingTitle.textContent = 'Starting secure checkout - this may take a few seconds…';
        }
      }, 2500);

      var order = buildOrder(formData, settings);
      order.provider = selectedGateway;
      Payment.setPendingOrder(order);

      var result = Payment.processPayment(order, {
        redirectDelay: 0,
        provider: selectedGateway
      });

      function onResult(res) {
        clearTimeout(slowTimer);
        if (res && res.ok && res.provider === 'RAZORPAY') {
          showLoading(false);
          return;
        }
        if (!res || !res.ok) {
          showLoading(false);
          showAlert(
            alertEl,
            (res && res.error) || (res && res.errors && res.errors.join(' ')) || 'Could not start payment. Please try again.'
          );
          Payment.clearPayLock();
        }
      }

      if (result && typeof result.then === 'function') {
        result.then(onResult).catch(function (err) {
          clearTimeout(slowTimer);
          showLoading(false);
          showAlert(alertEl, (err && err.message) || 'Payment could not be initiated.');
          Payment.clearPayLock();
        });
      } else {
        onResult(result);
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitPayment();
    });

    if (query.auto && parseAmount(query.amount) > 0) {
      submitPayment();
    }
  }

  global.InstaHelpPayForm = {
    parseAmount: parseAmount,
    calculateFees: calculateFees,
    formatINR: formatINR,
    buildOrder: buildOrder,
    validateForm: validateForm
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', bindPayPortal);
  }
})(typeof window !== 'undefined' ? window : this);
