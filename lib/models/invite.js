'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
require('mongoose-currency').loadType(mongoose);

const Invite = new mongoose.Schema({
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Marketing'
    },
    creditAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    creditIssued: {
      type: Boolean,
      default: false
    }
  },
  recipient: {
    id: {
      type: mongoose.SchemaTypes.Email,
      required: true
    },
    creditAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    creditIssued: {
      type: Boolean,
      default: false
    },
    minBilled: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  created: {
    type: Date,
    default: Date.now
  },
  converted: {
    type: Boolean,
    default: false
  },
  convertedDate: {
    type: Date
  }
});

Invite.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Invite', Invite);
};
