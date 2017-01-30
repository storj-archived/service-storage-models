'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');

const Invite = new mongoose.Schema({
  sender: {
    id: {
      type: String,
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
      required: true,
      index: true
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

Inbox.statis.create = function(options) {

};

Invite.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Invite', Invite);
};
