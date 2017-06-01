'use strict';

const _stripe = require('stripe');
const queue = require('async').queue;
const stripeQueue = queue(({ obj, prop, args }, resolveCb) => {
  resolveCb(obj[prop].apply(obj, args));
}, 1);

const proxyConfig = {
  get: (obj, prop) => {
    if (prop in obj) {
      const value = obj[prop];

      switch (value === null ? 'null' : typeof(value)) {
        case 'object':
          return new Proxy(obj[prop], proxyConfig);

        case 'function':
          return function() {
            const args = [].slice.apply(arguments);
            return new Promise((resolve) => {
              stripeQueue.push({ obj, prop, args }, resolve);
            });
          };

        default:
          return value;
      }
    }
  }
};

const stripe = new Proxy(_stripe(process.env.STRIPE_KEY), proxyConfig);
module.exports = stripe;
