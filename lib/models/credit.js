'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const errors = require('storj-service-error-types');
const {
  CREDIT_TYPES,
  PAYMENT_PROCESSORS,
  PROMO_CODE
} = require('../constants');
const assert = require('assert');

const Credit = new mongoose.Schema({
  paid_amount: {
    type: Number,
    get: v => v && (v / 10000),
    set: v => v && Math.round(v * 10000),
    min: [0, 'Cannot have negative amounts'],
  },
  invoiced_amount: {
    type: Number,
    get: v => v && (v / 10000),
    set: v => v && Math.round(v * 10000),
    min: [0, 'Cannot have negative amounts'],
  },
  user: {
    type: String,
    required: true,
    ref: 'User'
  },
  promo_code: {
    type: String,
    enum: Object.keys(PROMO_CODE).map((key) => PROMO_CODE[key])
  },
  promo_amount: {
    type: Number,
    get: v => v && (v / 10000),
    set: v => v && Math.round(v * 10000)
  },
  promo_expires: {
    type: Date
  },
  promo_referral_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral'
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

Credit.set('toObject', {
  getters: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
  }
});

Credit.set('toJSON', {
  getters: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
  }
});

// NB: Validate for docs that have no promo_amount
Credit.pre('validate', function(next) {
  if (!this.promo_amount) {
    // if no promo_amount, then paid_amount && invoiced_amount must exist with
    // a default of zero if no amount(s) is passed in
    this.paid_amount = this.paid_amount ? this.paid_amount : 0;
    this.invoiced_amount = this.invoiced_amount ? this.invoiced_amount : 0;

    // paid_amount cannot be greater than invoiced_amount
    if (this.paid_amount > this.invoiced_amount) {
      return next(new errors.BadRequestError(
        'paid_amount cannot be greater than invoiced_amount'
      ));
    }

    // set paid to true if this.paid_amount === this.invoiced_amount
    // else set paid to false
    if (this.paid_amount === this.invoiced_amount) {
      this.paid = true;
    } else {
      this.paid = false;
    }

    return next();
  }

  next();
});

// NB: Validate for docs that have promo amount
Credit.pre('validate', function(next) {
  // disallow coexistence of promo_amount and paid_amount/invoiced_amount
  if (this.promo_amount !== null && this.promo_amount >= 0 &&
    (this.paid_amount || this.invoiced_amount)) {
    return next(new errors.BadRequestError(
      'a positive or zero promo_amount cannot exist ' +
      'with invoiced_amount and/or paid_amount'
    ));
  }

  if (this.promo_amount !== null && this.promo_amount >= 0) {
    if (!this.promo_code) {
      return next(new errors.BadRequestError(
        'promo_amount must have valid promo_code'
      ));
    }

    if (!this.promo_expires) {
      return next(new errors.BadRequestError(
        'promo_amount must have accompanying promo_expires date field'
      ));
    }

    return next();
  } else {
    if (this.promo_code) {
      return next(new errors.BadRequestError(
        'promo_code cannot exist with a negative promo_amount'
      ));
    }

    if (this.promo_expires) {
      return next(new errors.BadRequestError(
        'promo_expires cannot exist with a negative promo_amount'
      ));
    }
  }

  next();
});

// NB: Validate for docs that have referral promo_code
Credit.pre('validate', function(next) {
  if (this.promo_code === PROMO_CODE.REFERRAL_RECIPIENT ||
      this.promo_code === PROMO_CODE.REFERRAL_SENDER) {
    try {
      assert(this.promo_referral_id);
    } catch(err) {
      return next(new errors.BadRequestError(
        'promo credit docs require a promo_referral_id'
      ));
    }
    return next();
  }
  next();
});

Credit.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Credit', Credit);
};
