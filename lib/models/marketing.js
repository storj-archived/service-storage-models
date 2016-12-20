'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');

const Marketing = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },

  created: {
    type: Date,
    default: Date.now
  },

  creationSource: {
    type: String,
    enum: Object.keys(CREATION_SOURCES).map((key) => (CREATION_SOURCES[key])),
    required: true
  },

  referralLink: {
    type: String,
    unique: true
  },

  sentInvites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invite'
  }]

})

Marketing.statics.create = function(marketing, callback) {
  // create mnemonic from email

  // add to object if it doesn't exist


}

Marketing.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Marketing', Marketing);
}
