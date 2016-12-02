'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const CREDIT_TYPES = constants.CREDIT_TYPES;
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;

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
    default: null
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
    default: PAYMENT_PROCESSORS.NULL,
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
Credit.pre('save', (next) => {
  if (this.paid_amount) {
    var convertToInt = parseInt(this.paid_amount);
  }
  try {
    if (this.promo_amount > 0) {
      console.assert(typeof this.promo_code !== 'null')
      console.assert(this.paid_amount === 0)
      console.assert(this.invoiced_amount === 0);
    }

    var converted_paid_amount = parseInt(this.paid_amount);
    console.log('paid amount', this.paid_amount);
    console.log('converted', converted_paid_amount);

    if (this.paid_amount && isNaN(converted_paid_amount)) {
      console.assert(typeof(this.paid_amount) === 'number')
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
