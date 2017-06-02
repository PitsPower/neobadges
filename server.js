var express = require('express');
var app = express();

var cors = require('cors');
app.use(cors());

var mongoose = require('mongoose');
mongoose.connect('mongodb://'+process.env.IP+':27017/neobadges');
require('./models/site');

var stats = require('./modules/stats');
var badges = require('./modules/badges');
require('./modules/discord');

var _log = console.log;
console.log = function(msg) {
	_log('['+new Date(new Date().getTime()+1000*60*60).toLocaleTimeString({},{hour12:false})+'] '+msg);
}

app.get('/site/:site', function(req, res) {
	var currentTime = new Date().getTime();
	
	var site = req.params.site;
	console.log('Getting stats for '+site+'...');
		
	stats.get(site, function(statObject) {
		badges.add(statObject, site, function(data) {
			console.log('Finished in '+(new Date().getTime()-currentTime)+'ms!');
			res.json(data);
		});
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