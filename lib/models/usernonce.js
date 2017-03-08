'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const utils = require('../utils');

/**
 * Represents a unique user & nonce
 * @constructor
 */
var UserNonce = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true,
    validate: {
      validator: value => utils.isValidEmail(value),
      message: 'Invalid user email address'
    }
  },
  nonce: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: '5m'
  }
});

UserNonce.plugin(SchemaOptions);

UserNonce.index({ user: 1, nonce: 1 }, { unique: true });

UserNonce.set('toObject', {
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
  }
});

module.exports = function(connection) {
  return connection.model('UserNonce', UserNonce);
};
