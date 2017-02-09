/**
 * @module storj-service-storage-models/constants
 */

'use strict';

const { setPromoExpiration } = require('./utils');

module.exports = {
  /** @constant {Number} DEFAULT_FILE_TTL - File renewal interval */
  DEFAULT_FILE_TTL: '90d',
  PAYMENT_PROCESSORS: {
    STRIPE: 'stripe',
    BRAINTREE: 'braintree',
    HEROKU: 'heroku',
    DEFAULT: 'none'
  },
  STRIPE_MIN_CENTS: 100.0,
  STRIPE_PLAN_ID: 'premium',
  PROMO_CODE: {
    NONE: 'none',
    NEW_SIGNUP: 'new-signup',
    REFERRAL_RECIPIENT: 'referral-recipient',
    REFERRAL_SENDER: 'referral-sender'
  },
  PROMO_EXPIRES: {
    'DEFAULT': setPromoExpiration(1, 'year'),
    'NEW_SIGNUP': setPromoExpiration(3, 'months'),
    'REFERRAL_RECIPIENT': setPromoExpiration(3, 'months'),
    'REFERRAL_SENDER': setPromoExpiration(3, 'months')
  },
  PROMO_AMOUNT: {
    'NEW_SIGNUP': 10,
    'REFERRAL_RECIPIENT': 10,
    'REFERRAL_SENDER': 10,
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
