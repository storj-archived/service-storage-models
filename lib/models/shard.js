'use strict';

const mongoose = require('mongoose');
const _ = require('lodash');

/**
 * Represents a shard stored on a user's behalf in the network
 * @constructor
 */
var ShardSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    unique: true
  },
  contracts: [{
    nodeID: { type: String },
    contract: { type: Object },
    _id: false
  }],
  trees: [{
    nodeID: { type: String },
    tree: { type: Array },
    _id: false
  }],
  challenges: [{
    nodeID: { type: String },
    challenge: { type: Object },
    _id: false
  }],
  meta: [{
    nodeID: { type: String },
    meta: { type: Object },
    _id: false
  }]
});

ShardSchema.index({hash: 1});

ShardSchema.set('toObject', {
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
  }
});

/**
 * Creates a shard record from the supplied storage item
 * @param {Object} item
 * @param {Function} callback
 */

ShardSchema.statics.create = function(item, callback) {
  let Shard = this;

  Shard.findOne({ hash: item.hash }, function(err, shard) {
    if (err) {
      return callback(err);
    }
    shard = shard || new Shard({ hash: item.hash })

    shard.contracts = mapItems(item.contracts, 'contract');
    shard.trees = mapItems(item.trees, 'tree');
    shard.challenges = mapItems(item.challenges, 'challenge');
    shard.meta = mapItems(item.meta, 'meta');

    shard.save(function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, shard);
    });

    function mapItems(collection, single) {
      return collection.map((item, nodeID) => {
        return { nodeID: nodeID, [single]: item };
      });
    }
  });
};

module.exports = function(connection) {
  return connection.model('Shard', ShardSchema);
};

module.exports.Schema = ShardSchema;
