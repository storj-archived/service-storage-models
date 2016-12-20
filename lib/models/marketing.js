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

  //  If a user changes emails...?
  // aliases: [{
  //   type: String
  // }],

  created: {
    type: Date,
    default: Date.now
  },

  creationSource: {
    type: String,
    enum: Object.keys(CREATION_SOURCES).map((key) => (CREATION_SOURCES[key])),
    required: true
  },

  referralLink: {
    type: String,
    unique: true,
    index: true
  },

  sentInvites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invite'
  }]

})

Marketing.statics.create = function(userEmail, callback) {
  var self = this;
  // generate unique referral link
  const referralLink = self._genReferralLink();
  // how to check for creationSource? If user comes from website, what are t
  // save to Marketing
  const marketing = new self({
    user: userEmail,
    creationSource:
  })

  // add to Marketing object if unique

  // if it exists, then generate new mnemonic and check again

  //


}

/**
 * Generates a unique referral link for marketing object
 * Example: 'boring-crypt-123'
 */
Marketing.methods._genReferralLink = function() {
  var self = this;

  const wordString = new Mnemonic().toString().split(' ');
  const randomNum = Math.round(Math.random() * 1000);
  const referralLink = `${wordString[index()]}-${wordString[index()]}-${randomNum}`;

  self.find({ referralLink }, function(err, marketing) {
    if (!marketing) {
      return referralLink;
    }
    return self._genReferralLink();
  });

  function index() {
    return self._genRandomInt(0, 12);
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
