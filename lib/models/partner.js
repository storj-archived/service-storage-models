'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const errors = require('storj-service-error-types');

const Partner = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  /*
   * Percentage is in decimal form, range from 0.0 to 1.0
   */
  revShareTotalPercentage: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  created: {
    type: Date,
    default: Date.now
  },
  modified: {
    type: Date,
    default: Date.now
  }
});

Partner.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    delete ret._id;
  }
});

Partner.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    delete ret._id;
  }
});

/**
 * Modifies revShare field(s) and updates modified timestamp
 * @param {String} - field e.g. 'revShareTotalPercentage'
 * @param {Number} - value e.g. 0.2
 */
Partner.methods.modifyRevShare = function (field, value, callback) {
  const revShareFields = ['revShareTotalPercentage'];

  if (revShareFields.indexOf(field) === -1) {
    return callback(new errors.BadRequestError('Incorrect rev share field'));
  }

  this[field] = value;
  this.modified = new Date();

  this.save(function(err, partner) {
    if (err) {
      return callback(new errors.InternalError(err));
    }
    return callback(null, partner);
  });
};

Partner.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Partner', Partner);
};
