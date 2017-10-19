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
  bucket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bucket',
    required: true
  },
  bucketEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BucketEntry',
    required: true
  },
  // User can be both a user in the database as well
  // as a farmer in the case where storage events are created
  // during mirrors.
  user: {
    type: String,
    ref: 'User',
    required: true,
    validate: {
      validator: value => utils.isValidEmail(value),
      message: 'Invalid user email address'
    }
  },
  farmer: {
    type: String,
    required: true
  }
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  storeEnd: {
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
  farmerStorage: {
    type: Number,
    required: false
  },
  shardHash: {
    type: String,
    required: false
  },
  userReport: {
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
