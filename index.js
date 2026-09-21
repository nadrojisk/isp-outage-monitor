/**
 * ISP Outage checker
 *
 * This script detects connection loss to the internet and provides a simple
 * webinterface to show all outages detected.
 *
 * @author Maximilian Strehse <max@strehse.eu>
 * @license MIT
 */

var ping = require('ping');
var express = require('express');
var path = require('path');

// CONFIGURATION
var checkInterval = 5000;   // interval to check for connection loss
var port = 8080;            // web interface port
var limit = 10;            // api limit per page

// SOME TEMP VARIABLES
var app = express();
var _outage = null;
var online = false;
var firstCheck = true;

// LOGGING: one JSON object per line on stdout, so `docker logs` and log collectors (Loki) see outages as they happen
function log(level, message, fields){
    var entry = { time: new Date().toISOString(), level: level, msg: message };
    for(var key in fields){ entry[key] = fields[key]; }
    console.log(JSON.stringify(entry));
}

// INITIALISE THE DATABASE
var Engine = require('tingodb')();
var db = new Engine.Db('./database', {});
var outageCollection = db.collection("outages");

// check for connection loss
setInterval(function(){

    ping.sys.probe('google.com', function(isAlive){

        online = isAlive;

        if(firstCheck){
            firstCheck = false;
            if(isAlive){
                log('info', 'connection check running: online', { event: 'check_online' });
            }
        }

        if(!isAlive && !_outage){

            // new outage detected
            _outage = {
                begin: + new Date()
            };
            log('warn', 'outage began: no reply from google.com', { event: 'outage_began', target: 'google.com' });

        }else if(!isAlive && _outage){

            // the outage is pending

        }else if(_outage){

            // the outage has ended
            _outage.end = + new Date();
            var seconds = Math.round((_outage.end - _outage.begin) / 1000);
            log('warn', 'outage ended after ' + seconds + 's', { event: 'outage_ended', duration_s: seconds });

            // insert the outage to the database
            outageCollection.insert(_outage, function(err, result){
                if (err){
                    log('error', 'could not save the outage: ' + err, { event: 'save_failed' });
                    throw err;
                }
            });

            _outage = null;

        }
    });
}, checkInterval);

/**
 * API Endpoint to retreave the list of outages
 */
app.get('/api/outages', function (req, res) {

    var skip = req.query.p * limit;

    var result = outageCollection.find({},{"limit": limit, "skip": skip}).sort({_id: -1}).toArray(function(err, result){
        if (err) throw err;

        var result = result;

        outageCollection.count(function(err, num){

            var out = {
                limit: limit,
                count: num,
                outages: result,
                online: online
            };
            res.json(out);
        });
    });
});

app.get('/api/status', function(req, res) {
    res.json(online);
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.use(express.static('public'));

app.listen(port, function () {
    log('info', 'ISP logger is running', { event: 'started', port: port, target: 'google.com', interval_s: checkInterval / 1000 });
});
