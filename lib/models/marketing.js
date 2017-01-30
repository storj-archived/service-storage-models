'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const Mnemonic = require('bitcore-mnemonic');
const Invite = require('./invite');
const errors = require('storj-service-error-types');

const Marketing = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  created: {
    type: Date,
    default: Date.now
  },
  referralLink: {
    type: String,
    unique: true,
    index: true
  }
});

/**
 * Generates a unique referral link for marketing object
 * Example: 'boring-crypt-123'
 * @returns {string}
 */
Marketing.statics._genReferralLink = function() {
  var Marketing = this;

  return new Promise((resolve, reject) => {
    const wordString = new Mnemonic().toString().split(' ');
    const randomInt = function randomInt() {
      const min = 0;
      const max = 12;
      return Math.floor(Math.random() * (max - min));
    };
    const referralLink = `${wordString[randomInt()]}-${wordString[randomInt()]}-${randomNum}`; // jshint ignore:line

    // Check to make sure this is unique in DB; generate again if not
    Marketing.find({ referralLink }, function(err, marketing) {
      if (err) {
        return reject(err);
      }

      if (!marketing) {
        return referralLink;
      }
      return Marketing._genReferralLink();
    });
  });
};

/**
 * Creates a new marketing document with unique referral link
 * @params {string} email - user email
 */
Marketing.statics.create = function(email) {
  var Marketing = this;

  return new Promise((resolve, reject) => {
    Marketing
      ._genReferralLink()
      .then((referralLink) => {
        const marketing = new Marketing({
          user: email
        });

        marketing
          .save()
          .then((marketing) => resolve(marketing))
          .catch((err) => reject(new errors.InternalError()));
      })
      .catch((err) => reject(err));
  });
};


Marketing.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Marketing', Marketing);
}
