'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');

const MIRROR_TTL_SECONDS = 2592000; // 30 days

/**
 * Represents a pool of contacts who can mirror a shard
 * @constructor
 */
var Mirror = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now,
    expires: MIRROR_TTL_SECONDS
  },
  shardHash: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    ref: 'Contact',
    required: true
  },
  contract: {
    type: Object,
    required: true
  },
  token: {
    type: String,
    required: false
  },
  isEstablished: {
    type: Boolean,
    default: false
  }
});

Mirror.index({ shardHash: 1, isEstablished: -1 });

Mirror.plugin(SchemaOptions);

Mirror.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
  }
});

Mirror.statics.create = function(contract, contact, callback) {
  var self = this;

  var mirror = new self({
    shardHash: contract.data_hash,
    contact: contact.nodeID,
    contract: contract
  });

  mirror.save(callback);
};

Mirror.statics.createWithToken = function(contract, contact, token, callback) {
  var self = this;

  var mirror = new self({
    shardHash: contract.data_hash,
    contact: contact.nodeID,
    contract: contract,
    token: token
  });

  mirror.save(callback);
};

module.exports = function(connection) {
  return connection.model('Mirror', Mirror);
};
