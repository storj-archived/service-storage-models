'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const CREDIT_TYPES = constants.CREDIT_TYPES;
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const PROMO_CODES = constants.PROMO_CODES;

// NB: Check this shit out. Y no pass in earlier?
require('mongoose-currency').loadType(mongoose)

const Currency = mongoose.Types.Currency;

const Credit = new mongoose.Schema({
  paid_amount: {
    type: Currency,
    required: true,
    default: 0
  },
  invoiced_amount: {
    type: Currency,
    required: true,
    default: 0
  },
  user: {
    type: mongoose.SchemaTypes.Email,
    required: true,
    ref: 'User'
  },
  promo_code: {
    type: String,
    default: PROMO_CODES.DEFAULT
  },
  promo_amount: {
    type: Currency,
    default: 0
  },
  paid: {
    type: Boolean,
    default: false
  },
  created: {
    type: Date,
    default: Date.now
  },
  payment_processor: {
    type: String,
    enum: Object.keys(PAYMENT_PROCESSORS).map((key) => (PAYMENT_PROCESSORS[key])),
    default: PAYMENT_PROCESSORS.DEFAULT,
  },
  type: {
    type: String,
    enum: Object.keys(CREDIT_TYPES).map((key) => (CREDIT_TYPES[key])),
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
});

// TODO: Hand test this validaton
Credit.pre('validate', function(next) {
  try {

  } catch(err) {
    var error = new Error('Cannot save credit: ', err);
    return next(error);
  }
  return next();
});

// Do not use arrow functions
Credit.pre('save', function(next) {
  try {
    if (this.promo_amount > 0) {
      console.assert(typeof this.promo_code !== 'null')
      console.assert(this.paid_amount === 0)
      console.assert(this.invoiced_amount === 0);
    }
  } catch(err) {
    return next(new Error("Cannot save credit: ", err));
  }
  return next();
});

Credit.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Credit', Credit);
};
