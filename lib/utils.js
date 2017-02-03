'use strict';

module.exports.isValidEmail = function (email) {
  const tester = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (email.length > 254) {
    return false;
  }

  if (!tester.test(email)) {
    return false;
  }
  return true;
};

module.exports.keysOf = function(obj) {
  return Object.keys(obj).map((key) => obj[key]);
};
