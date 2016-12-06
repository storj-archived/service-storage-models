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
    min: [0, 'Cannot have negative paid_amount'],
    default: 0,
  },
  invoiced_amount: {
    type: Currency,
    required: true,
    min: [0, 'Cannot have negative invoiced_amount'],
    default: 0
  },
  user: {
    type: mongoose.SchemaTypes.Email,
    required: true,
    ref: 'User'
  },
  promo_code: {
    type: String,
    default: PROMO_CODES.NONE
  },
  promo_amount: {
    type: Currency,
    min: [0, 'Cannot have negative promo_amount'],
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
    // fail if paid_amount is greater than invoiced_amount
    if (this.paid_amount > this.invoiced_amount) {
      var errorMsg = 'Cannot save credit: paid_amount cannot be greater than invoiced_amount';
      return next(new Error(errorMsg));
    }

    // checks for this.paid
    if (this.paid) {
      if (this.paid_amount === 0) {
        var errorMsg = 'Cannot save credit: paid_amount cannot be 0 if paid is true'
        return next(new Error(errorMsg));
      }

      if (this.paid_amount !== this.invoiced_amount) {
        var errorMsg = 'Cannot save credit: paid cannot be true if paid_amount does not equal invoiced_amount';
        return next(new Error(errorMsg));
      }
    }

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
      console.assert(typeof this.promo_code !== 'none')
      console.assert(this.paid_amount === 0)
      console.assert(this.invoiced_amount === 0);
    }
  } catch(err) {
    return next(new Error("Cannot save credit: ", err));
  }

  // Set this.paid to true if invoiced_amount = paid_amount
  if (this.invoiced_amount > 0 && this.invoiced_amount === this.paid_amount) {
    this.paid = true;
  }

  return next();
});

Credit.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Credit', Credit);
};
