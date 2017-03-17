'use strict';

const moment = require('moment');

module.exports.isValidEmail = function (email) {
  const tester = /^.{1,69}@.{1,255}$/;
  if (!tester.test(email)) {
    return false;
  }
  return true;
};

/**
 * Adds X num of months from today to set expiration date on promo_amount
 * @param {number} numOfMonths
 */
module.exports.setPromoExpiration = function(value, unit) {
  return moment.utc().add(value, unit).toDate();
};

module.exports.keysOf = function(obj) {
  return Object.keys(obj).map((key) => obj[key]);
};
