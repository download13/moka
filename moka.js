var async = require('async');
var domain = require('domain');

var describeStack = [];
var sections = [];
var totalTests = 0;

var helpers = {
	it: function(text, task) {
		var test = {text: text, task: task};
		var desc = describeStack[describeStack.length - 1];
		desc.tests.push(test);
		totalTests++;
	},
	before: function(task) {
		describeStack[describeStack.length - 1].before = task;
	},
	beforeEach: function(task) {
		describeStack[describeStack.length - 1].beforeEach = task;
	},
	after: function(task) {
		describeStack[describeStack.length - 1].after = task;
	},
	afterEach: function(task) {
		describeStack[describeStack.length - 1].afterEach = task;
	}
};
function getArgs(fn, helpers) { // I'm hoping this is safe...
	var fns = fn.toString();
	var args = fns.substring(fns.indexOf('(') + 1, fns.indexOf(')')).match(/([^\s,]+)/g);
	if(args == null) return [];
	return args.map(function(arg) {
		return helpers[arg];
	});
}

function describe(text, task) {
	if(describeStack.length > 0) {
		var parent = describeStack[describeStack.length - 1];
		text = parent.text + text;
	}
	
	var desc = {text: text, tests: []};
	describeStack.push(desc);
	sections.push(desc);
	
	var args = getArgs(task, helpers);
	task.apply(null, args); // They setup task needs to run synchronously
	
	describeStack.pop();
}

// Make sure that we can escape from the domain that we ran the code inside
// This must be called from outside the domain and the escape route (r) sent inside
function decoupled(fn) {
	var n = setInterval(function() {
		if(r.called) {
			clearInterval(n);
			process.nextTick(fn);
		}
	}, 50);
	
	var r = function() {
		r.called = true;
	}
	r.called = false;
	r.cancel = function() {
		clearInterval(n);
	}
	
	return r;
}

// Takes a function to call asynchronously, a callback, and an optional failure callback
// If the failure callback is not specified, errors are reported to the regular callback
function callAsync(fn, cb, errcb) {
	if(fn == null) return process.nextTick(cb);
	if(fn.length == 0) {
		var err;
		try {
			fn();
		} catch(e) {
			err = e;
		}
		process.nextTick(cb.bind(null, err));
	} else {
		var escapeRoute = decoupled(cb);
		var handlerCalled = false;
		function errorHandler(err) {
			if(handlerCalled || escapeRoute.called) return;
			handlerCalled = true;
			
			escapeRoute.cancel();
			if(errcb != null) errcb(err);
			else cb(err);
		}
		
		
		var d = domain.create();
		d.on('error', errorHandler);
		fn = d.bind(fn); // Bound version
		// TODO: Maybe use a setTimeout to make sure the test finishes
		
		fn(escapeRoute);
	}
}

function errorCallback(info, err) {
	console.error('Error: ' + info);
	throw err;
}

function run(options, cb) {
	options = options || {};
	cb = cb || console.log;
	
	var parallel = options.parallel == false ? false : true;
	var map = async.mapSeries;
	if(parallel) map = async.map; // All the tests are independent of each other; it's safe to run them in parallel
	
	// It's fucking Christmas!
	map(sections, function(section, cb) {
		callAsync(section.before, function() {
			map(section.tests, function(test, cb) {
				callAsync(section.beforeEach, function() {
					callAsync(test.task, function(err) {
						var result = {name: test.text, passed: err == null};
						if(err != null) {
							result.stack = err.stack;
						}
						callAsync(section.afterEach, function() {
							if(parallel) cb(null, result); // It's safe to keep running the other tests if one failed
							else cb(err, result); // Other tests might be dependent on the one that failed
						}, errorCallback.bind(null, section.text + '->afterEach'));
					});
				}, errorCallback.bind(null, section.text + '->beforeEach'));
			}, function(err, results) {
				callAsync(section.after, function() {
					cb(err, {name: section.text, tests: results});
				}, errorCallback.bind(null, section.text + '->after'));
			});
		}, errorCallback.bind(null, section.text + '->before'));
	}, function(err, results) {
		switch(options.output) {
		case 'data':
			cb(results);
			break;
			
		case 'tap':
			cb(formatTAP(results));
			break;
			
		case 'brief':
			cb(formatBrief(results));
			break;
			
		default:
			cb(formatConsole(results));
		}
	});
}

function formatConsole(data) {
	var r = '';
	
	data.forEach(function(section) {
		r += '\x1b[0m' + section.name + '\n';
		section.tests.forEach(function(test) {
			r += '  \x1b[3' + (test.passed ? '2m' : '1m') + test.name + '\n';
			if(!test.passed) r += '  \x1b[0m' + test.stack + '\n\n';
		});
		r += '\n';
	});
	
	return r;
}
function formatBrief(data) {
	var passedCount = 0;
	var failedCount = 0;
	var statusBar = '';
	var stacks = '';
	
	data.forEach(function(section) {
		section.tests.forEach(function(test) {
			if(test.passed) {
				passedCount++;
				statusBar += '\x1b[32m*';
			} else {
				failedCount++;
				statusBar += '\x1b[31m*';
				
				stacks += '\x1b[31m' + test.name + '\n\x1b[0m' + test.stack + '\n\n';
			}
		});
	});
	
	return '\x1b[32m' + passedCount + '/' + totalTests + ' passed\n\x1b[31m' + failedCount + ' failed\n' + statusBar + '\n\n\x1b[0m' + stacks;
}
function formatTAP(data) {
	var testCount = 0;
	data.forEach(function(section) {
		testCount += section.tests.length;
	});
	
	var r = '1..' + testCount + '\n';
	var counter = 0;
	var lines = [];
	data.forEach(function(section) {
		section.tests.forEach(function(test) {
			counter++;
			lines.push((test.passed ? '' : 'not ') + 'ok ' + counter + ' ' + test.name);
		});
	});
	r += lines.join('\n');
	
	if(testCount < totalTests) r += '\nBail out!'; // Fewer tests finished than existed, we must have bailed somewhere
	
	return r;
}

exports.describe = describe;
exports.run = run;
