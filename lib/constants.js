/**
 * @module storj-bridge/constants
 */

'use strict';

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
    REFERRAL: 'referral'
  },
  REFERRAL_AMOUNTS: {
    'SENDER_DEFAULT': 10,
    'RECIPIENT_DEFAULT': 10,
    'MIN_BILLED_DEFAULT', 25
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
