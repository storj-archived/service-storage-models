const stripe = require('stripe');

if(process.env.NODE_ENV !== 'production'){
  return module.exports = stripe(process.env.STRIPE_TEST_KEY);
}

return module.exports = stripe(process.env.STRIPE_KEY);
