'use strict';

const constants = require('../../constants');
const STRIPE = constants.PAYMENT_PROCESSORS.STRIPE;
const BRAINTREE = constants.PAYMENT_PROCESSORS.BRAINTREE;
const COINPAYMENTS = constants.PAYMENT_PROCESSORS.COINPAYMENTS;

const stripeAdapter = require('./stripe');
const braintreeAdapter = require('./braintree');
const coinpaymentsAdapter = require('./coinpayments');

const adapters = {};
adapters[STRIPE] = stripeAdapter;
adapters[BRAINTREE] = braintreeAdapter;
adapter[COINPAYMENTS] = coinpaymentsAdapter;

module.exports = adapters;
