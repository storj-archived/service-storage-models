'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
require('mongoose-currency').loadType(mongoose);

const Invite = new mongoose.Schema({

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Marketing'
  },

  recipient: {
    type: mongoose.SchemaTypes.Email,
    required: true
  },

  sent: {
    type: Date,
    default: Date.now
  },

  convertedDate: {
    type: Date
  },

  senderCreditIssued: {
    type: Boolean,
    default: false
  },

  recipientCreditIssued: {
    type: Boolean,
    default: false
  },

  recipientCredit: {
    type: mongoose.Types.Currency,
    min: 0,
    default: 0
  },

  senderCredit: {
    type: mongoose.Types.Currency,
    min: 0,
    default: 0
  },

  recipientMinBilled: {
    type: mongoose.Types.Currency,
    min: 0,
    default: 0
  }

})

Invite.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Invite', Invite);
}
