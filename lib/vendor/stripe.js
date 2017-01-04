const stripe = require('stripe');

if(process.env.NODE_ENV !== 'production'){
  // NB: Stripe key for development and testing.
  console.log('STRIPE KEY API: ', process.env.STRIPE_TEST_KEY);
  return module.exports = stripe(process.env.STRIPE_TEST_KEY);
}

return module.exports = stripe(process.env.STRIPE_KEY);
