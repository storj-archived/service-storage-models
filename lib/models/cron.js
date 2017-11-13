'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const errors = require('storj-service-error-types');

const CronJob = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  locked: {
    type: Boolean,
    default: false
    required: true
  },
  started: {
    type: Date,
    default: Date.now,
    required: true
  },
  finished: {
    type: Date,
    default: Date.now,
    required: true
  },
  data: {
    type: String,
    required: false
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

module.exports = function(connection) {
  return connection.model('CronJob', CronJob);
};
