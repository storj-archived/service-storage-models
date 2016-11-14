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
    default: false,
    required: true
  },
  clientId: {
    type: String,
    default: null,
    required: false,
  },
  farmerId: {
    type: String,
    default: null,
    required: false,
  },
  dataHash: {
    type: String,
    default: false,
    required: true
  },
  exchangeTime: {
    type: Date,
    default: false,
    required: true
  },
  exchangeResultCode: {
  	type: Number
  	default: false,
  	required: true
  }, 
  exchangeResultMessage: {
  	type: String, 
  	default: false, 
  	required: true
  }
}); 

module.exports = function(connection) {
  return connection.model('ExchangeReport', ExchangeReport);
};
