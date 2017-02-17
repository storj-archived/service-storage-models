'use strict';

const mongoose = require('mongoose');
const errors = require('storj-service-error-types');
const SchemaOptions = require('../options');
const {
  PROMO_AMOUNT,
  REFERRAL_TYPES
} = require('../constants');
const { isValidEmail } = require('../utils');
const _ = require('lodash');
const assert = require('assert');

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
      default: PROMO_AMOUNT.REFERRAL_SENDER,
      min: 0
    },
    // issued credit as a result of recipient being billed minimum requirement
    credit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Credit'
    },
    referralLink: {
      type: String,
      required: true,
      index: true
    }
  },
  recipient: {
    email: {
      type: String,
      required: true,
      index: true
    },
    amount_to_credit: {
      type: Number,
      default: PROMO_AMOUNT.REFERRAL_RECIPIENT,
      min: 0
    },
    credit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Credit'
    },
    min_spent_requirement: {
      type: Number,
      default: PROMO_AMOUNT.MIN_SPENT_REQUIREMENT,
      min: 0
    }
  },
  created: {
    type: Date,
    default: Date.now
  },
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
  },
  // keeps track of how many times a person has sent the referral to someone
  count: {
    type: Number,
    default: 1
  }
});

Referral.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    delete ret._id;
  }
});


// sender.credit checks
Referral.pre('save', function(next) {
  if (this.sender.credit) {
    try {
      assert(this.converted.recipient_billed instanceof Date);
    } catch(err) {
      return next(new errors.BadRequestError(
        'converted.recipient_billed must exist with sender.credit'
      ));
    }
    return next();
  }

  next();
});

// converted.recipient_billed checks
Referral.pre('save', function(next) {
  if (this.converted.recipient_billed) {
    try {
      assert(this.converted.recipient_billed instanceof Date);
      assert(this.converted.recipient_signup instanceof Date);
      assert(this.recipient.credit);
      assert(this.sender.credit);
      assert(this.recipient.credit !== this.sender.credit);
    } catch(err) {
      return next(new errors.InternalError(
        'Error validating referral doc - converted dates and credits'
      ));
    }
    return next();
  }

  next();
});

// NB: Methods promisified to match use of Promises in bridge-gui

/**
 * Creates new referral doc
 * @param {object} marketing - marketing id
 * @param {string} recipientEmail - recipient email
 * @param {string} type - type of referral ('link' or 'email')
 */
Referral.statics.create = function(marketing, recipientEmail, type) {
  var Referral = this;

  return new Promise((resolve, reject) => {

    if (!isValidEmail(recipientEmail)) {
      return reject(new errors.BadRequestError('Invalid email'));
    }

    if (!marketing) {
      return reject(new errors.BadRequestError('Invalid marketing doc'));
    }

    Referral.findOne({
      'sender.id': marketing._id,
      'recipient.email': recipientEmail
    }).then((referral) => {
      if (referral) {
        referral.count += referral.count;
        return referral.save()
          .then((referral) => resolve(referral))
          .catch((err) => reject(err));
      }

      const newReferral = new Referral({
        sender: {
          id: marketing._id,
          referralLink: marketing.referralLink
        },
        recipient: {
          email: recipientEmail
        },
        type
      });

      newReferral.save()
        .then((referral) => resolve(referral))
        .catch((err) => reject(err));
    })
    .catch((err) => reject(err));

  });
};

/**
 * Records when a recipient of the referral has signed up to be a user
 * (conversion step 1 of 2)
 */
Referral.methods.convert_recipient_signup = function(credit) {
  const referral = this;

  return new Promise((resolve, reject) => {

    if (!credit || _.isEmpty(credit)) {
      return reject(new errors.BadRequestError('Must pass in valid credit'));
    }

    referral.converted.recipient_signup = credit.created;
    referral.recipient.credit = credit._id;

    referral.save()
      .then((referral) => resolve(referral))
      .catch((err) => reject(new errors.InternalError(err)));
  });
};

Referral.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

module.exports = function(connection) {
  return connection.model('Referral', Referral);
};
