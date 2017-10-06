'use strict';

const mongoose = require('mongoose');
const utils = require('../utils');

/**
 * Represents an amount paid/owed to a farmer node
 * @constructor
 */
var FarmerLiability = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: false
  }
});

FarmerLiablity.index({ nodeID: 1 });
FarmerLiablity.index({ timestamp: 1 });

module.exports = function(connection) {
  return connection.model('FarmerLiability', FarmerLiability);
};
