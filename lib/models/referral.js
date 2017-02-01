'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const errors = require('storj-service-error-types');
const {
  REFERRAL_AMOUNTS,
  PROMO_CODE,
  CREDIT_TYPES,
  REFERRAL_TYPES
} = require('../constants');
const Credit = ('./credit');

const Referral = new mongoose.Schema({
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId
      ref: 'Marketing',
      required: true,
      index: true
    },
    amount_to_credit: {
      type: Number,
      default: REFERRAL_AMOUNTS.SENDER_DEFAULT,
      min: 0
    },
    credit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Credit'
    }
  },
  recipient: {
    id: {
      type: mongoose.SchemaTypes.Email,
      required: true,
      index: true
    },
    amount_to_credit: {
      type: Number,
      default: REFERALL_AMOUNTS.RECIPIENT_DEFAULT,
      min: 0
    },
    credit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Credit'
    },
    min_billed_requirement: {
      type: Number,
      default: REFERALL_AMOUNTS.MIN_BILLED_DEFAULT,
      min: 0
    }
  },
  created: {
    type: Date,
    default: Date.now
  },
  // refers to recipient has met min_billed_requirement and both sender
  // and recipient have received credits
  converted: {
    recipient_signup: {
      type: Date
    },
    recipient_billed: {
      type: Date
    }
  },
  type: {
    type: String,
    enum: Object.keys(REFERRAL_TYPES).map((key) => REFERRAL_TYPES[key]),
  }
});

/**
 * Creates new referral doc
 * @param {string} sender - marketing id
 * @param {string} recipient - recipient email
 */
Referral.statics.create = function(sender, recipient, type) {
  var Referral = this;

  return new Promise((resolve, reject) => {
    var referral = new Referral({
      sender: {
        id: sender
      },
      recipient: {
        id: recipient
      },
      type
    });

    referral.save()
      .then((referral) => resolve(referral))
      .catch((err) => reject(new errors.InternalError()));
  });
};

/**
 * Issues a new credit for user ('sender' or 'recipient')
 * @param {string} user - must be 'sender' or 'recipient'
 */
Referral.methods.issueCredit = function(user) {
  const referral = this;

  return new Promise((resolve, reject) => {
    if (referral[user].credit) {
      return reject(new errors.BadRequest(
        `${referral[user].id} has already received a referral credit`
      ));
    }
    referral._createCredit('recipient')
      .then((id) => referral._setCredit(id))
      .then((referral) => resolve(referral))
      .catch((err) => reject(new errors.InternalErr(err)));
  });
}

Referral.methods._createCredit = function(user) {
  const referral = this;

  return new Promise((resolve, reject) => {
    const credit = new Credit({
      user,
      promo_code: PROMO_CODE.REFERRAL,
      promo_amount: referral[user].amount_to_credit,
      type: CREDIT_TYPES.AUTO
    });

    credit.save()
      .then((credit) => resolve(credit._id))
      .catch((err) => reject(err));
  });
};

Referral.methods._setCredit = function(user, creditId) {
  const referral = this;

  return new Promise((resolve, reject) => {
    referral[user].credit = creditId;
    referral.save()
      .then((referral) => resolve(referral))
      .catch((err) => reject(err));
  });
};

/**
 * Indicate that a recipient of the referral has signed up to be a user
 */
Referral.methods.convert = function() {
  const referral = this;
  return new Promise((resolve, reject) => {
    referral.converted = new Date();
    referral.save()
      .then((referral) => resolve(referral))
      .catch((err) => reject(err));
  });
};

Referral.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Referral', Referral);
};
