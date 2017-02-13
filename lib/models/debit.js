'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const DEBIT_TYPES = require('../constants').DEBIT_TYPES;
const errors = require('storj-service-error-types');

const Debit = new mongoose.Schema({
  /*
   * Stored in base units of ten-thousands of a cent.
   * Returned in base units of 1 cent.
   */
  amount: {
    type: Number,
    required: true,
    get: v => (v / 10000),
    set: v => Math.round(v * 10000)
  },
  user: {
    type: mongoose.SchemaTypes.Email,
    required: true,
    ref: 'User'
  },
  created: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: Object.keys(DEBIT_TYPES).map((key) => (DEBIT_TYPES[key])),
    required: true
  },
  //-- Base unit of bytes
  bandwidth: {
    type: Number,
    get: v => v,
    set: v => Math.round(v),
    default: 0,
    min: [0, 'Cannot have negative bandwidth']
  },
  storage: {
    //-- Base units of bytes
    type: Number,
    get: v => v,
    set: v => Math.round(v),
    default: 0,
    min: [0, 'Cannot have negative storage']
  }
});

// NB: pre('validate') gets called before any pre('save') hooks
Debit.pre('validate', function(next) {
  const amountIsNaN = isNaN(parseInt(this.amount));
  if (amountIsNaN) {
    const err = new errors.BadRequestError('Amount must be a number');
    return next(err);
  }
  next();
});

Debit.set('toJSON', { getters: true });
Debit.set('toObject', { getters: true });

Debit.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Debit', Debit);
};
