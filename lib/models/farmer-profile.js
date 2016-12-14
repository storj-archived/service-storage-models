 'use strict';

 const mongoose = require('mongoose');

/**
 * Represents record of various calculated statistics 
 * pertaining to farmer behavior
 * @constructor
 */

 var FarmerProfile = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now,
    required: true
  },
  farmerId: {
    type: String,
    required: true
  },
  profile: {
    failureRate: {type: Number, required: false}
  }
 });

module.exports = function(connection) {
  return connection.model('FarmerProfile', ExchangeReport);
};
