describe('events', function () {

  var expect = require('expect.js');
  var Happner = require('happner-2');
  var async = require('async');

  var DURATION = 5000;
  var CLIENT_COUNT = 5;
  var MESSAGE_INTERVAL = 1000;

  var startedClients = [];

  this.timeout(DURATION + 15000);

  before('should initialize the clients', function (callback) {

    async.timesSeries(CLIENT_COUNT, function(n, next){

      var client = new Happner.MeshClient();

      client.login({username:'_ADMIN', password:'happn'}).then(function () {

        startedClients.push(client);
        next();

      }).catch(next);

    }, callback);
  });

  it('sets up events on all the clients', function (done) {

    async.eachSeries(startedClients, function(client, next){

      client.event.test.on('/a/test/message/*', function(){
        console.log('received a message');
      }, next);

    }, done);

  });

  it('emits an event every ' + MESSAGE_INTERVAL / 1000 + ' seconds for ' + DURATION / 1000 + ' seconds.', function (done) {

    var messageKey = 0;

    var interval = setInterval(function(){

      startedClients.forEach(function(client){
        messageKey++;
        client.exchange.test.testevent({eventKey:'/a/test/message/' + messageKey}, function(e){
          if (e) console.log('emit event call error:::', e.toString());
        });
      });
    }, MESSAGE_INTERVAL);

    setTimeout(function(){
      clearInterval(interval);
      done();
    }, DURATION);

  });

  after(function (done) {

    if (startedClients.length == 0) return done();

    async.eachSeries(startedClients, function(client, next){

      client.disconnect(next);
    }, done);

  });
});
