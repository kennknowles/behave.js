/**
 * EventStream spec
 *
 * Semantic Interpretation:
 *   EventStream a = [(Time, a)] -- time is nondecreasing. 
 *
 * Implementation: 
 *   EventStream a = { subscribe :: (a -> IO ()) -> IO Subscription }
 *   Subscription = { cancel : IO () }
 */
describe("EventStream", function() {

    // These are specs for *implementations* of event streams
    describe("subscribe/cancel", function() {
	it("Calls a callback when subscribed", function() {});
	it("Calls both callbacks when two are subscribed", function() {});
	it("Does not callback after a subscription is canceled", function() {});
	it("Calls back anyone still subscribed", function() {});
    }); 

    // And these specs are for the instances, which should work for *any* correct event stream
    describe("EventStream is a functor", function() {
	it("stream.map(f . g) == stream.map(f).map(g)", function() {});
	it("stream.map(id) == stream", function() {});
    });

    describe("EventStream a forms a commutative monoid", function() {
	it("stream.merge(neverE) == stream == neverE.merge(stream)", function() {});
	it("stream1.merge(stream2).merge(stream3) == (stream1.merge(stream2)).merge(stream3)", function() {});
	it("stream1.merge(stream2).merge(stream3) == (stream1.merge(stream2)).merge(stream3)", function() {});
	it("stream1.merge(stream2) == stream2.merge(stream1)", function() {});
    });
});
