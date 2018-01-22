module.exports = TestComponent;

function TestComponent() {
}

TestComponent.prototype.testmethod = function ($happn, args, callback) {

  callback(null, args);
};


TestComponent.prototype.testevent = function ($happn, args, callback) {

  $happn.emit(args.eventKey, args, {}, callback);
};
