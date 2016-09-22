Storj Service Storage Models
============================

[![Build Status](https://img.shields.io/travis/Storj/service-storage-models.svg?style=flat-square)](https://travis-ci.org/Storj/service-storage-models)

Common storage models for various Storj services

```
npm install storj-service-storage-models --save
```

```js
var Storage = require('storj-service-storage-models');
var db = new Storage({
  host: '127.0.0.1',
  port: 27017,
  name: 'storj-bridge-database-name',
  user: null,
  pass: null,
  mongos: false,
  ssl: false
});

db.models.User.findOne({ email: 'gordon@storj.io' }, function(err, user) {
  if (err) {
    console.error(err.message);
  } else {
    console.info(user);
  }
});
```
