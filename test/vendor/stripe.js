'use strict';

const expect = require('chai').expect;
const stripe = require('../../lib/vendor/stripe');

let testObj, testProp;

describe('stripe', () => {
  describe('@constructor', () => {
    it('should setup stripe object', () => {
      expect(stripe).to.be.an('object');
    });
  });

  describe('#get', () => {
    it.only('should return new object', () => {
      
    });

    it('should return new Promise', () => {

    });

    it('should return default value', () => {

    });
  });
});
