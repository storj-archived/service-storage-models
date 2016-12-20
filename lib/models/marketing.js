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

Marketing.statics.create = function(user, callback) {
  // generate unique referral link
  const referralLink = this._genReferralLink();

  // save to Marketing
  const marketing = new Marketin

  // add to Marketing object if unique

  // if it exists, then generate new mnemonic and check again

  //


}

Marketing.methods._genReferralLink = function() {
  const wordString = new Mnemonic().toString().split(' ');
  const randomNum = Math.round(Math.random() * 1000);
  const referralLink = `${wordString[index()]}-${wordString[index()]}-${randomNum}`;

  Marketing.find({ referralLink }, function(err, marketing) {
    if (marketing) {
      return this._genReferralLink();
    }
    return referralLink;
  });

  function index() {
    return this._genRandomInt(0, 12);
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
