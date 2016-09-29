'use strict';

module.exports = {

  PAYMENT_PROCESSORS: {
    STRIPE: 'stripe',
    BRAINTREE: 'braintree'
  },
  STRIPE_PLAN_ID: 'premium',
  CREDIT_TYPES: {
    AUTO: 'automatic',
    MANUAL: 'manual'
  },
  DEBIT_TYPES: {
    AUDIT: 'audit',
    TRANSFER: 'transfer',
    OTHER: 'adjustment'
  }

}
