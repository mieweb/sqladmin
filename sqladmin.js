
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

  Handlebars.registerHelper('debug', function (message) {
    console.log("debug-%s: this (%O), args(%d):%O",message, this,arguments.length,arguments);
  });

  Handlebars.registerHelper('ifArray', function (context, options) {
    if (typeof context == 'undefined')
      return options.inverse(this);
    if (Array.isArray(context))
      return options.fn(this);;
    return options.inverse(this);
  });

  Handlebars.registerHelper('ifmultires', function (context, options) {
    if (typeof context == 'undefined')
      return options.fn(this);
    for (var prop in context) {
      if(context.hasOwnProperty(prop)){
        switch (typeof context[prop]) {
          case 'object':
            if (Array.isArray(context[prop]))
              return options.fn(this);;
            break;
          case 'string':
          case 'number':
          case 'boolean':
          case null:
          default:
            return options.fn(this);;
        }
      }
    }
    return options.inverse(this); //  If I got here then they are all objects and not arrays.
  });

  Handlebars.registerHelper('dumpheader', function (context) {
    if (typeof context == 'undefined')
      return;
    // move to the first node.
    context = context[0];
    if (typeof context == 'undefined')
      return;

    var p="<tr>";
    for (var prop in context) {
      if(context.hasOwnProperty(prop)){
        var s = prop.split('|')
        if (s.length==2) {
          if (s[0].length==0)
            p += "<td>"+Handlebars._escape(s[1])+"</td>";
          else
            p += "<td>"+Handlebars._escape(s[0])+"."+Handlebars._escape(s[1])+"</td>";
        } else
          p += "<td>"+Handlebars._escape(prop)+"</td>";
      }
    }
    p += "</tr>";
    return new Handlebars.SafeString(p);
  });

  Handlebars.registerHelper('dumprow', function () {
    var context  = this;
    var p="<tr>";
    for (var prop in context) {
      if(context.hasOwnProperty(prop)){
        switch (typeof context[prop]) {
          case 'string':
            p += "<td>"+Handlebars._escape(context[prop])+"</td>";
            break;
          case 'number':
          case 'boolean':
          case null:
          case 'object':
          default:
            p += "<td>"+context[prop]+"</td>";
        }
      }
    }
    p += "</tr>"
    return new Handlebars.SafeString(p);
  });

  Template.sqlhistory.sqlcmds = function () {
    var t=SQLCmds.find({ user: username }, {sort: { time: 1 }, limit: Session.get("histlimit")}).fetch();
//    console.log("t:", t);
    return t;
  };

  Template.sqlresultview.activeres = function () {
    var res = Session.get("activeres");
    return res;
  };
  
  Template.sqlresultview.events({
    'click'   : function (event) { alert('click:' + event.toElement.localName + "\nthis:" + JSON.stringify(this)); }
  });

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
      if ((!lastq)||(lastq.query.trim() !== q.trim())) {
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
      res = Meteor.call('DBExec', q, '|', function(err,res) { 
          if (Array.isArray(res))
            Session.set("activeres",res); 
          else {
            var t = new Array();
            t.push(res);
            Session.set("activeres",t);
          }
        } 
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
//    'click'   : function (event) { console.log('click:',event, "this:", this); } ,
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

if (Meteor.isServer) {
  var Fiber;
  var Mysql;
  var Cparam;

  Meteor.startup(function () {
    // code to run on server at startup
    Fiber      = Meteor.require('fibers');
    Mysql      = Meteor.require('mysql');
    var cfile  = 'connection.json';
    try {
      var s = Assets.getText(cfile);
      Cparam = JSON.parse(s);
    } catch (e) {
      console.log("parse error: %s, in file: private/%s (%s)",e,cfile,s);
      var example = {
        host     : 'localhost',
        user     : 'root',
        password : '',
        database : ''
      };
      console.log("Make sure a file exists in private/%s.\nExample contents: %s", cfile, JSON.stringify(example));
    }
//    console.log("Connecting to DB using:",Cparam);
  });

  Meteor.publish("sqlcmds", function () { return SQLCmds.find({}) } );

}

Meteor.methods({
  DBExec: function (query, nest) {
//    console.log("DBExec: ", query);  
    if (Meteor.isServer) {
      try {
        var connection = Mysql.createConnection(Cparam);
      } catch (e) {
        console.log("in DBExec, createConnection error:",e);
        // treat errors as regular results.
        var err = [ {} ];
        err[0]['context'] = 'in DBExec, createConnection';
        err[0]['name'] = e.name;
        err[0]['message'] = e.message;
        err[0]['stack'] = e.stack;
        return err;
      }
      var fiber = Fiber.current;

      if (typeof nest == 'undefined') next = false;
      var options = { sql: query, nestTables: nest };
      connection.query(options, function(err, tables) {
          if (err) {
            // treat errors as regular results.
            tables = [ { } ];
            tables[0]['name'] = err.name;
            tables[0]['message'] = err.message;
            for (var e in err) {
              tables[0][e] = err[e];
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
