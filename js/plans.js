/**
 * InstaHelp Plans - fixed pricing, no random amounts
 */
(function (global) {
  'use strict';

  var PLANS = {
    individual: {
      free: {
        id: 'free',
        name: 'Free',
        tagline: 'Discover local services',
        price: 0,
        billing: 'forever',
        serviceName: 'InstaHelp Free',
        features: [
          'Browse verified local providers',
          'WhatsApp quick help',
          'Service discovery in your city',
          'Basic order tracking',
          'Community support'
        ],
        cta: 'Get started free',
        ctaType: 'link',
        href: '/'
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        tagline: 'Priority booking & support',
        monthlyPrice: 99,
        serviceName: 'InstaHelp Pro Membership',
        vendorName: 'InstaHelp',
        features: [
          'Everything in Free',
          'Priority provider matching',
          'Faster response times',
          'Dedicated support line',
          'Exclusive member discounts',
          'Payment protection on bookings'
        ],
        cta: 'Get Pro plan',
        ctaType: 'pay'
      },
      max: {
        id: 'max',
        name: 'Max',
        tagline: 'For power users & families',
        monthlyPrice: 499,
        serviceName: 'InstaHelp Max Membership',
        vendorName: 'InstaHelp',
        features: [
          'Everything in Pro',
          'Unlimited priority requests',
          'Family account (up to 4)',
          'Concierge coordination',
          'Same-day service priority',
          'Premium buyer protection'
        ],
        cta: 'Get Max plan',
        ctaType: 'pay',
        note: 'No commitment · Cancel anytime'
      }
    },
    business: {
      free: {
        id: 'vendor-starter',
        name: 'Starter',
        tagline: 'List your business',
        price: 0,
        billing: 'forever',
        serviceName: 'InstaHelp Vendor Starter',
        features: [
          'Basic business listing',
          'Lead notifications',
          'Profile on InstaHelp',
          'WhatsApp inquiries',
          'Standard visibility'
        ],
        cta: 'Register free',
        ctaType: 'link',
        href: '/#contact'
      },
      pro: {
        id: 'vendor-growth',
        name: 'Growth',
        tagline: 'Grow with InstaHelp',
        monthlyPrice: 999,
        serviceName: 'InstaHelp Vendor Growth Plan',
        vendorName: 'InstaHelp',
        features: [
          'Everything in Starter',
          'Featured listing placement',
          'PhonePe payment collection',
          'Order & payment dashboard',
          'Customer analytics',
          'Priority support'
        ],
        cta: 'Get Growth plan',
        ctaType: 'pay'
      },
      max: {
        id: 'vendor-enterprise',
        name: 'Enterprise',
        tagline: 'Multi-location & teams',
        monthlyPrice: 1499,
        serviceName: 'InstaHelp Vendor Enterprise Plan',
        vendorName: 'InstaHelp',
        features: [
          'Everything in Growth',
          'Multi-branch management',
          'Dedicated account manager',
          'Custom PhonePe merchant setup',
          'API & webhook access',
          'SLA-backed support'
        ],
        cta: 'Get Enterprise plan',
        ctaType: 'pay',
        note: 'Billed monthly · Cancel anytime'
      }
    }
  };

  function getPlans(audience) {
    return PLANS[audience] || PLANS.individual;
  }

  function getPlanPrice(plan, billingPeriod) {
    if (plan.price === 0) return 0;
    if (billingPeriod === 'yearly' && plan.yearlyPrice) {
      return plan.yearlyPrice;
    }
    return plan.monthlyPrice || plan.price || 0;
  }

  function buildOrderPayload(plan, billingPeriod) {
    var price = getPlanPrice(plan, billingPeriod);
    var periodLabel = billingPeriod === 'yearly' ? 'Annual' : 'Monthly';

    return {
      serviceName: plan.serviceName + ' (' + periodLabel + ')',
      vendorName: plan.vendorName || 'InstaHelp',
      quantity: 1,
      price: price,
      discount: 0,
      applyGst: true,
      planId: plan.id,
      billingPeriod: billingPeriod
    };
  }

  function formatINR(amount) {
    if (amount === 0) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  global.InstaHelpPlans = {
    PLANS: PLANS,
    getPlans: getPlans,
    getPlanPrice: getPlanPrice,
    buildOrderPayload: buildOrderPayload,
    formatINR: formatINR
  };
})(typeof window !== 'undefined' ? window : this);
