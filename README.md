I like Mocha. Sort of...

It's got a nice convenient set of functions for organizing your tests, but it keeps throwing strange errors that it seems to have created on it's own.
Some of that is probably just due to the fact that it uses the `vm` module and can't be helped, but I really would rather it didn't interfere in my test code in any way that isn't
explicitly visible. To that end, I bashed this out. This was done over the course of two days. It will have bugs.

### Example test file:
```javascript
var moka = require('moka');
var describe = moka.describe;

describe('Test something', function(it) { // Only include the helpers you need
	// Helpers are: it, before, beforeEach, after, afterEach
	
	it('does something synch', function() {
		if(3 !== 3) throw new Error();
	});
	
	// Supports nesting describes
	describe('#something more specific', function(it, after, beforeEach) {
		var setup;
		
		beforeEach(function() {
			setup = 'a very important string';
		});
		
		it('pretends its actually async', function(done) {
			if(isFinite(setup.length / 0)) throw new Error();
			done();
		}, 200); // Set a timeout. If the test takes longer than this it will fail. Default is 5 seconds
		
		it('doesnt matter what this does', function() {
			setup += ', but not important enough to preserve it';
		});
		
		after(function() {
			setup = '';
		});
	});
});

moka.run();
```

### moka.run options:

`moka.run()` can be called with options. For example:
```javascript
moka.run({
	parallel: false,
	format: 'tap',
}, function(tap) { // Callback gets the output that you selected (except for console output)
	// Do something with the TAP string
});
```

If a callback is included in the call, the output will be sent to the callback instead of the console.
The option `format` can have a number of values. By default it's set to 'console', which just produces output suitable for the console.
'brief' is an abbreviated form of 'console' (only show a summary and stack traces for the failed tests).
'tap' outputs a [TAP](https://github.com/isaacs/node-tap) compatible string. Setting it to 'data' will simply return the raw, unformatted test data.

The raw data has the following structure:
```javascript
[ // Each element is a section (describe call)
	{name: 'Section name', tests: [ // All the tests in that section (only directly, not ones in sub-sections)
		{
			name: 'test description string',
			passed: false, // Did the test pass without error?
			stack: 'stack trace string' // Only present if passed is false
		}
	]}
]
```

The option `{parallel: false}` puts moka into serial mode where it assumes that the tests depend on each other.
Being in serial mode will cause moka to run a test only after the previous test has finished and stop testing immediately if one of the tests throws an error.
The output for the tests run up to the error will be sent to whatever output was selected.
Since serial mode is generally slower than parallel mode, try to write your tests to be independent of one another.

As always, you can use any assertion library you want.

### Use as a command line utility:
```
moka
moka sometestfile.js
moka testdir1 testdir2 testfile.js
```
When run without arguments all it does is run `test.js` and any `.js` files it finds in the `test` or `spec` directory at the current path, then dumps the output of each test file separated by an empty line.
When run with arguments it checks only the directories and files given as arguments that exist.

Because all it does is run the test files with Node, you can use different types of tests together, even different test frameworks. The only requirement is that they be runnable Node scripts.
