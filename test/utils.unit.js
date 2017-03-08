'use strict';

const { expect } = require('chai');
const vectors = require('./data/email.json');
const utils = require('../lib/utils');

describe('Utils', function() {

  describe('#isValidEmail', function() {

    vectors.valid.forEach(function(e) {
      it('true for ' + e, function() {
        expect(utils.isValidEmail(e)).to.equal(true);
      });
    });

    vectors.invalid.forEach(function(e) {
      it('false for ' + e, function() {
        expect(utils.isValidEmail(e)).to.equal(false);
      });
    });

  });

});
