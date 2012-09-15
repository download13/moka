var async = require('async');
var domain = require('domain');

var describeStack = [];
var sections = [];
var totalTests = 0;

function getArgs(fn, helpers) { // I'm hoping this is safe...
	var fns = fn.toString();
	var args = fns.substring(fns.indexOf('(') + 1, fns.indexOf(')')).match(/([^\s,]+)/g);
	if(args == null) return [];
	return args.map(function(arg) {
		return helpers[arg];
	});
}

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

function describe(text, task) {
	if(describeStack.length > 0) {
		var parent = describeStack[describeStack.length - 1];
		text = parent.text + text;
	}
	
	var desc = {text: text, tests: []};
	describeStack.push(desc);
	sections.push(desc);
	
	var args = getArgs(task, helpers);
	task.apply(null, args);
	
	describeStack.pop();
}

function decoupled(fn) { // Return a version of the function that is decoupled from the current call stack
	return function() { // We don't really care about parameters from here
		process.nextTick(fn);
	}
}
function callAsync(fn, cb) {
	if(fn == null) return cb();
	
	var args = getArgs(fn, {
		done: decoupled(cb), // Decoupled so exception stacks in subsequent tests will be less confusing
		assert: assert.bind(null, cb),
		expect: expect.bind(null, cb)
	}); // TODO: Once an error has occurred how do we stop that test? throw? Or just let the execution continue until done is called and stop it from fireing cb again?
	
	if(fn.length == 0) {
		fn.apply(null, args);
		cb();
	} else {
		fn.apply(null, args);
	}
}

var currentTest;
function run(options, cb) {
	options = options || {};
	if(cb == null) cb = function() {}
	
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
						if(err) result.stack = err.stack;
						callAsync(section.afterEach, function() {
							if(parallel) cb(null, result); // It's safe to keep running the other tests if one failed
							else cb(err, result); // Other tests might be dependent on the one that failed
						});
					});
				});
			}, function(err, results) {
				callAsync(section.after, function() {
					cb(err, {name: section.text, tests: results});
				});
			});
		});
	}, function(err, results) {
		switch(options.output) {
		case 'data':
			cb(results);
			break;
			
		case 'tap':
			cb(formatTAP(results));
			break;
			
		case 'brief':
			console.log(formatBrief(results));
			break;
			
		default:
			console.log(formatConsole(results));
		}
	});
	// TODO: TAP output later
}

function formatConsole(data, totalTests) {
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
	data.forEach(function(section) {
		section.tests.forEach(function(test) {
			counter++;
			r += (test.passed ? '' : 'not ') + 'ok ' + counter + ' ' + test.name + '\n';
		});
	});
	
	if(testCount < totalTests) r += 'Bail out!\n'; // Fewer tests finished than existed, we must have bailed somewhere
	
	return r;
}

exports.describe = describe;
exports.run = run;

function assert(cb, a) {
	if(!a) {
		cb(new Error());
	}
}
// TODO: expect
function expect() {
	
}