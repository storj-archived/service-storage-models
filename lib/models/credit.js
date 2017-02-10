'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const {
  CREDIT_TYPES,
  PAYMENT_PROCESSORS,
  PROMO_CODE,
  PROMO_EXPIRES
} = require('../constants');

const Credit = new mongoose.Schema({
  paid_amount: {
    type: Number,
    required: true,
    get: v => (v / 10000),
    set: v => Math.round(v * 10000),
    min: [0, 'Cannot have negative amounts'],
    default: 0
  },
  invoiced_amount: {
    type: Number,
    required: true,
    get: v => (v / 10000),
    set: v => Math.round(v * 10000),
    min: [0, 'Cannot have negative amounts'],
    default: 0
  },
  user: {
    type: String,
    required: true,
    ref: 'User'
  },
  promo_code: {
    type: String
  },
  promo_amount: {
    type: Number,
    get: v => (v / 10000),
    set: v => Math.round(v * 10000),
    default: 0
  },
  promo_expires: {
    type: Date
  },
  promo_referral_id: {
    type: mongoose.Schema.Types.ObjectId,
    unique: true
  },
  paid: {
    type: Boolean,
    default: false
  },
  created: {
    type: Date,
    required: true,
    default: Date.now
  },
  payment_processor: {
    type: String,
    enum: Object.keys(PAYMENT_PROCESSORS).map((key) => {
      return PAYMENT_PROCESSORS[key];
    }),
    default: PAYMENT_PROCESSORS.DEFAULT
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

Credit.pre('validate', function(next) {
  try {
    if (this.paid_amount > this.invoiced_amount) {
      let errorMsg = `Cannot save credit: paid_amount cannot be greater than invoiced_amount`; // jshint ignore:line
      return next(new Error(errorMsg));
    }

    if (this.paid) {
      if (this.paid_amount === 0) {
        let errorMsg = `Cannot save credit: paid_amount cannot be 0 if paid is true`; // jshint ignore:line
        return next(new Error(errorMsg));
      }

      if (this.paid_amount !== this.invoiced_amount) {
        let errorMsg = `Cannot save credit: paid cannot be true if paid_amount does not equal invoiced_amount`; // jshint ignore:line
        return next(new Error(errorMsg));
      }
    }

  } catch(err) {
    var error = new Error('Cannot save credit: ', err);
    return next(error);
  }
  return next();
});

Credit.pre('save', function(next) {
  try {
    if (this.promo_amount > 0) {
      console.assert(this.promo_code !== 'none');
      console.assert(this.paid_amount === 0);
      console.assert(this.invoiced_amount === 0);
    }
  } catch(err) {
    return next(new Error('Cannot save credit: ', err));
  }

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
