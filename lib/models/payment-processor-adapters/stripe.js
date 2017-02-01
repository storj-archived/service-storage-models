'use strict';

const stripe = require('../../vendor/stripe');
const constants = require('../../constants');
const STRIPE_PLAN_ID = constants.STRIPE_PLAN_ID;

let stripeProcessor;

const stripeAdapter = {
  /**
   * setData - format `rawData` in terms of the
   * `User#PaymentProcessors[n]#data` array
   * @param rawData {Object}:
   *   + customer {Object}: stripe customer object
   *   (used to determine the billing cycle for the subscription)
   * @return {Array}
   */
  serializeData: function(data) {
    return [data];
  },

  /**
   * setData - format `rawData` in terms of the
   * `User#PaymentProcessors[n]#data` array
   * @param rawData {array}
   * @return {Object}
   */
  parseData: function() {
    const rawData = stripeProcessor.rawData;

    if (!rawData[0]) {
      stripeProcessor.rawData = [{}];
    }

    return rawData[0];
  },
  /**
   * register - use stripe api to create customer
   * @param token {String}: credit card token returned from stripe api
   * (see https://stripe.com/docs/subscriptions/tutorial)
   * @param email {String}: email of user create customer for
   * @return {Promise}
   */
  register: function(token, email) {
    return new Promise((resolve, reject) => {
      stripe.customers.create({
        source: token,
        plan: STRIPE_PLAN_ID,
        email: email
      }, (err, customer) => {
        if (err) {
          return reject(new Error(err));
        }

        return resolve({
          customer: customer,
          billingDate: (new Date()).getDate()
        });
      });
    });
  },
  /**
   * delete - delete stripe customer
   * @param options {Object}:
   * @return {Promise}: resolves/rejects with an object with `status`
   * and `message` properties
   */
  delete: function() {
    throw new Error("Not implemented");
  },
  /**
   * cancel - cancel stripe subscription
   * @return {Promise}
   */
  cancel: function() {
    return new Promise((resolve, reject) => {
      const stripeCustomer = stripeProcessor.data.customer;
      const subscriptionId = stripeCustomer.subscriptions.data[0].id;
      stripe.subscriptions.del(subscriptionId, (err, cancelledSubscription) => {
        if (err) {
          return reject(new Error(err));
        }

        if (cancelledSubscription.status !== 'cancelled') {
          return reject(new Error(
              'stripe couldn\'t cancel the subscription: ' + subscriptionId
          ));
        }

        return resolve();
      });
    });
  },
  /**
   * isSubscribed - returns true if the user has a subscription to
   * the stripe plan with id of `STRIPE_PLAN_ID`
   * @return {Boolean}
   */
  validate: function() {
    try {
      const subscriptions = stripeProcessor.data.customer.subscriptions;

      if (subscriptions.length > 1) {
        let msg = 'Customer has more than one stripe subscription!';
        return Promise.reject(new Error(msg));
      }

      if (subscriptions.length < 1) {
        return Promise.resolve(false);
      }

      if (subscriptions.data[0].plan.id !== STRIPE_PLAN_ID) {
        let msg = 'Customer is subscribed to unknown plan!';
        return Promise.reject(new Error(msg));
      }
    } catch (err) {
      console.error(`Error encountered while reading stripeProcessor.data.customer.subscriptions:\n${err}`);
      return Promise.resolve(true);
    }

    return Promise.resolve(true);
  },
  /**
   * addPaymentMethod - add a credit card to the user's stripe customer
   * @param token {String}: stripe credit card token (created via front-end api call)
   * @return {Promise}: resolves/rejects with an object with `status`
   * and `message` properties
   */
  addPaymentMethod: function(token) {
    const customerId = stripeProcessor.data.customer.id;

    return new Promise((resolve, reject) => {
      stripe.customers.createSource(
        customerId,
        { source: token },
        function(err) {
          if (err) {
            return reject(err);
          }

          // retrieve customer
          stripe.customers.retrieve(customerId, function(err, customer) {
            stripeProcessor.data.customer = customer;
            return stripeProcessor.save()
                .then(resolve);
          });

        }
      );
    });
  },
  /**
   * removePaymentMethod - remove a credit card from the user's stripe customer
   * @param cardId {String}: stripe card id (eg. `card_123`)
   * @return {Promise}: resolves/rejects null or error respectively
   * and `message` properties
   */
  removePaymentMethod: function(cardId) {
    const customerId = stripeProcessor.data.customer.id;

    return new Promise((resolve, reject) => {
      stripe.customers.deleteCard(
        customerId,
        cardId,
        function(err, confirmation) {
          if (err) {
            console.error('Error deleting card from stripe:');
            console.error(err);
          }

          stripe.customers.retrieve(customerId, (err, customer) => {
            if (err) {
              console.error('THERE WAS AN ERROR!!!');
              console.error(err);
            }

            if (err) return reject(err);
            stripeProcessor.data.customer = customer;

            return stripeProcessor.save()
                .then(resolve);
          })
        }
      );
    });
  },
  /**
   * charge - add an inventory item to the subscription's current
   * billing cycle
   * (see https://stripe.com/docs/subscriptions/guide#adding-invoice-items)
   * @param options {Object}:
   *   + data {String}: stripe credit card token
   *     (see https://stripe.com/docs/subscriptions/tutorial)
   *   + user {User}: the current `User` instance for the request
   * @return {Promise}
   */
  charge: function() {
    throw new Error('stripe charge method not yet implemented');
  },
  defaultPaymentMethod: function() {
    try {
      const source = stripeProcessor.data.customer.sources.data[0];
      return {
        id: source.id,
        merchant: source.brand,
        lastFour: source.last4
      };
    } catch (err) {
      return null;
    }
  },
  billingDate: function() {
    return stripeProcessor.data.billingDate;
  },

  paymentMethods: function() {
    // TODO: better error handling in case structure isn't as expected
    return !!stripeProcessor.data && !!stripeProcessor.data.customer ?
        stripeProcessor.data.customer.sources.data : []
  }
};

module.exports = function(paymentProcessor) {
  stripeProcessor = paymentProcessor;
  return stripeAdapter;
};
