var express = require('express');
var app = express();

var cors = require('cors');
app.use(cors());

var request = require('request');

var mongoose = require('mongoose');
mongoose.connect('mongodb://'+process.env.IP+':27017/neobadges');
require('./models/site');

var stats = require('./modules/stats');
var badges = require('./modules/badges');
var profile = require('./modules/profile');
var discord = require('./modules/discord');

var _log = console.log;
console.log = function(msg) {
	_log('['+new Date(new Date().getTime()+1000*60*60).toLocaleTimeString({},{hour12:false})+'] '+msg);
}

app.get('/:site', function(req, res) {
	var currentTime = new Date().getTime();
	
	var site = req.params.site;
	console.log('Getting stats for '+site+'...');
		
	stats.get(site, function(statObject) {
		if (statObject) {
			badges.add(statObject, site, function(data) {
				console.log('Finished in '+(new Date().getTime()-currentTime)+'ms!');
				res.json(data);
			});
		}
		else {
			res.send('notfound');
		}
	});
});
app.get('/:site/profile.png', function(req, res) {
	var site = req.params.site;
	console.log('Getting profile for '+site+'...');
	
	profile.get(site, discord, function(img) {
		console.log('Got profile URL: '+img);
		request(img).pipe(res);
	});
});

function checkLoop() {
	console.log('Starting setTimeout...');
	setTimeout(function() {
		console.log('Checking for badges...');
		badges.check(checkLoop);
	},1000*60*15);
}
badges.check(checkLoop);

var server = require('http').createServer(app);
server.listen(process.env.PORT, process.env.IP, function() {
	console.log('Server started!');
});