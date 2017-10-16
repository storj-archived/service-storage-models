'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const errors = require('storj-service-error-types');
const SchemaOptions = require('../options');

const constants = require('../constants');

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
  reputation: {
    type: Number,
    required: false
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
  lastContractSent: {
    type: Number,
    required: false
  },
  spaceAvailable: {
    type: Boolean,
    required: false
  },
  protocol: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: false
  }
});

ContactSchema.plugin(SchemaOptions);

ContactSchema.index({lastSeen: 1});
ContactSchema.index({responseTime:1,spaceAvailable:1,_id:-1});
ContactSchema.index({reputation:1});
ContactSchema.index({address:1});

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

  if (!contactInfo || !contactInfo.address) {
    return callback(new errors.BadRequestError(
      'Address is expected for contact'));
  }

  let contact = new Contact({
    _id: contactInfo.nodeID,
    protocol: contactInfo.protocol,
    userAgent: contactInfo.userAgent,
    address: contactInfo.address,
    port: contactInfo.port,
    lastSeen: contactInfo.lastSeen,
    spaceAvailable: contactInfo.spaceAvailable
  });

  if (contactInfo && contactInfo.responseTime) {
    contact.responseTime = contactInfo.responseTime;
  }

  Contact.findOneAndUpdate({ _id: contactInfo.nodeID }, contact, {
    upsert: true,
    new: true
  }, done);
};

/**
 * Will update the contact success rate based on a points system. Different
 * behaviors can have different weights. For example a successful response
 * to an ALLOC message could be worth 1 point. A successful transfer of a file
 * could be worth 1 to 10 points depending on the size of the file transfer.
 * A successful retrieval of a download pointer could also be worth 1 point.
 * Failure to respond to any of these requests would contribute negative values
 * to the rate of the same values. There will be a minimum and maximum value
 * that can be achieved to act as a "window" and the rating can respond quickly
 * to changes in behavior.
 * @param {Number} points - Positive or negative number with reputation points
 */
ContactSchema.methods.recordPoints = function(points) {
  assert(Number.isInteger(points), 'Points is expected to be an integer');
  let currentPoints = this.reputation || 0;
  let newPoints = currentPoints + points;
  if (newPoints >= constants.MAX_REPUTATION_POINTS) {
    newPoints = constants.MAX_REPUTATION_POINTS;
  } else if (newPoints <= constants.MIN_REPUTATION_POINTS) {
    newPoints = constants.MIN_REPUTATION_POINTS;
  }
  this.reputation = newPoints;

  return this;
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

ContactSchema.statics.updateLastContractSent = function(id, callback) {
  this.update({ _id: id}, { $set: { lastContractSent: Date.now() } }, callback);
};

module.exports = function(connection) {
  return connection.model('Contact', ContactSchema);
};
