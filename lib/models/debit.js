'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const DEBIT_TYPES = require('../constants').DEBIT_TYPES;

const Debit = new mongoose.Schema({
  amount: {
    type: mongoose.Types.Currency,
    required: true,
    min: [0, 'Cannot have negative amount'],
    default: 0
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
  // http://mongoosejs.com/docs/schematypes.html
  bandwidth: {
    type: Number,
    get: v => Math.round(v),
    set: v => Math.round(v),
    default: 0,
    min: [0, 'Cannot have negative bandwidth']
  },
  // http://mongoosejs.com/docs/schematypes.html
  storage: {
    type: Number,
    get: v => Math.round(v),
    set: v => Math.round(v),
    default: 0,
    min: [0, 'Cannot have negative storage']
  }
});

Debit.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Debit', Debit);
};
