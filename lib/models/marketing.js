'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const Mnemonic = require('bitcore-mnemonic');
const errors = require('storj-service-error-types');

const Marketing = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    ref: 'User',
    unique: true
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
  });
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

Marketing.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Marketing', Marketing);
};
