var request = require('request');
var cheerio = require('cheerio');
var sha1 = require('sha1');

var statTypes = ['views','followers','updates','tips','daysIdle','yearsOld','rank','supporter','featured','followingSelf'];
var totalStats = statTypes.length;

var cache;

module.exports.get = function(site, cb, noLog) {
	if (!site.name) site={name:site};
	
	getCache(site.name, function(c) {
		if (!c) {
			noLog?0:console.log('Website '+site.name+' does not exist! Terminating...');
			return cb();
		}
		cache = c;
		
		var statObject = {};
		var statsDone = 0;
	
		for (var i=0;i<totalStats;i++) {
			getStat(site.name, statTypes[i], function(data, stat) {
				statObject[stat] = data;
				statsDone++;
				if (statsDone==totalStats) return cb(statObject, site, c);
			},noLog);
		}
	},noLog);
}
		
function getStat(site,stat,cb,noLog) {
	noLog?0:console.log('Getting '+stat+'...');
	
	if (statTypes.indexOf(stat)>-1) {
		var data;
		if (stat=='followers' || stat=='updates' || stat=='tips' || stat=='supporter' || stat=='followingSelf') {
			data = handleSite(stat,site);
		}
		else if (stat=='rank') {
			data = handleBrowse(site);
		}
		else if (stat=='featured') {
			data = handleFeatured(site);
		}
		else {
			data = handleAPI(stat);
		}
		cb(data,stat);
	}
	else {
		cb('invalid data type');
	}
}

function getCache(site, cb, noLog) {
	var cache = {};
	
	var linkNames = ['site','browse','featured','api'];
	var links = ['/site/'+site,'/browse','/browse?sort_by=featured','/api/info?sitename='+site];
	var linksDone = 0;
	
	var exited = false;
	
	for (var i=0;i<links.length;i++) {
		noLog?0:console.log('Sending request to https://neocities.org'+links[i]);
		requestForWrapper('https://neocities.org'+links[i], function(err, response, body, i) {
			if (err) return console.log(err);
			
			if (response.statusCode==200) {
				cache[linkNames[i]] = body;
				linksDone++;
				if (linksDone==links.length) return cb(cache);
			}
			else if (!exited) {
				exited = true;
				cb();
			}
		}, i);
	}
}

function requestForWrapper(link,cb,i) {
	request(link, function(err,response,body) {
		cb(err,response,body,i);
	});
}

function handleSite(stat,site) {
	var $ = cheerio.load(cache.site);
	
	var data;
	if (stat=='supporter') {
		data = $('.supporter-badge').length>0;
	}
	else if (stat=='followingSelf') {
		data = $('.following-list a[href="/site/'+site+'"]').length>0;
	}
	else {
		data = $('.stat')
				.eq(statTypes.indexOf(stat))
				.eq(0)
				.find('strong')
				.text()
				.trim().replace(/,/g,'');
	}
	return data;
}
function handleBrowse(site) {
	var $ = cheerio.load(cache.browse);
	return ($('#username_'+site).index()+1);
}
function handleFeatured(site) {
	var $ = cheerio.load(cache.featured);
	return ($('#username_'+site).index()>0);
}
function handleAPI(stat) {
	var stats = JSON.parse(cache.api).info;

	if (stat=='views') return stats.views;
	if (stat=='daysIdle') {
		var timePassed = new Date().getTime() - new Date(stats['last_updated']).getTime();
		return Math.floor(timePassed/(1000*60*60*24));
	}
	if (stat=='yearsOld') {
		var timePassed = new Date().getTime() - new Date(stats['created_at']).getTime();
		return Math.floor(timePassed/(1000*60*60*24*365));
	}
}