//     behave.js  
//     For all details and documentation:
//     http://github.com/kennknowles/behave.js
//     Copyright 2012 Kenneth Knowles
//
//     Licensed under the Apache License, Version 2.0 (the "License");
//     you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//     Unless required by applicable law or agreed to in writing, software
//     distributed under the License is distributed on an "AS IS" BASIS,
//     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
//     limitations under the License.

// Behave.js: Less-than-pure Functional Reactive Programming with Behaviors and Event Streams
// ------------------------------------------------------------------------------------------

(function() {
    var root = this; // The page, or whatever

    var Be = root.Behave = {}; // The module

    // Functional helpers
    
    var constfun = function(val) { return function() { return val; } }
    
    // Event Streams
    // -------------

    // An event stream can be subscribed to, and the subscription canceled.
    
    // Subscription = { cancel :: IO ()  }
    Be.Subscription = function(implementation) {
	this.cancel = implementation.cancel;
    }

    // EventStream a = { subscribe :: (a -> IO ()) -> IO Subscription } 
    Be.EventStream = function(implementation) {
	this.subscribe = implementation.subscribe;
    }
    _.extend(Be.EventStream.prototype, {
	// functor
	map: function(f) {
	    var self = this;
	    return new Be.EventStream({
		subscribe: function(callback) {
		    return self.subscribe(function(val) { callback(f(val)) });
		}
	    });
	},
	
	// monoid - all events from each stream
	merge: function(other) {
	    var self = this;
	    return new Be.EventStream({
		subscribe: function(callback) {
		    var thisSub  = self.subscribe(callback);
		    var otherSub = other.subscribe(callback);

		    return new Be.Subscription({
			cancel: function() {
			    thisSub.cancel();
			    otherSub.cancel();
			}
		    });
		}
	    });
	},
    });
    
    // heartbeat :: EventStream () -- no value associated with it so it is time-translation-invariant
    Be.heartbeat = new Be.EventStream({
	subscribe: function(millis) {
	    var id = setInterval(callback, millis);
	    return new Be.Subscription({
		cancel: function() { 
		    clearInterval(id);
		}
	    });
	}
    });

    // Behaviors
    // ---------
    
    // A Behavior is a continuously changing value. It can be observed by the series of change events, polled or pushed
    // depending on the implementation.

    // Options are also dependent on the sort of behavior, but behaviors will naturally
    // be composed so here are some expected ones:
    //
    // pollMillis: the period of polling for behaviors requiring it
    // debounceMillis: the debounce duration for push-based events (you can also debounce your callback)

    // Behavior a :: { changes :: options -> Eventstream a }
    Be.Behavior = function(implementation) {
	this.changes = implementation.changes
    }
    _.extend(Be.Behavior.prototype, {
	// functor
	map: function(f) {
	    var self = this;
	    return new Be.Behavior({
		changes: function(options) {
		    return self.changes(options).map(f);
		}
	    });
	},

	// applicative - TODO
	/*
	ap: function(argsB) {
	    return new Be.Behavior(function(delay) {
		return this.poll(delay).merge(argsB.poll(delay))
	    });
	    ...
	    },
	*/
    });


    // constant :: a -> Behavior a -- constant behavior that never wastes time polling or sending updates
    Be.constant = function(value) {
	return new Be.Behavior({
	    changes: function(options) {
		return new Be.EventStream({
		    subscribe: function(callback) {
			callback(value);
			return new Be.Subscription({
			    cancel: function() { }
			});
		    }
		});
	    }
	});
    }
    
    // fluent :: IO a -> Behavior a -- behavior that just runs a potentially-mutatey function for a value; appropriate for always-changing behaviors that need polling
    Be.fluent = function(f) {
	return new Be.Behavior({
	    changes: function(options) {
		return Be.heartbeat(options.pollMillis).map(f);
	    }
	});
    }

    // Observables
    // -----------

    // An observable is a behavior that definitively has a current value, so it has a getter and setter
    // that cause the behavior to change.

    // Observable a = { get :: IO a, set :: a -> IO (), changes :: millis -> EventStream a }
    Be.Observable = function(implementation) {
	this.get = implementation.get;
	this.set = implementation.set;
	this.changes = implementation.changes;
    }
    _.extend(Be.Observable.prototype, Be.Behavior.prototype, {
	// get followed by set
	modify: function(f) { this.set(f(this.get())); }
    });

    Be.variable = function(initialValue) {
	var value = initialValue;
	var subscriptions = {};

	return new Be.Observable({
	    get: function() {
		return value;
	    },

	    set: function(v) {
		value = v;
		_(subscriptions).each(function(callback) {
		    callback(v);
		});
	    },

	    changes: function(options) {
		return new Be.EventStream({
		    subscribe: function(callback) {
			var id = _.chain(subscriptions).keys().max() + 1;
			subscriptions[id] = callback;
			return new Be.Subscription({
			    cancel: function() {
				delete subscriptions[id];
			    }
			});
		    }
		});
	    }
	});
    }
    
    // Sinks
    // -----

    // A sink is something that will react by mutating the world, such as the DOM or a Backbone model. 
    // I haven't made a class for this, since it doesn't really have many meaningful combinators...

    // Sink a = a -> IO ()

    // A sink which writes the incoming value as the contents of the jquery DOM node
    Be.domSink = function(elem) {
	return function(val) {
	    elem.html(val);
	}
    }

    // A sink which does knockout-style data-bind for a form. Assumes a backbone-style model object and jquery style elem.
    Be.formSink = function(elem) {
	return function(model) {
	    elem.find('input[data-bind]').each(function(index, input) {
		$(input).val(model.get($(input).attr('data-bind')));
	    });
	}
    }

    // Adapters
    // --------

    // Batteries included.

    // backboneE(obj, event) creates an event stream out of the particular event you *could* bind with backbone events
    Be.backboneE = function(obj, event) {
	return new Be.EventStream({
	    subscribe: function(callback) {
		obj.bind(event, callback);
		return new Be.Subscription({
		    unsubscribe: function() {
			obj.unbind(event, callback);
		    },
		});
	    },
	});
    }

    // backboneCollectionB(collection) creates a behavior of the collection object itself
    Be.backboneCollectionB = function(collection) {
	var adds = Be.backboneE(collection, "add");
	var removes = Be.backboneE(collection, "remove");
	var resets = Be.backboneE(collection, "reset");
	return new Be.Behavior({
	    changes: function(options) { return adds.merge(removes).merge(resets).map(constfun(collection)) },
	});
    }

    Be.backboneModelB = function(model) {
	var changes = Be.backboneE(model, "change");
	return new Be.Behavior({
	    changes: function(options) { return changes.map(constfun(model)); }
	});
    }

    // Futures
    // -------

    // A future is an event stream that has only one event in it. Kind of pointless, here...

    // Future a = { await :: a -> IO () }
    Be.Future = function(implementation) {
	this.await = implementation.await;
    };
    _.extend(Be.Future.prototype, {
	// monoid: this.or(that) is the earlier of the two futures
	or: function(other) {
	    var self = this;
	    return new Be.Future({
		await: function(callback) {
		    var arrived = false;
		    self.await(function(val) { if (arrived) return; arrived = true; callback(val); });
		    other.await(function(val) { if (arrived) return; arrived = true; callback(val); });
		}
	    });
	},

	// functor: this.map(f) "occurs" at the same time as this value
	map: function(f) {
	    var self = this;
	    return new Be.Future({
		await: function(callback) {
		    self.await(function(val) { callback(f(val)); });
		}
	    });
	},

	// monad: this.bind(f) "occurs" at the later of this value and the bound value
	bind: function(f) {
	    var self = this;
	    return new Be.Future({
		await: function(callback) {
		    self.await(function(val) {
			callback(f(val));
		    });
		}
	    });
	},

	// applicative: this.ap(args) "occurs" at the later (induced by monad, but reimplemented to elide some allocation)
	ap: function(argsFuture) {
	    var self = this;
	    return new Be.Future({
		await: function(callback) {
		    self.await(function(f) {
			argsFuture.await(function(args) {
			    callback(f(args));
			});
		    });
		}
	    });
	},
    });
}).call(this);
