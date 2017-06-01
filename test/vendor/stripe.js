'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

let sandbox;

beforeEach(() => {
  sandbox = sinon.sandbox.create();
});

afterEach(() => {
  sandbox.restore();
})

describe('stripe', () => {
  const stripeStub = () => {
    return {
      numberTest1: 1234,
      stringTest1: 'string',
      nullTest1: null,
      undefinedTest1: undefined,
      functionTest1: function () {
        return 'functionTest'
      },
      objectTest1: {
        numberTest2: 1234,
        stringTest2: 'string',
        nullTest2: null,
        undefinedTest2: undefined,
        functionTest2: function () {
          return 'functionTest'
        },
        objectTest2: {
          numberTest3: 1234,
          stringTest3: 'string',
          nullTest3: null,
          undefinedTest3: undefined,
          functionTest3: function () {
            return 'functionTest'
          }
        }
      }
    }
  }

  const stripe = proxyquire('../../lib/vendor/stripe', {
    stripe: stripeStub
  });

  describe('@constructor', () => {
    it('should setup stripe object', () => {
      expect(stripe).to.be.an('object');
    });
  });

  describe('#get', () => {
    const _stripeStub = stripeStub();
    itBehavesLikeProxiedObject(_stripeStub, stripe);
  });

  function itBehavesLikeProxiedObject (a, b, previousPath='') {
    for(const key in a) {
      const value = a[key];
      const mirrorProp = b[key]

      switch (value === null ? "null" : typeof value) {
        case 'function':
          it(`should wrap function at key "${key}"`, () => {
            mirrorProp().then((expected) => {
              expect(expected).to.equal(value());
            });
          });
          break;

        case 'object':
            describe(`should recurse #get for ${key}`, () => {
              const delimiter = previousPath
                ? '.'
                : ''
              itBehavesLikeProxiedObject(value, mirrorProp, `${previousPath}${delimiter}${key}`);
            });
          break;

        default:
          it(`should have key "${key}" and value "${value}"`, () => {
            expect(b[key]).to.equal(value);
          });
      };
    };
  };

});
