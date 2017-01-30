'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const Mnemonic = require('bitcore-mnemonic');

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
  },
  invitesSent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invite'
  }]
});

Marketing.statics.create = function(email, callback) {
  var Marketing = this;
  // generate unique referral link
  const referralLink = Marketing._genReferralLink();
  // need to check creationSource...
  // save to Marketing
  const marketing = new Marketing({
    user: userEmail
  })

  // add to Marketing object if unique

  // if it exists, then generate new mnemonic and check again
  // actually no. we just need to create the marketing doc.

  // invites is what we need to create
  //


}

/**
 * Generates a unique referral link for marketing object
 * Example: 'boring-crypt-123'
 * @returns {string}
 */
Marketing.statics._genReferralLink = function() {
  var Marketing = this;

  const wordString = new Mnemonic().toString().split(' ');
  const randomNum = Math.round(Math.random() * 1000);
  const referralLink = `${wordString[index()]}-${wordString[index()]}-${randomNum}`;

  Marketing.find({ referralLink }, function(err, marketing) {
    if (!marketing) {
      return referralLink;
    }
    return Marketing._genReferralLink();
  });

  function index() {
    return Marketing._genRandomInt(0, 12);
  }
};

Marketing.methods._genRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min));
};

Marketing.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Marketing', Marketing);
}
