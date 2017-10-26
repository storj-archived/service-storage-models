'use strict';

const coinpayments = require('../../vendor/coinpayments');
const constants = require('../../constants');

let coinapaymentsProcessor;

const coinpaymentsAdapter = {

  serializeData: function (data) {
    return data;
  },

  parseData: function (data) {
    return data;
  },

  addPaymentMethod: function (token) {
    return new Promise((resolve, reject) => {
      coinpayments.getCallbackAddress(token, function(err, data) {
        if (err) reject(err);

        coinpaymentsProcessor.data.push({
          token: token,
          address: data.address
        });
        coinpaymentsProcessor.save()
          .then(resolve)
          .catch(reject);
      });
    });
  }
}

module.exports = function(paymentProcessor) {
  coinpaymentsProcessor = paymentProcessor;
  return coinpaymentsAdapter;
}
