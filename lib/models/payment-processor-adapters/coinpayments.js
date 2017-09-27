'use strict';
const moment = require('moment');
const CoinPayments = require('coinpayments');
const coin = new CoinPayments({
  key: process.env.CP_PUBLIC_KEY,
  secret: process.env.CP_SECRET_KEY
});

let coinPaymentsProcessor;

const coinPaymentsAdapter = {
  serializeData: function(data) {
    return [data];
  },

  parseData: function() {
    const rawData = coinPaymentsProcessor.rawData;

    if (!rawData[0]) {
      coinPaymentsProcessor.rawData = [{}];
    }

    return rawData[0];
  },

  addPaymentMethod: function (data) {
    return new Promise((resolve, reject) => {
      coin.getCallbackAddress('STORJ', (err, response) => {
        if (err) {
          return Promise.reject(err);
        }
        return Promise.resolve({
         // TODO return resolved address and user
        });
      });
    });
  },

  billingDate: function () {
    if (coinPaymentsProcessor.billingDate) {
      return coinPaymentsProcessor.data.billingDate;
    }

    return Date.now();
  },

  defaultPaymentMethod: function () {
    return null;
  }
}

module.exports = function(paymentProcessor) {
  coinPaymentsProcessor = paymentProcessor;
  return coinPaymentsAdapter;
};
