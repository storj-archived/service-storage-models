'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const storj = require('storj-lib');
const crypto = require('crypto');
/**
 * Represents a storage bucket
 * @constructor
 */
var Bucket = new mongoose.Schema({
  storage: {
    type: Number,
    default: 0
  },
  transfer: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  pubkeys: [{
    type: String,
    ref: 'PublicKey'
  }],
  user: {
    type: String,
    ref: 'User'
  },
  name: {
    type: String,
    default: function() {
      return 'Bucket-' + crypto.randomBytes(3).toString('hex');
    }
  },
  created: {
    type: Date,
    default: Date.now
  },
  publicPermissions: {
    type: [{
      type: String,
      enum: ['PUSH', 'PULL'],
    }],
    default: []
  },
  encryptionKey: {
    type: String,
    default: ''
  },
});

Bucket.plugin(SchemaOptions);

Bucket.index({user: 1});

Bucket.set('toObject', {
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;

    ret.id = doc._id;
  }
});

/**
 * Creates a Bucket
 * @param {storage.models.User} user
 * @param {Object} data
 * @param {Function} callback
 */
Bucket.statics.create = function(user, data, callback) {
  let Bucket = this;

  let bucket = new Bucket({
    status: 'Active',
    pubkeys: data.pubkeys,
    user: user._id
  });

  if (data.name) {
    bucket.name = data.name;
  }

  bucket._id = mongoose.Types.ObjectId(
    storj.utils.calculateBucketId(user._id, bucket.name)
  );

  bucket.save(function(err) {
    if (err) {
      if (err.code === 11000) {
        return callback(new Error('Name already used by another bucket'));
      }

      return callback(err);
    }

    Bucket.findOne({ _id: bucket._id }, function(err, bucket) {
      if (err) {
        return callback(err);
      }

      if (!bucket) {
        return callback(new Error('Failed to load created bucket'));
      }

      callback(null, bucket);
    });
  });
};

module.exports = function(connection) {
  return connection.model('Bucket', Bucket);
};
