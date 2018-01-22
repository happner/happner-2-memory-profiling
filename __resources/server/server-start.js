var Happner = require('happner-2');

var heapdump = require('heapdump');

var mesh = new Happner();

function act(message, cb){

  if (message == 'GC'){
    if (global.gc) {
      global.gc();
      console.log('ON SERVER GC:::');
      return cb();
    } else {
      return cb(new Error('Garbage collection unavailable.  Pass --expose-gc '));
    }
  }

  if (message == 'HEAP-DMP-BASELINE')
    return heapdump.writeSnapshot(__dirname + '/heap-dumps/0.baseline.heapsnapshot', function (err, filename) {
      console.log('dump written to', filename);
      cb();
    });


  if (message.indexOf('HEAP-DMP-POST-TESTS') == 0){
    console.log('ON SERVER HEAP DMP:::');
    var heapDumpNumber = message.split('_')[1];
    return heapdump.writeSnapshot(__dirname + '/heap-dumps/' + heapDumpNumber + '.post-tests.heapsnapshot', function(err, filename) {
      console.log('dump written to', filename);
      cb();
    });
  }

  cb(new Error('unknown message type: ' + message))
}

process.on('message', function(data){

  act(data.message, function(e){

    console.log('REPLYING:::', {
      handle:data.handle,
      status: e || 'ok'
    });

    process.send({
      handle:data.handle,
      status: e || 'ok'
    });
  });
});

mesh.initialize({
  name: 'happner-2-memory-profiling',
  happn: {
    secure: true
  },
  modules: {
    "test": {
      path: __dirname + '/components/test'
    }
  },
  components: {
    "test": {}
  }
}, function (e) {

  if (e) return process.send('SERVICE START FAILED: ' + e.toString());

  mesh.start(function (e) {

    if (e) return process.send('SERVICE START FAILED: ' + e.toString());

    process.send('STARTED');
  });
});