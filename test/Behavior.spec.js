/**
 * Behavior spec
 *
 * Semantic Interpretation:
 *   Behavior a = Time -> a
 *
 * Implementation: 
 *   Behavior a = { changes :: EventStream a } -- ignoring options, here
 */
describe("Behavior", function() {

    // These are specs for *implementations* of behaviors 
    describe("changes", function() {
	it("behavior.changes().map(f) == behavior.map(f).changes()", function() {});
    });

    // But these specs are for the instances, which should work for *any* correct behavior
    describe("Behavior is a functor", function() {
	it("behavior.map(f . g) == behavior.map(f).map(g)", function() {});
	it("behavior.map(id) == behavior", function() {});
    });

    describe("Behavior a forms an monad and applicative functor", function() {
	// TODO?
    });
});
