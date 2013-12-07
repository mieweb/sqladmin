
SQLCmds = new Meteor.Collection("sqlcmds");
var username = "horner";

if (Meteor.isClient) {

  var LoadHist = function () {
    lastq = SQLCmds.findOne({ user: username }, {sort: { time: -1 }});
//    console.log("lastq:",lastq);
    if (lastq) {
      console.log("FIXME!!! Wait for the window.editor window to appear.");
      if (window.editor)
        window.editor.setValue(lastq.query);
      else
        console.log("It fired before window was created!!!!");
    }
  };

  Meteor.subscribe("sqlcmds",LoadHist);

  var DateFormats = {
         short: "DD MMMM - YYYY",
         long: "dddd DD.MM.YYYY HH:mm"
  };

  Handlebars.registerHelper("formatDate", function(datetime, format) {
    if (moment) {
      f = DateFormats[format];
      return moment(datetime).format(f);
    }
    else {
      return datetime;
    }
  });

  Template.sqladmin.sqlcmds = function () {
    return SQLCmds.find({ user: username }, {sort: { time: -1 }, limit: 3});
  };

  Template.sqladmin.lastq = function () {
    return SQLCmds.findOne({ user: username }, {sort: { time: -1 }});
  };

  var SubmitActiveQuery = function() {
    var q = window.editor.getValue();
//    console.log("SubmitActiveQuery(",q.trim().length,"):",q);
    if (q.trim().length) {
      lastq = SQLCmds.findOne({ user: username }, {sort: { time: -1 }});
      console.log("Last Cmd:",lastq);
      if (lastq.query.trim() !== q.trim()) {
        SQLCmds.insert( { query: q, user: username, time: Date.now() } );
        console.log("res:",res);
      }
      res = Meteor.call('DBExec', q, function(err,res) { 
        window.lastres = res;
        console.log("lastres:",res)}
      );
//      console.log("Client:",res);
    }
  };

  Template.sqladmin.events({
    'click input' : function (event) {
      console.log("Event:",event);
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
      SubmitActiveQuery();
    },
    'keypress': function (event) { if (event.keyIdentifier == "Enter" && event.shiftKey==true){ SubmitActiveQuery(); } } ,
//    'click'   : function (event) { console.log('default:',event); } ,
//    'keydown' : function (event) { console.log('default:',event); } ,
//    'keypress': function (event) { console.log('default:',event); } ,
//    'keyup'   : function (event) { console.log('default:',event); }
    '':''
  });

  Meteor.startup(function() {
	  var mime = 'text/x-mysql';
	  // get mime type
	  if (window.location.href.indexOf('mime=') > -1) {
	    mime = window.location.href.substr(window.location.href.indexOf('mime=') + 5);
	  }
	  window.editor = CodeMirror.fromTextArea(document.getElementById('code'), {
        mode: mime,
        indentWithTabs: true,
        smartIndent: true,
        lineNumbers: true,
        matchBrackets : true,
        autofocus: true, 
        extraKeys: {"Enter": false }
      });
});

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.publish("sqlcmds", function () { return SQLCmds.find({}) } );

}

Meteor.methods({
  DBExec: function (query) {
    console.log("DBExec: ", query);
    var Fiber      = Npm.require('fibers');
    var mysql      = Npm.require('mysql');
    var connection = mysql.createConnection({
      host     : 'localhost',
      user     : 'root',
      password : '',
      database : 'wc'
    });
    var fiber = Fiber.current;

    connection.query(query, function(err, tables) {
        if (err) return fiber.throwInto(err);
//      console.log(JSON.stringify(tables,null,4));
        connection.end();
        fiber.run(tables);
      }
    );
    var res = Fiber.yield();
//    console.log("This is res:",res);
    return res;
  }
})
