'use strict';

const moment = require('moment');

module.exports.isValidEmail = function (email) {
  // NB: emails must conform to RFC 3969 (https://tools.ietf.org/html/rfc3696)
  //     excluding @heroku.storj.io emails - because they're huge
  const tester = /^(.{1,64}@.{1,255}|.{1,255}@heroku\.storj\.io)$/;
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
