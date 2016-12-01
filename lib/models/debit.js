'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const DEBIT_TYPES = require('../constants').DEBIT_TYPES;

const Debit = new mongoose.Schema({
  amount: {
    type: mongoose.Types.Currency,
    required: true
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
  // change to int
  bandwidth: {
    type: mongoose.Types.Currency
  },
  // change to int
  storage: {
    type: mongoose.Types.Currency
  }
});

Debit.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Debit', Debit);
};
