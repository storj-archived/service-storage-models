 'use strict';

const mongoose = require('mongoose');

/**
 * Represents record of client's success or failure attempting
 * to store shard with a particular farmer
 * @constructor
 */

 var dataExchangeReport = new mongoose.Schema({
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
  exchangeCode: {
  	type: Number
  	default: false,
  	required: true
  }, 
  exchangeMessage: {
  	type: String, 
  	default: false, 
  	required: true
  }
}); 