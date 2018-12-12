let username = 'horner';

let histpos = 0;

let LoadHist = function () {
  SetActiveQuery('', 0);
};

Meteor.subscribe('sqlcmds', LoadHist);

// Using moment.fromNow which is cool, but needs some thinking for reactive display since, now is always moving.
// would like dates to show fromNow and intelligently update.
Handlebars.registerHelper('formatDate', function (datetime) {
  return new Handlebars.SafeString(
    '<span class="datetime" title="' + moment(datetime).format('lll') + '">" + moment(datetime).fromNow() + "</span>'
  );
});

Handlebars.registerHelper('debug', function (message) {
  console.log('debug-%s: this (%O), args(%d):%O', message, this, arguments.length, arguments);
});

Handlebars.registerHelper('Array', function (context, options) {
  if (typeof context === 'undefined')
    return options.inverse(this);
  if (Array.isArray(context))
    return options.fn(this);;
  return options.inverse(this);
});

Handlebars.registerHelper('multires', function (context, options) {
  if (typeof context === 'undefined')
    return options.fn(this);
  for (var prop in context) {
    if (context.hasOwnProperty(prop)) {
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
  if (typeof context === 'undefined')
    return;
  // move to the first node.
  context = context[0];
  if (typeof context === 'undefined')
    return;

  var p = '<tr>';
  for (var prop in context) {
    if (context.hasOwnProperty(prop)) {
      var s = prop.split('|')
      if (s.length == 2) {
        if (s[0].length == 0)
          p += '<td>' + Handlebars._escape(s[1]) + '</td>';
        else
          p += '<td>' + Handlebars._escape(s[0]) + '.' + Handlebars._escape(s[1]) + '</td>';
      } else
        p += '<td>' + Handlebars._escape(prop) + '</td>';
    }
  }
  p += '</tr>';
  return new Handlebars.SafeString(p);
});

Handlebars.registerHelper('dumprow', function () {
  var context = this;
  var p = '<tr>';
  for (var prop in context) {
    if (context.hasOwnProperty(prop)) {
      switch (typeof context[prop]) {
        case 'string':
          p += '<td>' + Handlebars._escape(context[prop]) + '</td>';
          break;
        case 'number':
        case 'boolean':
        case null:
        case 'object':
        default:
          p += '<td>' + context[prop] + '</td>';
      }
    }
  }
  p += '</tr>'
  return new Handlebars.SafeString(p);
});

Template.sqlresultview.helpers({
  activeres: function () {
    return Session.get('activeres');
  },
  sqlcmds: function () {
    return SQLCmds.find({
      user: username
    }, {
      sort: {
        time: -1
      },
      limit: Session.get('histlimit')
    }).fetch().reverse();
  }
});
Template.sqlresultview.events({
  'click'(event) {
    alert('click:' + event.toElement.localName + '\nthis:' + JSON.stringify(this));
  }
});

const SetActiveQuery = function (query, num) {
  // console.log("SetActiveQuery:", query, "num:", num);
  if (!window.editor) {
    console.log('FIXME!!! Wait for the window.editor window to appear.');
    console.log('It fired before window was created!!!!');
    return;
  }

  if (!window.editor.isClean())
    SaveActiveQuery();

  if (num === undefined) {
    window.editor.setValue(query);
    Session.set('histpos', 0);
  } else {
    if (num === 'up') {
      num = Session.get('histpos') + 1;
      Session.set('histpos', num);
    } else if (num === 'down') {
      num = Session.get('histpos') - 1;
      if (num < 0) num = 0;
      Session.set('histpos', num);
    }
    // console.log('SetActiveQuery:', query, 'num:', num);
    lastq = SQLCmds.findOne({
      user: username
    }, {
      sort: {
        time: -1
      },
      skip: num
    });
    // console.log('lastq:',lastq);
    if (lastq) {
      window.editor.setValue(lastq.query);
    }
  }
  window.editor.markClean();
};

const SaveActiveQuery = function () {
  const q = window.editor.getValue();
  // console.log('SaveActiveQuery(',q.trim().length,'):',q);
  if (q.trim().length) {
    lastq = SQLCmds.findOne({
      user: username
    }, {
      sort: {
        time: -1
      }
    });
    // console.log('Last Cmd:',lastq);
    if ((!lastq) || (lastq.query.trim() !== q.trim())) {
      SQLCmds.insert({
        query: q,
        user: username,
        time: Date.now()
      });
      Session.set('histpos', 0);
    }
    return true;
  }
  return false;
};

const SubmitActiveQuery = function () {
  const q = window.editor.getValue();
  // console.log('SubmitActiveQuery(',q.trim().length,'):',q);
  if (q.trim().length) {
    SaveActiveQuery();
    const exec = {
      'q': q,
      'host': $("#connection_host").val().trim(),
      'password': $("#connection_password").val().trim(),
      'username': $("#connection_username").val().trim(),
      'port': $("#connection_port").val().trim(),
      'database': $("#connection_database").val().trim(),
      'multiStatements': $("#connection_multiStatement").val(),
    }
    res = Meteor.call('DBExec', exec, '|', function (err, res) {
      if (err) {
        console.log(err);
        toastr.error(err.message, "DBExec Error");
        return;
      }
      if (Array.isArray(res))
        Session.set('activeres', res);
      else {
        let t = new Array();
        t.push(res);
        Session.set('activeres', t);
      }
    });
    // console.log('Client:',res);
  }
};

const AddHistory = function (num) {
  let i = Session.get('histlimit') + num;
  if (i <= 0) i = 1;
  Session.set('histlimit', i);
};

const LoadPriorQuery = function () {
  const q = window.editor.getValue();
  // console.log('SubmitActiveQuery(',q.trim().length,'):',q);
  SaveActiveQuery();
};

Template.sqladmin.events({
  'click input#exec': function (event) {
    SubmitActiveQuery();
  },
  'click input#save': function (event) {
    SaveActiveQuery();
  },
  'click input#more': function (event) {
    AddHistory(+5);
  },
  'click input#less': function (event) {
    AddHistory(-5);
  },
  // 'click input' : function (event) { console.log( "click input:",event, this); },
  'click .csqlcmd': function (event) {
    // console.log('click:',event, "this:", this); 
    if (this) SetActiveQuery(this.query);
  },
  'keydown': function (event) {
    if (event.keyIdentifier == 'Enter' && (event.metaKey == true || event.altKey == true)) {
      SubmitActiveQuery();
      return false;
    }
    if (event.keyIdentifier == 'Up' && (event.metaKey == true || event.altKey == true)) {
      SetActiveQuery('', 'up');
      return false;
    }
    if (event.keyIdentifier == 'Down' && (event.metaKey == true || event.altKey == true)) {
      SetActiveQuery('', 'down');
      return false;
    }
    if (event.keyCode == 27) {
      SetActiveQuery('');
      Session.set('histpos', -1);
      return false;
    } // ESC
    //                    console.log('keydown:',event); 
    //                    console.log('consolepos', window.editor.getCursor());
  },
  //    'keydown' : function (event) { console.log('keydown:',event); } ,
  //    'keypress': function (event) { console.log('keypress:',event); } ,
  //    'keyup'   : function (event) { console.log('keyup:',event); } ,
  //    'click'   : function (event) { console.log('click:',event, "this:", this); } ,
  '': ''
});

Template.sqladmin.onRendered(function () {
  Session.setDefault('histlimit', 3);
  Session.setDefault('histpos', 0);
  var mime = 'text/x-mariadb';
  // get mime type
  if (window.location.href.indexOf('mime=') > -1) {
    mime = window.location.href.substr(window.location.href.indexOf('mime=') + 5);
  }
  window.editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    mode: mime,
    indentWithTabs: true,
    smartIndent: true,
    lineNumbers: true,
    matchBrackets: true,
    autofocus: true,
    extraKeys: {
      'Enter': false,
      'Ctrl-Space': 'autocomplete'
    }
  });
  /*
    window.editor.on('beforeSelectionChange',function(a,sel) { 
      console.log('beforeSelectionChange',sel.anchor);
      if (sel.anchor.hitSide && sel.anchor.outside)
        console.log("load!!", sel.anchor.xRel);
    });
  */
  StickyEditor();
});

// the goal here is to offset as much processing to the load or window resize events.
// scroll event needs to be as lightweight as possible since it can fire hundreds of times a second
// the scroll event should not do any DOM seeks or calculate sizes of elements

let stickies = [];

function stickyWindowResize() {
  for (var x = 0; x < stickies.length; x++) {
    let s = stickies[x],
      t = s.sOuter.offset().top;

    s.shInner[0].style.maxWidth = s.sfInner[0].style.maxWidth = s.sOuter.width() + 'px';
    s.hheight = s.sHeader.outerHeight();
    s.fheight = s.sFooter.outerHeight();
    s.top = Math.floor(t);
    s.bottom = Math.ceil(t + s.sOuter.outerHeight());
    s.sFooter[0].scrollTop = 10000000;
    s.windowh = $(window).height();
  }
}

function stickyWindowScroll(e) {
  let y = window.scrollY || document.documentElement.scrollTop,
    x = 0;

  for (x; x < stickies.length; x++) {
    let s = stickies[x],
      hstyle = s.sHeader[0].style,
      fstyle = s.sFooter[0].style;

    if (s.top - y > s.windowh || s.bottom - y < 0) {
      hstyle.position = fstyle.position = 'absolute';
      hstyle.top = fstyle.bottom = 0;
      hstyle.bottom = fstyle.top = 'auto';
      continue; // skip loop if top is below bottom window edge or bottom is above top window edge
    }

    if (s.bottom - s.hheight - s.fheight - y <= 0) {
      hstyle.position = 'absolute';
      hstyle.top = 'auto';
      hstyle.bottom = s.fheight + 'px';
    } else if (s.top - y <= 0) {
      hstyle.position = 'fixed';
      hstyle.top = 0;
      hstyle.bottom = 'auto';
    } else {
      hstyle.position = 'absolute';
      hstyle.top = 'auto';
      hstyle.bottom = 0;
    }

    if (s.top + s.hheight + s.fheight - y >= s.windowh) {
      fstyle.position = 'absolute';
      fstyle.bottom = 'auto';
      fstyle.top = s.hheight + 'px';
    } else if (s.bottom - y <= s.windowh) {
      fstyle.position = 'absolute';
      fstyle.bottom = 0;
      fstyle.top = 'auto';
    } else {
      fstyle.position = 'fixed';
      fstyle.bottom = 0;
      fstyle.top = 'auto';
    }
  }
}

function StickyEditor() {
  const stickylist = $('.sticky');

  if (!stickylist.length) return; // we don't need to be attaching any events if the necessary elements do not exist on the page
  stickylist.each(function (index, stickyItem) {
    let s = $(stickyItem),
      outer = s.parent('.outer'),
      cloneh = s.clone().addClass('jsTHEAD').appendTo(outer),
      chInner = cloneh.children('.inner'),
      clonef = cloneh.clone().removeClass('jsTHEAD').addClass('jsTFOOT').appendTo(outer),
      cfInner = clonef.children('.inner');

    outer.addClass('jsApplied');
    s.addClass('jsTBODY');
    s.scroll(function () {
      chInner[0].scrollLeft = cfInner[0].scrollLeft = this.scrollLeft;
    });
    stickies.push({
      sOuter: outer,
      sHeader: cloneh,
      shInner: chInner,
      sFooter: clonef,
      sfInner: cfInner
    });
  });
  $(window).resize(stickyWindowResize).scroll(stickyWindowScroll).resize().scroll();
}