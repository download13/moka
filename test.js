var moka = require('./moka');
var describe = moka.describe;
var expect = require('expect.js');

var beforeRan;
var afterRan;
var aftRan;

describe('I', function(it) {
	it('synch test', function() {
		return;
	});
	it('async test', function(done) {
		done();
	});
	
	var asynctest;
	it('sets up the asynctest', function(done) {
		setTimeout(function() {
			asynctest = 1;
			done();
		}, 200);
		
	});
	it('fails in parallel mode', function(done) {
		setTimeout(function() {
			expect(asynctest).to.be(1);
			done();
		}, 100);
	});
	
	describe('#1', function(it, beforeEach, afterEach) {
		beforeEach(function() {
			beforeRan++;
		});
		
		it('synch body', function() {
			return;
		});
		it('async body', function(done) {
			done();
		});
		
		afterEach(function() {
			afterRan++;
		});
	});
});

describe('II', function(it, after) {
	it('fails due to timeout', function(done) {
		setTimeout(done, 1000);
	}, 500);
	it('throws', function() {
		throw new Error('test error');
	});
	it('try this one anyway', function() {
		return;
	});
	
	after(function() {
		aftRan++;
	});
});

beforeRan = 0;
afterRan = 0;
aftRan = 0;

moka.run({format: 'data'}, function(data) { // Run the tests
	expect(beforeRan).to.be(2);
	expect(afterRan).to.be(2);
	expect(aftRan).to.be(1);
	
	expect(data).to.have.length(3);
	
	var tests = data[0].tests;
	expect(data[0].name).to.be('I');
	expect(tests).to.have.length(4);
	expect(tests[0].name).to.be('synch test');
	expect(tests[0].passed).to.be(true);
	expect(tests[1].name).to.be('async test');
	expect(tests[1].passed).to.be(true);
	expect(tests[2].name).to.be('sets up the asynctest');
	expect(tests[2].passed).to.be(true);
	expect(tests[3].name).to.be('fails in parallel mode');
	expect(tests[3].passed).to.be(false);
	
	var tests = data[1].tests;
	expect(data[1].name).to.be('I#1');
	expect(tests).to.have.length(2);
	expect(tests[0].name).to.be('synch body');
	expect(tests[0].passed).to.be(true);
	expect(tests[1].name).to.be('async body');
	expect(tests[1].passed).to.be(true);
	
	var tests = data[2].tests;
	expect(data[2].name).to.be('II');
	expect(tests).to.have.length(3);
	expect(tests[0].name).to.be('fails due to timeout');
	expect(tests[0].passed).to.be(false);
	expect(tests[0].stack).to.be.a('string');
	expect(tests[1].name).to.be('throws');
	expect(tests[1].passed).to.be(false);
	expect(tests[1].stack).to.be.a('string');
	expect(tests[2].name).to.be('try this one anyway');
	expect(tests[2].passed).to.be(true);
	
	console.log('Parallel mode passed');
	
	testSerial();
});

function testSerial() {
	beforeRan = 0;
	afterRan = 0;
	aftRan = 0;
	
	moka.run({parallel: false, format: 'data'}, function(data) { // Run the tests in serial mode
		expect(beforeRan).to.be(2);
		expect(afterRan).to.be(2);
		expect(aftRan).to.be(1);
		
		expect(data).to.have.length(3);
		
		var tests = data[0].tests;
		expect(data[0].name).to.be('I');
		expect(tests).to.have.length(4);
		expect(tests[0].name).to.be('synch test');
		expect(tests[0].passed).to.be(true);
		expect(tests[1].name).to.be('async test');
		expect(tests[1].passed).to.be(true);
		expect(tests[2].name).to.be('sets up the asynctest');
		expect(tests[2].passed).to.be(true);
		expect(tests[3].name).to.be('fails in parallel mode');
		expect(tests[3].passed).to.be(true);
		
		var tests = data[1].tests;
		expect(data[1].name).to.be('I#1');
		expect(tests).to.have.length(2);
		expect(tests[0].name).to.be('synch body');
		expect(tests[0].passed).to.be(true);
		expect(tests[1].name).to.be('async body');
		expect(tests[1].passed).to.be(true);
		
		var tests = data[2].tests;
		expect(data[2].name).to.be('II');
		expect(tests).to.have.length(1);
		expect(tests[0].name).to.be('fails due to timeout');
		expect(tests[0].passed).to.be(false);
		expect(tests[0].stack).to.be.a('string');
		
		console.log('Serial mode passed');
		
		testTAP();
	});
}

// TODO: Maybe improve the TAP tests later
function testTAP() {
	moka.run({format: 'tap'}, function(tap) {
		tap = tap.split('\n');
		expect(tap.length).to.be(10);
		
		console.log('TAP passed in parallel mode');
		
		moka.run({parallel: false, format: 'tap'}, function(tap) {
			tap = tap.split('\n');
			expect(tap.length).to.be(9);
			expect(tap[tap.length - 1]).to.be('Bail out!');
			
			console.log('TAP passed in serial mode');
			console.log('Done');
		});
	});
}
