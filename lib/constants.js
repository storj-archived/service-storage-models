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
  STRIPE_MIN_CENTS: 1.0,
  STRIPE_PLAN_ID: 'premium',
  PROMO_CODE: {
    NEW_SIGNUP: 'new-signup',
    REFERRAL_RECIPIENT: 'referral-recipient',
    REFERRAL_SENDER: 'referral-sender',
    FREE_THRESHOLD: 'free-threshold',
    STORJ_EVENT: 'storj-event'
  },
  PROMO_EXPIRES: {
    DEFAULT: setPromoExpiration(12, 'months'),
    NEW_SIGNUP: setPromoExpiration(12, 'months'),
    REFERRAL_RECIPIENT: setPromoExpiration(3, 'months'),
    REFERRAL_SENDER: setPromoExpiration(3, 'months'),
    FREE_THRESHOLD: new Error('FREE_THRESHOLD expiration should be' +
      'calculated to be one month after the billing date in the current month')
  },
  PROMO_AMOUNT: {
    NEW_SIGNUP: 488,
    REFERRAL_RECIPIENT: 1000,
    REFERRAL_SENDER: 1000,
    MIN_SPENT_REQUIREMENT: 1000,
    FREE_THRESHOLD: 167
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
  MIN_SHARD_SIZE: 15360,
  MAX_REPUTATION_POINTS: 5000,
  MIN_REPUTATION_POINTS: 0,
  POINTS: {
    REQUEST_SUCCESS: 1,
    REQUEST_TIMEOUT: -1,
    REQUEST_ERROR: -1,
    OFFLINE: -1000,
    TRANSFER_SUCCESS: 10,
    TRANSFER_FAILURE: -10
  },
  LOG_LEVEL_NONE: 0,
  LOG_LEVEL_ERROR: 1,
  LOG_LEVEL_WARN: 2,
  LOG_LEVEL_INFO: 3,
  LOG_LEVEL_DEBUG: 4
};
