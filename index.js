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

// LOGGING: one line per event on stdout, so `docker logs` and log collectors (Loki) see outages as they happen
function log(message){
    console.log(new Date().toISOString() + ' ' + message);
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
                log('INFO connection check running: online');
            }
        }

        if(!isAlive && !_outage){

            // new outage detected
            _outage = {
                begin: + new Date()
            };
            log('OUTAGE began: no reply from google.com');

        }else if(!isAlive && _outage){

            // the outage is pending

        }else if(_outage){

            // the outage has ended
            _outage.end = + new Date();
            log('OUTAGE ended after ' + Math.round((_outage.end - _outage.begin) / 1000) + 's');

            // insert the outage to the database
            outageCollection.insert(_outage, function(err, result){
                if (err){
                    log('ERROR could not save the outage: ' + err);
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
    log('INFO ISP logger is running on port ' + port + ', checking google.com every ' + (checkInterval / 1000) + 's');
});
