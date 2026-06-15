/**
 * InstaHelp Orders — localStorage order management
 */
(function (global) {
  'use strict';

  var ORDERS_KEY = 'instahelp_orders';
  var COUNTER_KEY = 'instahelp_order_counter';

  function pad(num, len) {
    var s = String(num);
    while (s.length < len) s = '0' + s;
    return s;
  }

  function generateOrderId() {
    var year = new Date().getFullYear();
    var counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1;
    localStorage.setItem(COUNTER_KEY, String(counter));
    return 'IH-' + year + '-' + pad(counter, 6);
  }

  function getAllOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function getOrderById(orderId) {
    return getAllOrders().find(function (o) { return o.orderId === orderId; }) || null;
  }

  function createOrder(data) {
    var order = {
      orderId: data.orderId || generateOrderId(),
      serviceName: data.serviceName || 'Service',
      vendorName: data.vendorName || 'Verified Provider',
      quantity: data.quantity || 1,
      amount: data.amount || 0,
      date: data.date || new Date().toISOString(),
      status: data.status || 'pending'
    };
    var orders = getAllOrders();
    orders.unshift(order);
    saveOrders(orders);
    return order;
  }

  function updateOrderStatus(orderId, status) {
    var orders = getAllOrders();
    var idx = orders.findIndex(function (o) { return o.orderId === orderId; });
    if (idx === -1) return null;
    orders[idx].status = status;
    orders[idx].updatedAt = new Date().toISOString();
    saveOrders(orders);
    return orders[idx];
  }

  global.InstaHelpOrders = {
    ORDERS_KEY: ORDERS_KEY,
    generateOrderId: generateOrderId,
    getAllOrders: getAllOrders,
    getOrderById: getOrderById,
    createOrder: createOrder,
    updateOrderStatus: updateOrderStatus
  };
})(typeof window !== 'undefined' ? window : this);
