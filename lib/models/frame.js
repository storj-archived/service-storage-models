'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const utils = require('../utils');
const constants = require('../constants');
const errors = require('storj-service-error-types');

/**
 * Represents a file staging frame
 * @constructor
 */
var Frame = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now
  },
  user: {
    type: String,
    ref: 'User',
    validate: {
      validator: value => utils.isValidEmail(value),
      message: 'Invalid user email address'
    }
  },
  locked: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    default: 0
  },
  storageSize: {
    type: Number,
    default: 0
  },
  shards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pointer'
  }]
});

Frame.plugin(SchemaOptions);
Frame.index({user: 1});

Frame.set('toObject', {
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;

    ret.id = doc._id;
  }
});

/**
 * Locks a frame
 * @param {Function} callback
 */
Frame.methods.lock = function(callback) {
  this.locked = true;

  this.save(callback);
};

/**
 * Validates shard sizes
 * @param {Array} shards - Array of shards with size and parity props
 * @returns {Boolean}
 */
Frame.statics.validShardSizes = function(shards) {
  if (shards.length > 1) {
    shards.sort((a, b) => parseInt(a.index) - parseInt(b.index));
    if (shards[0].index !== 0) {
      return true;
    }
    let shardSize = shards[0].size;
    let lastShardIndex = shards.length - 1;
    for (let i = 0; i < shards.length; i++) {
      if (shards[i].parity) {
        lastShardIndex = i - 1;
        break;
      }
    }
    for (let i = 0; i < shards.length; i++) {
      let s = shards[i].size;
      if ((s < constants.MIN_SHARD_SIZE || s !== shardSize) &&
          i !== lastShardIndex) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Unlocks a frame
 * @param {Function} callback
 */
Frame.methods.unlock = function(callback) {
  this.locked = false;

  this.save(callback);
};

Frame.methods.addShard = function(pointer, callback) {
  const self = this;

  function pushShard(next) {
    let update = {};
    update.$inc = { storageSize: pointer.size };
    if (!pointer.parity) {
      update.$inc.size = pointer.size;
    }
    update.$push = { shards: pointer._id };
    self.update(update, next);
  }

  function maybePullShard(next) {
    let replaced = false;
    let pullUpdate = {};

    for (let i = 0; i < self.shards.length; i++) {
      if (self.shards[i].index === pointer.index) {
        pullUpdate.$pull = { shards: self.shards[i]._id };
        replaced = true;
        break;
      }
    }

    if (replaced) {
      pullUpdate.$inc = { storageSize: -1 * pointer.size };
      if (!pointer.parity) {
        pullUpdate.$inc.size = -1 * pointer.size;
      }
      self.update(pullUpdate, next);
    } else {
      next();
    }
  }

  if (!Frame.statics.validShardSizes(this.shards)) {
    return callback(new errors.BadRequestError('Invalid shard sizes'));
  }

  maybePullShard((err) => {
    if (err) {
      return callback(err);
    }
    pushShard(callback);
  });
};

/**
 * Creates a Frame
 * @param {storage.models.User} user
 * @param {Function} callback
 */
Frame.statics.create = function(user, callback) {
  let Frame = this;
  let frame = new Frame({ user: user._id });

  frame.save(function(err) {
    if (err) {
      return callback(err);
    }

    callback(null, frame);
  });
};

module.exports = function(connection) {
  return connection.model('Frame', Frame);
};
