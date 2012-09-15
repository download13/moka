I like Mocha. Sort of...

It's got a nice convenient set of functions for organizing your tests, but it keeps throwing strange errors that it seems to have created on it's own.
Some of that is probably just due to the fact that it uses the `vm` module and can't be helped, but I really would rather it didn't interfere in my test code in any way that isn't
explicitly visible. To that end, I bashed this out today.

### Example test file:
```javascript
var moka = require('moka');
var describe = moka.describe;

describe('Test something', function(it) { // List any helper functions you need in the parameters: it, before, beforeEach, after, afterEach
	it('does something synch', function() {
		if(3 !== 3) throw new Error();
	});
	
	// Supports nesting describes
	describe('#something more specific', function(it, after, beforeEach) { // They can be in any order as long as the names are right
		var setup;
		
		beforeEach(function() {
			setup = 'a very important string';
		});
		
		it('pretends its actually async', function(done) {
			if(isFinite(setup.length / 0)) throw new Error();
			done();
		});
		
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
```
moka.run({
	parallel: false,
	output: 'tap',
}, function(tap) { // Callback gets the output that you selected (except for console output)
	// Do something with the TAP string
});
```

The option `output` can have a number of values. By default it's set to the string 'console', which just prints the output to the console in a semi-organized manner.
'brief' can be used to output to the console in an abbreviated form (only show a summary and stack traces for the failed tests).
Set it to 'tap' and `moka.run` will return a [TAP](https://github.com/isaacs/node-tap) compatible string in the callback. Setting it to 'data' will return an array of the following form:
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
```
Yeah, that's it. All it does is run `test.js` and any `.js` files it finds in the `test` or `spec` directory at the current path, then dumps the output of each test file separated by an empty line.
