'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');

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

Partner.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Partner', Partner);
};
