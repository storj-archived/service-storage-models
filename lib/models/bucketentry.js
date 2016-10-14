'use strict';

const ms = require('ms');
const mongoose = require('mongoose');
const mimetypes = require('mime-db');
const SchemaOptions = require('../options');
const storj = require('storj-lib');

/**
 * Represents a bucket entry that points to a file
 * @constructor
 */
var BucketEntry = new mongoose.Schema({
  frame: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Frame'
  },
  bucket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bucket'
  },
  mimetype: {
    type: String,
    enum: Object.keys(mimetypes),
    default: 'application/octet-stream',
    required: true
  },
  name: {
    type: String
  },
  renewal: {
    type: Date,
    default: function() {
      return Date.now() + ms('90d');
    }
  },
  created: {
    type: Date,
    default: Date.now
  }
});

BucketEntry.virtual('filename').get(function() {
  return this.name || this.frame;
});

BucketEntry.index({ bucket: 1 });

BucketEntry.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

BucketEntry.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
    delete ret.name;
  }
});

/**
 * Creates a BucketEntry
 * @param {String} bucket - Bucket id
 * @param {String} frame - Frame id
 * @param {String} mimetype - Mime type of file
 * @param {String} name - File name
 * @param {Function} callback
 */
BucketEntry.statics.create = function(data, callback) {
  let BucketEntry = this;

  let entry = new BucketEntry({
    bucket: data.bucket,
    frame: data.frame,
    mimetype: data.mimetype,
    name: data.name
  });

  // use deterministic file id based on bucketId and fileName
  var fileId = storj.utils.calculateFileId(data.bucket.toString(), entry.name);
  entry._id = mongoose.Types.ObjectId(fileId);

  entry.save(function(err) {
    if (err) {
      if (err.code === 11000) {
        return callback(new Error('Name already used in this bucket'));
      }
      return callback(err);
    }
    callback(null, entry);
  });

};

module.exports = function(connection) {
  return connection.model('BucketEntry', BucketEntry);
};
