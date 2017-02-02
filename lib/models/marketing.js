'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const { REFERRAL_TYPES } = require('../constants');
const Mnemonic = require('bitcore-mnemonic');
const Referral = require('./referral');
const errors = require('storj-service-error-types');

const Marketing = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    ref: 'User'
  },
  created: {
    type: Date,
    default: Date.now
  },
  link: {
    type: String,
    unique: true,
    index: true
  }
});

Marketing.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
  }
});

/**
 * Generates a unique referral link for marketing object
 * Example: 'boring-crypt-123'
 * @returns {string}
 */
Marketing.statics._genLink = function() {
  const string = new Mnemonic().toString().split(' ');
  const randNum = Math.round(Math.random() * 1000);
  const randInt = function randInt() {
    const min = 0;
    const max = 12;
    return Math.floor(Math.random() * (max - min));
  };
  const link = `${string[randInt()]}-${string[randInt()]}-${randNum}`;

  return link;
};

Marketing.statics._verifyNonDupLink = function(link, callback) {
  const Marketing = this;

  Marketing.findOne({ link }, function(err, marketing) {
    if (err) {
      return callback(new errors.InternalError(err));
    }

    if (marketing) {
      return callback(new errors.InternalError('Duplicate link'));
    }

    return callback(null, link);
  })
};

Marketing.statics._genAndVerify = function(callback) {
  const Marketing = this;
  const link = Marketing._genLink();

  Marketing._verifyNonDupLink(link, function(err, link) {
    if (err && err.message === 'Duplicate link') {
      Marketing._genAndVerify();
    }

    if (err) {
      return callback(err);
    }

    return callback(null, link);
  });
};

/**
 * Creates a new marketing document with unique referral link
 * @params {string} email - user email
 * @params {callback}
 */
Marketing.statics.create = function(email, callback) {
  const Marketing = this;

  Marketing._genAndVerify(function(err, link) {
    if (err) {
      return callback(err);
    }

    const marketing = new Marketing({
      user: email,
      link
    });

    marketing.save()
      .then((marketing) => callback(null, marketing))
      .catch((err) => callback(err));
  });
};

/**
 * Validates link and issues credit to new user
 * @param {string} link - referral link
 * @param {string} email - new user email
 */
Marketing.statics.linkReferralToUser = function(link, email) {
  var Marketing = this;

  return new Promise((resolve, reject) => {
    // check for valid link
    Marketing.findOne({ link }).then((marketing) => {
      if (!marketing) {
        return resolve(false);
      }

      Referral.findOne({ recipient: { id: email }}).then((referral) => {
        // If a Referral does not exist, but this method is being called, then
        // the link was shared (but not via email) and clicked on
        if (!referral) {
          // we have the marketing doc based on referral link and can link
          // it to the user now
          Referral.create(marketing._id, email, REFERRAL_TYPES.LINK)
            .then((referral) => referral.convert_signup())
            .then((referral) => resolve(referral.issueRecipientCredit()))
            .catch((err) => reject(err))
        }
        // if the referral exists, go ahead and issue credit and convert
        referral.convert()
          .then((referral) => referral.issueRecipientCredit())
          .then((referral) => resolve(referral));
      })
    })
    .catch((err) => reject(err))
  });
};

Marketing.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Marketing', Marketing);
};
