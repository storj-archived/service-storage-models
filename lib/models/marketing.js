'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const randomWord = require('random-word');
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
  const num = Math.round(Math.random() * 1000);
  const numLength = num.toString().length;
  const numToUse = numLength <= 2 ? parseInt(`${num.toString()}0`) : num;
  const referralLink = `${randomWord()}-${randomWord()}-${numToUse}`;

  return referralLink;
};

/**
 * Verifies referralLink does not already exist in db
 * @param {string} referralLink - generated referralLink
 * @param {Function} callback
 * @private
 */
Marketing.statics._verifyReferralLink = function(referralLink, callback) {
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

  Marketing._verifyReferralLink(referralLink, function(err, referralLink) {
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

  Marketing.findOne({ user: email }, function(err, marketing) {
    if (marketing) {
      return callback(new errors.BadRequestError(
        `Marketing doc already exists for user ${email}`
      ));
    }

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
  });
};

/**
 * Verifies referral link is valid. Promisified to match bridge-gui style
 * @param {string} referralLink
 */
Marketing.statics.isValidReferralLink = function(referralLink) {
  const Marketing = this;

  return new Promise((resolve, reject) => {
    Marketing.findOne({ referralLink }, function(err, marketing) {
      if (err) {
        return reject(new errors.InternalError(err));
      }

      if (!marketing) {
        return reject(new errors.BadRequestError('Invalid referral link'));
      }

      return resolve(marketing);
    });
  });
};

Marketing.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Marketing', Marketing);
};
