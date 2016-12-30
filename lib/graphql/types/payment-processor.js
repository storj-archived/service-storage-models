'use strict';

const graphql = require('graphql');
const paymentProcessorEnum = require('./payment-processor-enum');
const PaymentMethodType = require('../types/payment-method');

const paymentProcessorType = new graphql.GraphQLObjectType({
  name: 'PaymentProcessor',
  fields: {
    id: {type: graphql.GraphQLString},
    name: {type: paymentProcessorEnum},
    defaultPaymentMethod: {type: PaymentMethodType},
    billingDate: {type: graphql.GraphQLInt},
    error: {type: graphql.GraphQLString}
  },
  args: {
    id: {name: 'id', type: graphql.GraphQLString}
  }
});

module.exports = paymentProcessorType;
