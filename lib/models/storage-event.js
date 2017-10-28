'use strict';

const mongoose = require('mongoose');
const utils = require('../utils');
/**
 * Represents the history of storage related summary
 * statistics for buckets and their associated files
 * @constructor
 */

var StorageEvent = new mongoose.Schema({
  token: {
    type: String,
    required: false,
    unique: true
  },
  user: {
    type: String,
    ref: 'User',
    required: true,
    validate: {
      validator: value => utils.isValidEmail(value),
      message: 'Invalid user email address'
    }
  },
  client: {
    type: String,
    required: true
  },
  farmer: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  farmerEnd: {
    type: Date,
    required: false
  },
  userDeleted: {
    type: Date,
    required: false
  },
  downloadBandwidth: {
    type: Number,
    required: false
  },
  storage: {
    type: Number,
    required: false
  },
  shardHash: {
    type: String,
    required: false
  },
  clientReport: {
    exchangeStart: {
      type: Date,
      required: false
    },
    exchangeEnd: {
      type: Date,
      required: false
    },
    exchangeResultCode: {
      type: Number,
      required: false
    },
    exchangeResultMessage: {
      type: String,
      required: false
    }
  },
  farmerReport: {
    exchangeStart: {
      type: Date,
      required: false
    },
    exchangeEnd: {
      type: Date,
      required: false
    },
    exchangeResultCode: {
      type: Number,
      required: false
    },
    exchangeResultMessage: {
      type: String,
      required: false
    }
  },
  success: {
    type: Boolean,
    required: true,
    default: false
  }
});

StorageEvent.index({ bucket: 1 });
StorageEvent.index({ bucketEntry: 1});
StorageEvent.index({ user: 1});

module.exports = function(connection) {
  return connection.model('StorageEvent', StorageEvent);
};
