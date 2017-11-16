'use strict';

const coinpayments = require('../../vendor/coinpayments');

let coinpaymentsProcessor;

const coinpaymentsAdapter = {

  serializeData: function (data) {
    return data;
  },

  parseData: function () {
    return coinpaymentsProcessor.rawData;
  },

  addPaymentMethod: function (token) {
    return new Promise((resolve, reject) => {
      coinpayments().getCallbackAddress(token, function(err, data) {
        if (err) {
          reject(err);
        }
        coinpaymentsProcessor.data.push({
          token: token,
          address: data.address
        });
        return coinpaymentsProcessor.save()
          .then(resolve)
          .catch(reject);
      });
    });
  },

  removePaymentMethod: function (address) {
    return new Promise((resolve, reject) => {
      const updated = coinpaymentsProcessor.data.filter(item => {
        return item.address !== address;
      });
      coinpaymentsProcessor.data = updated;
      return coinpaymentsProcessor.save()
        .then(resolve)
        .catch(reject);
    });
  },

  defaultPaymentMethod: function () {
    return coinpaymentsProcessor.rawData;
  },

  validate: function () {
    return Promise.resolve(true);
  },

  billingDate: function () {
    return 1;
  },

  paymentMethods: function () {
    return coinpaymentsProcessor.rawData;
  }

};

module.exports = function(paymentProcessor) {
  coinpaymentsProcessor = paymentProcessor;
  return coinpaymentsAdapter;
};
