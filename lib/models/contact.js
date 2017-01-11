'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const SchemaOptions = require('../options');

/**
 * Represents a known contact
 * @constructor
 */
var ContactSchema = new mongoose.Schema({
  _id: { // nodeID
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true
  },
  lastSeen: {
    type: Date,
    required: true
  },
  lastTimeout: {
    type: Date,
    required: false
  },
  timeoutRate: {
    type: Number,
    required: false
  },
  responseTime: {
    type: Number,
    required: false
  },
  protocol: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  }
});

ContactSchema.plugin(SchemaOptions);

ContactSchema.index({lastSeen: 1});

ContactSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
    delete ret.id;
  }
});

ContactSchema.virtual('nodeID').get(function() {
  return this._id;
});

/**
 * Creates a contact
 * @param {kad.contacts.AddressPortContact} contact
 * @param {Function} callback
 */
ContactSchema.statics.record = function(contactInfo, callback) {
  let Contact = this;
  let done = callback || function() {};
  let contact = new Contact({
    _id: contactInfo.nodeID,
    protocol: contactInfo.protocol,
    userAgent: contactInfo.userAgent,
    address: contactInfo.address,
    port: contactInfo.port,
    lastSeen: contactInfo.lastSeen
  });

  Contact.findOneAndUpdate({ _id: contactInfo.nodeID }, contact, {
    upsert: true,
    new: true
  }, done);
};

/**
 * Will update the lastTimeout and calculate the timeoutRate based
 * on a 24 hour window of activity.
 */
ContactSchema.methods.recordTimeoutFailure = function() {
  const now = Date.now();
  const window = 86400000; // 24 hours
  const lastTimeoutRate = this.timeoutRate || 0;

  if (this.lastTimeout && this.lastTimeout > this.lastSeen) {
    const offlineTime = now - this.lastTimeout.getTime();
    const timeoutRate = offlineTime / window;

    this.timeoutRate = Math.min(lastTimeoutRate + timeoutRate, 1);

  } else if (this.lastTimeout && this.lastTimeout < this.lastSeen) {
    const onlineTime = this.lastSeen.getTime() - this.lastTimeout.getTime();
    const successRate = onlineTime / window;

    this.timeoutRate = Math.max(lastTimeoutRate - successRate, 0);
  }

  this.lastTimeout = now;

  return this;
};

/**
 * Update the exponential moving average response time
 * for calls to this contact.
 * @param {Number} responseTime - Milliseconds of the response time
 */
ContactSchema.methods.recordResponseTime = function(responseTime) {
  assert(Number.isFinite(responseTime),
         'responseTime is expected to be a finite number');

  // The number of requests used in calculating the moving average
  const p = 1000;

  // Contacts without response times start with untrusted 10 seconds
  // (timeout period) and can build improved times with each response.
  const lastResponseTime = this.responseTime || 10000;

  // Calculate the exponential moving average
  const k = 2 / (p + 1);
  const newResponseTime = responseTime * k + lastResponseTime * (1 - k);

  this.responseTime = newResponseTime;

  return this;
};

/**
 * Returns the last N recently seen contacts
 * @param {kad.contacts.AddressPortContact} contact
 * @param {Function} callback
 */
ContactSchema.statics.recall = function(num, callback) {
  this.find({}).limit(num).sort({ lastSeen: -1 }).exec(callback);
};

module.exports = function(connection) {
  return connection.model('Contact', ContactSchema);
};
