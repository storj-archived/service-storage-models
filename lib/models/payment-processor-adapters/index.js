'use strict';

const constants = require('../../constants');
const STRIPE = constants.PAYMENT_PROCESSORS.STRIPE;
const COINPAYMENTS = constants.PAYMENT_PROCESSORS.COINPAYMENTS;
const BRAINTREE = constants.PAYMENT_PROCESSORS.BRAINTREE;
// const HEROKU = constants.PAYMENT_PROCESSORS.HEROKU;

const stripeAdapter = require('./stripe');
const coinPaymentsAdapter = require('./coinpayments.js');
const braintreeAdapter = require('./braintree');
//const herokuAdapter = require('./heroku');

const adapters = {};
adapters[STRIPE] = stripeAdapter;
adapters[BRAINTREE] = braintreeAdapter;
adapters[COINPAYMENTS] = coinPaymentsAdapter;
//adapters[HEROKU] = herokuAdapter;

module.exports = adapters;
