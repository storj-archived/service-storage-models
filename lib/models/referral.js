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
      type: mongoose.Schema.Types.ObjectId,
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
      default: REFERRAL_AMOUNTS.RECIPIENT_DEFAULT,
      min: 0
    },
    credit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Credit'
    },
    min_billed_requirement: {
      type: Number,
      default: REFERRAL_AMOUNTS.MIN_BILLED_REQUIREMENT_DEFAULT,
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

Referral.set('toObject', {
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
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

Referral.methods.storeCreditId = function(user, creditId) {
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
Referral.methods.convert_signup = function() {
  const referral = this;

  return new Promise((resolve, reject) => {
    referral.converted.recipient_signup = new Date();
    referral.save()
      .then((referral) => resolve(referral))
      .catch((err) => reject(err));
  });
};

Referral.methods.convert_billed = function() {
  const referral = this;

  return new Promise((resolve, reject) => {
    referral.converted.recipient_billed = new Date();
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
