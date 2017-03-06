'use strict';

const moment = require('moment');

module.exports.isValidEmail = function (email) {
  const tester = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // jshint ignore:line

  if (email.length > 254) {
    return false;
  }

  if (!tester.test(email)) {
    return false;
  }
  return true;
};

module.exports.isValidObjectId = function(id) {
  if (typeof id != 'string') {
    return false;
  }
  return /^[0-9a-fA-F]{24}$/.test(id)
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
