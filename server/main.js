const Fiber = require('fibers');
const Mysql = require('mysql');
Meteor.startup(() => {
  Meteor.publish('sqlcmds', function () {
    return SQLCmds.find();
  });

  Meteor.methods({
    DBExec: function (exec, nest) {
      // console.log('DBExec: ', query);  
      query = exec.q;
      let connection;
      try {
        let multi = false;
        if (exec.multipleStatements === '1') {
          multi = true;
        }
        connection = Mysql.createConnection({
          'host': exec.hostname,
          'user': exec.username,
          'password': exec.password,
          'database': exec.database,
          'multipleStatements': multi
        });
      } catch (e) {
        console.log('in DBExec, createConnection error:', e);
        // treat errors as regular results.
        let err = [{}];
        err[0]['context'] = 'in DBExec, createConnection';
        err[0]['name'] = e.name;
        err[0]['message'] = e.message;
        err[0]['stack'] = e.stack;

        return err;
      }
      const fiber = Fiber.current;

      if (typeof nest == 'undefined') next = false;
      let options = {
        sql: query,
        nestTables: nest
      };
      connection.query(options, function (err, tables) {
        if (err) {
          // treat errors as regular results.
          tables = [{}];
          tables[0]['name'] = err.name;
          tables[0]['message'] = err.message;
          for (var e in err) {
            tables[0][e] = err[e];
          }
        }

        connection.end();
        fiber.run(tables);
      });
      return Fiber.yield();;
      // console.log('This is res:',res);
    }
  })
});
