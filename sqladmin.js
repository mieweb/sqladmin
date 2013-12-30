
SQLCmds = new Meteor.Collection("sqlcmds");
var username = "horner";

if (Meteor.isClient) {
  var histpos = 0;

  var LoadHist = function () {
    SetActiveQuery("",0);
  };

  Meteor.subscribe("sqlcmds",LoadHist);

  //Using moment.fromNow which is cool, but needs some thinking for reactive display since, now is always moving.
  //would like dates to show fromNow and intelligently update.
  Handlebars.registerHelper("formatDate", function(datetime) {
    return new Handlebars.SafeString( 
        "<span class='datetime' title='" + moment(datetime).format('lll') + "'>" + moment(datetime).fromNow() + "</span>" 
      );
  });

  Template.sqlhistory.sqlcmds = function () {
    var t=SQLCmds.find({ user: username }, {sort: { time: -1 }, limit: Session.get("histlimit")}).fetch().reverse();
//    console.log("t:", t);
    return t;
  };

  var SetActiveQuery = function(query, num) {
    //console.log("SetActiveQuery:", query, "num:", num);
    if (!window.editor) {
        console.log("FIXME!!! Wait for the window.editor window to appear.");
        console.log("It fired before window was created!!!!");
        return;
    }

    if (!window.editor.isClean()) 
      SaveActiveQuery();

    if (num === undefined) {
      window.editor.setValue(query);
      Session.set("histpos", 0);
    } else {
      if (num==="up") {
        num = Session.get("histpos") + 1;
        Session.set("histpos", num);
      } else if (num==="down") {
        num = Session.get("histpos") - 1;
        if (num<0) num = 0;
        Session.set("histpos", num);
      }
      //console.log("SetActiveQuery:", query, "num:", num);
      lastq = SQLCmds.findOne({ user: username }, {sort: { time: -1 }, skip: num });
//      console.log("lastq:",lastq);
      if (lastq) {
          window.editor.setValue(lastq.query);
      }
    }
    window.editor.markClean();
  };

  var SaveActiveQuery = function() {
    var q = window.editor.getValue();
    // console.log("SaveActiveQuery(",q.trim().length,"):",q);
    if (q.trim().length) {
      lastq = SQLCmds.findOne({ user: username }, {sort: { time: -1 }});
      //console.log("Last Cmd:",lastq);
      if (lastq.query.trim() !== q.trim()) {
        SQLCmds.insert( { query: q, user: username, time: Date.now() } );
        Session.set("histpos", 0);
      }
      return true;
    }
    return false;
  };

  var SubmitActiveQuery = function() {
    var q = window.editor.getValue();
//    console.log("SubmitActiveQuery(",q.trim().length,"):",q);
    if (q.trim().length) {
      SaveActiveQuery();
      res = Meteor.call('DBExec', q, function(err,res) { 
        window.lastres = res;
        console.log("lastres:",res, "Err:", err)}
      );
//      console.log("Client:",res);
    }
  };

  var AddHistory = function(num) {
    var i = Session.get("histlimit")+num;
    if (i<=0) i=1;
    Session.set("histlimit",i);
  };

  var LoadPriorQuery = function() {
    var q = window.editor.getValue();
//    console.log("SubmitActiveQuery(",q.trim().length,"):",q);
    SaveActiveQuery();
  };

  Template.sqladmin.events({
    'click input#exec' : function (event) { SubmitActiveQuery(); },
    'click input#save' : function (event) { SaveActiveQuery(); },
    'click input#more' : function (event) { AddHistory(+5); },
    'click input#less' : function (event) { AddHistory(-5); },
//    'click input'      : function (event) { console.log( "click input:",event, this); },
    'click .csqlcmd'   : function (event) { 
                //console.log('click:',event, "this:", this); 
                if (this) SetActiveQuery(this.query);
              } ,
    'keydown' : function (event) { 
                    if (event.keyIdentifier == "Enter" && (event.metaKey==true||event.altKey==true)) { SubmitActiveQuery(); return false; } 
                    if (event.keyIdentifier == "Up" && (event.metaKey==true||event.altKey==true)) { SetActiveQuery("","up"); return false; }  
                    if (event.keyIdentifier == "Down" && (event.metaKey==true||event.altKey==true)) { SetActiveQuery("","down"); return false; }  
                    if (event.keyCode == 27) { SetActiveQuery(""); Session.set("histpos", -1); return false; }  // ESC
//                    console.log('keydown:',event); 
//                    console.log('consolepos', window.editor.getCursor());
                  } ,
//    'keydown' : function (event) { console.log('keydown:',event); } ,
//    'keypress': function (event) { console.log('keypress:',event); } ,
//    'keyup'   : function (event) { console.log('keyup:',event); } ,
    '':''
  });

  Meteor.startup(function() {
    Session.setDefault("histlimit", 3);
    Session.setDefault("histpos", 0);
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
  /*
    window.editor.on('beforeSelectionChange',function(a,sel) { 
      console.log('beforeSelectionChange',sel.anchor);
      if (sel.anchor.hitSide && sel.anchor.outside)
        console.log("load!!", sel.anchor.xRel);
    });
  */
});

}

var Fiber;
var Mysql;

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Fiber      = Npm.require('fibers');
    Mysql      = Npm.require('mysql');
  });

  Meteor.publish("sqlcmds", function () { return SQLCmds.find({}) } );

}

Meteor.methods({
  DBExec: function (query) {
    console.log("DBExec: ", query);
    if (Meteor.isServer) {
      var connection = Mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : '',
        database : 'wc'
      });
      var fiber = Fiber.current;

      var options = { sql: query, nestTables: '.' };
      connection.query(options, function(err, tables) {
          if (err) {
            // treat errors as regular objects.
            tables = new Object();
            tables.name = err.name;
            tables.message = err.message;
            for (var e in err) {
              tables[e] = err[e];
            }
          } 

          connection.end();
          fiber.run(tables);
        }
      );
      var res = Fiber.yield();
  //    console.log("This is res:",res);
    }
    return res;
  }
})
