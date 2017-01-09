const stripe = require('stripe');

module.exports = process.env.NODE_ENV === 'production' ?
  stripe(process.env.STRIPE_KEY) : stripe(process.env.STRIPE_TEST_KEY);
