'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const utils = require('../utils');

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
