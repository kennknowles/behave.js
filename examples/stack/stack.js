$(document).ready(function() {
    
    var stackVar = new Behave.variable([]);

    $("#push").click(function() {
	var stack = stackVar.get();
	stack.push($('#input').val());
	$('#input').val('');
	stackVar.set(stack);
    })

    $("#pop").click(function() {
	var stack = stackVar.get();
	stack.pop();
	stackVar.set(stack);
    });

    var render = function(stack) {
	return ich["stack-template"]({stack: stack});
    }
    
    var subscription = stackVar.changes().map(render).subscribe( Behave.domSink($('#stack')) );
});
