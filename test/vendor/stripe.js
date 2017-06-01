'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

let sandbox;
let testObj, testProp;

beforeEach(() => {
  sandbox = sinon.sandbox.create();
});

afterEach(() => {
  sandbox.restore();
})

describe.only('stripe', () => {
  const stripeStub = () => {
    return {
      numberTest: 1234,
      stringTest: 'string',
      nullTest: null,
      undefinedTest: undefined,
      functionTest: function () {
        return 'functionTest'
      }
    }
  }

  const stripe = proxyquire('../../lib/vendor/stripe', {
    stripe: stripeStub
  });

  console.log('stripe', stripe);

  describe('@constructor', () => {
    it('should setup stripe object', () => {
      expect(stripe).to.be.an('object');
    });
  });

  describe('#get', () => {
    const _stripeStub = stripeStub();
    for(const key in _stripeStub) {
      const value = _stripeStub[key];

      if(typeof value === 'function') {
        it(`should wrap function at key "${key}"`, () => {
          stripe[key]()
          .then((expected) => {
            expect(expected).to.equal(value());
          });
        });
      } else {
        it(`should have key "${key}" and value "${value}"`, () => {
          expect(stripe[key]).to.equal(value);
        });
      }
    }
  });

});
