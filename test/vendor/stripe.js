'use strict';

const expect = require('chai').expect;
const Stripe = require('../../lib/vendor/stripe');
const stripeKey = 'sk_stripekey';
const proxyConfig = {};
const _stripe = Stripe(stripeKey, proxyConfig);

describe('Stripe', () => {
  describe('@constructor', () => {
    it.only('should setup stripe proxy', (done) => {
      console.log(_proxy);
      expect(_stripe).to.be.instanceOf('Proxy');
    });

    it('should take a proxy config object', () => {

    });
  });

  describe('#get', () => {
    it('should return new Proxy', () => {

    });

    it('should return new Promise', () => {

    });

    it('should return default value', () => {

    });
  });
});
