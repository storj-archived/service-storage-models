 'use strict';

 const mongoose = require('mongoose');

/**
 * Represents record of client's success or failure attempting
 * to store or retrieve shard with a farmer on the network
 * @constructor
 */

 var ExchangeReport = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now,
    required: true
  },
  reporterId: {
    type: String,
    required: true
  },
  clientId: {
    type: String,
    required: false
  },
  farmerId: {
    type: String,
    required: false
  },
  dataHash: {
    type: String,
    required: true
  },
  exchangeStart: {
    type: Date,
    required: true
  },
  exchangeEnd: {
    type: Date,
    required: true
  },
  exchangeResultCode: {
    type: Number,
    required: true
  },
  exchangeResultMessage: {
    type: String,
    required: true
  }
});

ExchangeReport.index({ dataHash: 1 });

module.exports = function(connection) {
  return connection.model('ExchangeReport', ExchangeReport);
};
