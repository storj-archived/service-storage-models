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

  let replaced = false;
  let update = {};

  for (let i = 0; i < this.shards.length; i++) {
    if (this.shards[i].index === pointer.index) {
      update.$pull = { shards: this.shards[i]._id };
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    update.$inc = { storageSize: pointer.size };
    if (!pointer.parity) {
      update.$inc.size = pointer.size;
    }
  }

  update.$push = { shards: pointer._id };

  this.update(update, callback);
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
