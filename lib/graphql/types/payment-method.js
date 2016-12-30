'use strict';

const graphql = require('graphql');

const PaymentMethodType = new graphql.GraphQLObjectType({
  name: 'PaymentMethod',
  fields: {
    merchant: {type: graphql.GraphQLString},
    lastFour: {type: graphql.GraphQLString}
  }
});

module.exports = PaymentMethodType;
