'use strict';

const errors = require('storj-service-error-types');
const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const _ = require('lodash');

/**
 * Represents a pool of contacts who can mirror a shard
 * @constructor
 */
var Mirror = new mongoose.Schema({
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

  if (_.isEmpty(contract)) {
    return callback(new Error('Cannot save mirror: invalid contract'));
  }

  if (_.isEmpty(contact)) {
    return callback(new Error('Cannot save mirror: invalid contact'));
  }

  var mirror = new self({
    shardHash: contract.data_hash,
    contact: contact.nodeID,
    contract: contract
  });

  mirror.save(function(err, mirror) {
    if (err) {
      return callback(new Error('Cannot save mirror', err));
    }
    return callback(null, mirror);
  });
};

module.exports = function(connection) {
  return connection.model('Mirror', Mirror);
};
