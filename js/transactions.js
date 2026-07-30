/**
 * InstaHelp Transactions - localStorage transaction history
 */
(function (global) {
  'use strict';

  var TX_KEY = 'instahelp_transactions';
  var TX_COUNTER_KEY = 'instahelp_tx_counter';

  function pad(num, len) {
    var s = String(num);
    while (s.length < len) s = '0' + s;
    return s;
  }

  function generateTransactionId() {
    var counter = parseInt(localStorage.getItem(TX_COUNTER_KEY) || '0', 10) + 1;
    localStorage.setItem(TX_COUNTER_KEY, String(counter));
    return 'TXN-' + new Date().getFullYear() + '-' + pad(counter, 8);
  }

  function getAllTransactions() {
    try {
      return JSON.parse(localStorage.getItem(TX_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveTransactions(list) {
    localStorage.setItem(TX_KEY, JSON.stringify(list));
  }

  function getTransactionById(transactionId) {
    return getAllTransactions().find(function (t) { return t.transactionId === transactionId; }) || null;
  }

  function createTransaction(data) {
    var tx = {
      transactionId: data.transactionId || generateTransactionId(),
      orderId: data.orderId || '',
      amount: data.amount || 0,
      status: data.status || 'pending',
      date: data.date || new Date().toISOString(),
      vendor: data.vendor || '',
      service: data.service || '',
      method: data.method || 'PhonePe'
    };
    var list = getAllTransactions();
    list.unshift(tx);
    saveTransactions(list);
    return tx;
  }

  function updateTransactionStatus(transactionId, status) {
    var list = getAllTransactions();
    var idx = list.findIndex(function (t) { return t.transactionId === transactionId; });
    if (idx === -1) return null;
    list[idx].status = status;
    list[idx].updatedAt = new Date().toISOString();
    saveTransactions(list);
    return list[idx];
  }

  function filterTransactions(status) {
    var all = getAllTransactions();
    if (!status || status === 'all') return all;
    return all.filter(function (t) {
      return (t.status || '').toLowerCase() === status.toLowerCase();
    });
  }

  global.InstaHelpTransactions = {
    TX_KEY: TX_KEY,
    generateTransactionId: generateTransactionId,
    getAllTransactions: getAllTransactions,
    getTransactionById: getTransactionById,
    createTransaction: createTransaction,
    updateTransactionStatus: updateTransactionStatus,
    filterTransactions: filterTransactions
  };
})(typeof window !== 'undefined' ? window : this);
