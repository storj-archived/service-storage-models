'use strict';

const mongoose = require('mongoose');
const utils = require('../utils');
/**
 * Represents the history of storage related summary 
 * statistics for buckets and their associated files
 * @constructor
 */

var StorageEvent = new mongoose.Schema({
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
  user: {
    type: String, 
    ref: 'User',
    required: true,
    validate: {
      validator: value => utils.isValidEmail(value),
      message: 'Invalid user email address'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  downloadBandwidth: {
    type: Number,
    required: false
  },
  storage: {
    type: Number, 
    required: false
  }
});

StorageEvent.index({ bucket: 1 });
StorageEvent.index({ bucketEntry: 1});
StorageEvent.index({ user: 1});

module.exports = function(connection) {
  return connection.model('StorageEvent', StorageEvent);
};
