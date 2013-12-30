sqladmin
========
SQL Query Tool

sqladmin is a simple SQL shell (with GNU readline capabilities) and syntax highlighting. The goal of this tool is to replace the mysql CLI... but on serioids. 

Features
--------
* Syntax highlighting of SQL
* Shared history (even realtime between multiple browser windows, thanks to meteor)
* readline-like shortcuts
  * Hold Alt (mac: Cmd) and:
    * Up - previous entry in the history.
    * Down - next entry in the history.
    * Enter - submit the query.
* Ability to save and share results.

Screenshot
----------
![Screenshot](/img/screenshot.png "Sample Screenshot")

Install
-------
* Install meteor: 
    
        curl https://install.meteor.com | /bin/sh
    
* Download: 

        git clone https://github.com/mieweb/sqladmin.git
        cd sqladmin

* Configure:

        vi private/connection.json

* Run:

        meteor

TODO:
-----
* Allow modification of connection parameters from the front end.
  * server side limitations to allow for network security. 
* Display
  * improve the display of results in tabular form (see below).
* Store Results
  * Store results in the mongo collection for easy retrieval.
  * Allow stored results to dump back to mysql.
* Update
  * Rows should support update commands and allow editing results.
  * Option to trigger when updates should be sent to MySQL at the cell, row, or result set.
* Model Map
  * An object that describes all the tables in the db.
  * Built from the INFORMATION_SCHEMA, but indexed for quick look up. (similar to -A on the CLI)
  * Allows labeling of headings.
  * Makes auto-complete possible.
* Forgien Key Intellgence
  * FK relationships should be browseable from the result table.
  * FK rels should allow for auto-complete on updates.  Model map will help here.
* Stability
  * Better detection when meteor goes
 
TODO improve display:
---------------------
* pagenate / infinate scroll
  * Infinate scroll assumes result set does not change server side (ie: someone does an insert while scrolling)
* format column headers based on a Model Map
* format cells based on data type (ie: dates, numbers, strings)
* if all rows are retreived, support sorting, filtering, group by on browser
  * The plan is to force a limit, if that limit is not hit, then we know we have the full result set.
  * if not, then don't... but also if it is a simple query, WHERE, ORDER BY and LIMIT could be used server side. 
* Make results graph with d3.
