'use strict';

const mongoose = require('mongoose');
const utils = require('../utils');
/**
 * Represents a storage event for a farmer node. When a farmer receives data
 * storage will be added with positive number. When contract ends or when
 * the data is not available from the farmer, a negative number is added.
 * Each time a shard is downloaded, a new event will be created with the
 * amount of bandwidth.
 * @constructor
 */
var FarmerEvent = new mongoose.Schema({
  nodeID: {
    type: String,
    required: true
  },
  payoutAddress: {
    type: String,
    required: true
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

FarmerEvent.index({ nodeID: 1 });
FarmerEvent.index({ timestamp: 1});

module.exports = function(connection) {
  return connection.model('FarmerEvent', FarmerEvent);
};
