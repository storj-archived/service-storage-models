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
      coinpayments().getCallbackAddress(token, function(err, response) {
        if (err) {
          console.error('error from coinpayments#getCallbackAddres', err);
          reject(err);
        }

        if (!response || !response.address) {
          console.error('no response from coinpayments', response);
          return reject(new Error('no response or address from coinpayments'));
        }

        coinpaymentsProcessor.data.push({
          token: token,
          address: response.address
        });

        return coinpaymentsProcessor.save()
          .then((processor) => {
            return resolve();
          })
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
