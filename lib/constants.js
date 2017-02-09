/**
 * @module storj-service-storage-models/constants
 */

'use strict';

const moment = require('moment');

/**
 * Adds X num of months from today to set expiration date on promo_amount
 * @param {number} numOfMonths
 */
const setPromoExpiration = function(value, unit) {
  return moment.utc().add(value, unit).toDate();
};

module.exports = {
  /** @constant {Number} DEFAULT_FILE_TTL - File renewal interval */
  DEFAULT_FILE_TTL: '90d',
  PAYMENT_PROCESSORS: {
    STRIPE: 'stripe',
    BRAINTREE: 'braintree',
    HEROKU: 'heroku',
    DEFAULT: 'none'
  },
  STRIPE_PLAN_ID: 'premium',
  PROMO_CODES: {
    NONE: 'none',
    NEW_SIGNUP: 'new-signup',
    REFERRAL_RECIPIENT: 'referral-recipient',
    REFERRAL_SENDER: 'referral-sender'
  },
  PROMO_EXPIRES: {
    'NEW_SIGNUP': setPromoExpiration(3, 'months'),
    'REFERRAL_RECIPIENT': setPromoExpiration(3, 'months'),
    'REFERRAL_SENDER': setPromoExpiration(3, 'months')
  },
  REFERRAL_AMOUNTS: {
    'NEW_SIGNUP': 10,
    'SENDER_DEFAULT': 10,
    'RECIPIENT_DEFAULT': 10,
    'MIN_BILLED_REQUIREMENT_DEFAULT': 10
  },
  REFERRAL_TYPES: {
    LINK: 'link',
    EMAIL: 'email'
  },
  CREDIT_TYPES: {
    AUTO: 'automatic',
    MANUAL: 'manual'
  },
  DEBIT_TYPES: {
    STORAGE: 'storage',
    BANDWIDTH: 'bandwidth',
    OTHER: 'adjustment'
  },
  LOG_LEVEL_NONE: 0,
  LOG_LEVEL_ERROR: 1,
  LOG_LEVEL_WARN: 2,
  LOG_LEVEL_INFO: 3,
  LOG_LEVEL_DEBUG: 4
};
