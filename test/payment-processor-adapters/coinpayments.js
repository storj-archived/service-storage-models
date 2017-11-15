'use strict';

const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const libPath = '../../lib/models/payment-processor-adapters/coinpayments';


describe('Storage/models/PaymentProcessor/coinpayments', function () {

  describe('#addPaymentMethod', function () {
    it('it should push data', function (done) {
      const data = {
        address: '0x703faaa2f42291e0aaa9ffdbd74ae81172895bc7'
      };
      const Adapter = proxyquire(libPath, {
        '../../vendor/coinpayments': {
          getCallbackAddress: sinon.stub().callsArgWith(1, null, data)
        }
      });
      const paymentProcessor = {
        data: [],
        save: sinon.stub().returns(new Promise((resolve) => {
          resolve();
        }))
      };
      const adapter = Adapter(paymentProcessor);

      const token = 'token';
      adapter.addPaymentMethod(token).then(() => {
        expect(paymentProcessor.data.length).to.equal(1);
        expect(paymentProcessor.data[0]).to.eql({
          token: 'token',
          address: data.address
        });
        done();
      });
    });
    it('it should handle error from save', function (done) {
      const data = {
        address: '0x703faaa2f42291e0aaa9ffdbd74ae81172895bc7'
      };
      const Adapter = proxyquire(libPath, {
        '../../vendor/coinpayments': {
          getCallbackAddress: sinon.stub().callsArgWith(1, null, data)
        }
      });
      const paymentProcessor = {
        data: [],
        save: sinon.stub().returns(new Promise((resolve, reject) => {
          reject(new Error('test'));
        }))
      };
      const adapter = Adapter(paymentProcessor);

      const token = 'token';
      adapter.addPaymentMethod(token).catch((err) => {
        expect(err.message).to.equal('test');
        done();
      });
    });
  });

  describe('#removePaymentMethod', function () {
    it('it should remove address', function (done) {
      const data = {
        address: '0x703faaa2f42291e0aaa9ffdbd74ae81172895bc7'
      };
      const Adapter = proxyquire(libPath, {
        '../../vendor/coinpayments': {
          getCallbackAddress: sinon.stub().callsArgWith(1, null, data)
        }
      });
      const paymentProcessor = {
        data: [{
          address: '0xaaf71b381afd506107f17ed11d0fc793b2283fe7',
          token: 'token2'
        }, {
          address: '0x2266e1d04bc51c72c682549c7f6c216883458362',
          token: 'token3'
        }],
        save: sinon.stub().returns(new Promise((resolve) => {
          resolve();
        }))
      };
      const adapter = Adapter(paymentProcessor);
      const token = 'token';

      adapter.addPaymentMethod(token).then(() => {
        expect(paymentProcessor.data.length).to.equal(3);
        adapter.removePaymentMethod(data.address).then(() => {
          expect(paymentProcessor.data.length).to.equal(2);
          done();
        });
      });
    });
    it('it should handle error from save', function (done) {
      const data = {
        address: '0x703faaa2f42291e0aaa9ffdbd74ae81172895bc7'
      };
      const Adapter = proxyquire(libPath, {
        '../../vendor/coinpayments': {
          getCallbackAddress: sinon.stub().callsArgWith(1, null, data)
        }
      });
      const paymentProcessor = {
        data: [],
        save: sinon.stub().returns(new Promise((resolve) => {
          resolve();
        }))
      };
      paymentProcessor.save.onSecondCall()
        .returns(new Promise((resolve, reject) => {
          reject(new Error('test'));
        }));
      const adapter = Adapter(paymentProcessor);
      const token = 'token';

      adapter.addPaymentMethod(token).then(() => {
        expect(paymentProcessor.data.length).to.equal(1);
        expect(paymentProcessor.data[0]).to.eql({
          token: 'token',
          address: data.address
        });
        adapter.removePaymentMethod(data.address).catch((err) => {
          expect(err.message).to.equal('test');
          done();
        });
      });
    });
  });

});
