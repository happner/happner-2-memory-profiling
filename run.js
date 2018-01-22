var install = require("gulp-install");
var gulp = require('gulp');
var transform = require('gulp-transform');
var runSequence = require('run-sequence');
var exec = require('gulp-exec');

var clientVersion = process.argv[2];
var serverVersion = process.argv[3];

var afterBaseLineLoopCount = process.argv[4]?parseInt(process.argv[4]):1;

function updateVersion(content, file) {

  if (file.path.indexOf('server/package.json'))
    content = content.replace('{{compare-server-version}}', serverVersion);

  if (file.path.indexOf('client/package.json'))
    content = content.replace('{{compare-client-version}}', clientVersion);

  return content;
}

gulp.task('build', function (callback) {

  var sequence = ['build-server',
    'build-client',
    'start-server',
    'run-tests-before-baseline',
    'gc-heap-dump-baseline'];

  for (var i = 0; i < afterBaseLineLoopCount; i++){
    sequence.push('run-tests-after-baseline');
    sequence.push('gc-heap-dump-post-tests');
  }

  sequence.push('kill-server');

  sequence.push(callback);

  runSequence.apply(runSequence, sequence);
});

var child_process = require('child_process');
var server;

var messageHandles = 0;
var messageHandlers = {};

var sendMessage = function (child, message) {

  var sendMessage = {
    handle: messageHandles++,
    message: message
  };

  console.log('sendMessage:::', sendMessage);

  return new Promise(function (resolve, reject) {

    messageHandlers[sendMessage.handle] = {
      resolve: resolve,
      reject: reject
    };

    child.send(sendMessage);
  })
};

gulp
  .task('build-server', function () {
    return gulp
      .src(__dirname + '/__resources/server/**')
      .pipe(transform('utf8', updateVersion))
      .pipe(gulp.dest(__dirname + '/server/' + serverVersion + '/'))
      .pipe(install());
  });

gulp.task('build-client', function () {
  return gulp
    .src(__dirname + '/__resources/client/**')
    .pipe(transform('utf8', updateVersion))
    .pipe(gulp.dest(__dirname + '/client/' + clientVersion + '/'))
    .pipe(install());
});


gulp.task('start-server', function (callback) {

  server = child_process.fork(__dirname + '/server/' + serverVersion + '/server-start', {execArgv: ['--expose-gc']});

  server.on('message', function (message) {

    console.log('message:::', message);

    if (message == 'STARTED') return callback();

    if (message.indexOf && message.indexOf('ERROR') > -1) return callback(new Error('failed to start server'));

    if (message.handle != null && messageHandlers[message.handle] && message.status != null) {

      if (message.status == 'ok') {
        console.log('resolving:::', message);
        messageHandlers[message.handle].resolve(message);
      } else messageHandlers[message.handle].reject(new Error(message.status));

      delete messageHandlers[message.handle];
    }
  });
});

gulp.task('run-tests-before-baseline', function (callback) {

  console.log('RUNNING TESTS BEFORE BASELINE:::');

  child_process.exec('mocha ' + __dirname + '/client/' + clientVersion + '/tests/** > ' + __dirname + '/client/' + clientVersion + '/results/latest.txt', function (e, stdout, stderr) {

    callback();
  });

});

gulp.task('gc-heap-dump-baseline', function (callback) {

  sendMessage(server, 'GC').then(function () {
      console.log('did gc-baseline:::');
      return sendMessage(server, 'HEAP-DMP-BASELINE');
    })
    .then(function (response) {
      console.log('did gc-heap-dump-baseline:::');
      callback(null, response)
    })
    .catch(callback);

});

gulp.task('run-tests-after-baseline', function (callback) {

  console.log('RUNNING TESTS AFTER BASELINE:::');

  child_process.exec('mocha ' + __dirname + '/client/' + clientVersion + '/tests/** > ' + __dirname + '/client/' + clientVersion + '/results/latest.txt', function (e, stdout, stderr) {

    callback();
  });

});

var heap_number = 0;

gulp.task('gc-heap-dump-post-tests', function (callback) {

  sendMessage(server, 'GC').then(function () {

      heap_number++;

      return sendMessage(server, 'HEAP-DMP-POST-TESTS_' + heap_number.toString());
    })
    .then(function (response) {
      callback(null, response);
    })
    .catch(callback);

});

gulp.task('kill-server', function (callback) {

  server.kill();
  callback();
});

gulp.start('build');

