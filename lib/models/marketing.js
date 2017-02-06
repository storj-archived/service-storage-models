'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const Mnemonic = require('bitcore-mnemonic');
const errors = require('storj-service-error-types');

const Marketing = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true,
    unique: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  referralLink: {
    type: String,
    required: true,
    unique: true,
    index: true
  }
});

Marketing.set('toObject', {
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
  }
});

/**
 * Generates a unique referralLink for marketing object
 * Example: 'boring-crypt-123'
 * @returns {string}
 * @private
 */
Marketing.statics._genReferralLink = function() {
  const string = new Mnemonic().toString().split(' ');
  const randNum = Math.round(Math.random() * 1000);
  const randInt = function randInt() {
    const min = 0;
    const max = 12;
    return Math.floor(Math.random() * (max - min));
  };
  const referralLink = `${string[randInt()]}-${string[randInt()]}-${randNum}`;

  return referralLink;
};

/**
 * Verifies referralLink does not already exist in db
 * @param {string} referralLink - generated referralLink
 * @param {Function} callback
 * @private
 */
Marketing.statics._verifyNonDupReferralLink = function(referralLink, callback) {
  const Marketing = this;

  Marketing.findOne({ referralLink }, function(err, marketing) {
    if (err) {
      return callback(new errors.InternalError(err));
    }

    if (marketing) {
      return callback(new errors.InternalError('Duplicate referral link'));
    }

    return callback(null, referralLink);
  });
};

/**
 * Generates and verifies that referralLink is unique
 * @param {Function} callback
 * @private
 */
Marketing.statics._genAndVerify = function(callback) {
  const Marketing = this;
  const referralLink = Marketing._genReferralLink();

  Marketing._verifyNonDupReferralLink(referralLink, function(err, referralLink) {
    if (err && err.message === 'Duplicate referralLink') {
      Marketing._genAndVerify();
    }

    if (err) {
      return callback(err);
    }

    return callback(null, referralLink);
  });
};

/**
 * Creates a new marketing document with unique referral link
 * @params {string} email - user email
 * @params {Function} callback
 */
Marketing.statics.create = function(email, callback) {
  const Marketing = this;

  Marketing._genAndVerify(function(err, referralLink) {
    if (err) {
      return callback(err);
    }

    const marketing = new Marketing({
      user: email,
      referralLink
    });

    marketing.save()
      .then((marketing) => callback(null, marketing))
      .catch((err) => callback(err));
  });
};

Marketing.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Marketing', Marketing);
};
