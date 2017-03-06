'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

const utils = require('../lib/utils');

describe('Utils', function() {

  describe('#isValidObjectId', function() {
    it('false for non 12 byte hex', function() {
      expect(utils.isValidObjectId('936389d173e710d3fcfb66')).to.equal(false);
    });

    it('false for 12 byte non-hex', function() {
      expect(utils.isValidObjectId('rxxPuB1N3vTd2kiJ')).to.equal(false);
    });

    it('false for 24 character non-hex', function() {
      expect(utils.isValidObjectId('1z\z78z1}b1fz59d+3z98a08')).to.equal(false);
    });    

    it('true for 12 byte hex (lowercase)', function() {
      expect(utils.isValidObjectId('1ec962a040f104d74902f39f')).to.equal(true);
    });

    it('true for 12 byte hex (uppercase)', function() {
      expect(utils.isValidObjectId('1EC962A040F104D74902F39F')).to.equal(true);      
    });
  });

});
