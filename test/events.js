const assert = require('assert');

const events = require('../src/events');
events.logger.setLevel(events.logger.LEVEL_NONE);

beforeEach(function() {
    events.listeners = {};
});

describe('Events', function() {
    describe('#dispatch()', function() {
        it('should throw no error with empty data', function() {
            events.dispatch('foobar');

            assert.ok(true);
        });
        it('should throw no error with filled data', function() {
            events.dispatch('foobar', {foo: {bar: [1,2,3]}, bat: 'asd'});

            assert.ok(true);
        });
    });

    describe('#listen()', function() {
        it('should call one listener when one listener is binded and the event is thrown', function() {
            let calls = 0;
            events.listen('foo', () => calls++);

            events.dispatch('foo');

            assert.equal(calls, 1);
        });
        it('should call both listeners when two listeners are binded and the event is thrown', function() {
            let calls = 0;

            events.listen('foo', () => calls++);
            events.listen('foo', () => calls++);

            events.dispatch('foo');

            assert.equal(calls, 2);
        });
        it('should call first listener when two listeners are binded to different events and the first event is thrown', function() {
            let calls = 0;

            events.listen('foo', () => calls++);
            events.listen('bar', () => calls++);

            events.dispatch('foo');

            assert.equal(calls, 1);
        });
        it('should call all listeners in the correct order when multiple listeners are binded and the event is thrown', function() {
            let order = '';

            events.listen('foo', () => order += 'a');
            events.listen('foo', () => order += 'b');
            events.listen('foo', () => order += 'c');

            events.dispatch('foo');

            assert.equal(order, 'abc');
        });
    });
});