var mongoose = require('mongoose');

var stats = require('./stats');

var allBadges = [
	{
		name: 'birthday',
		desc: 'Have your website up for one whole year',
		type: 'greaterOrEqual',
		stat: 'yearsOld',
		value: 1
	},
	{
		name: 'experienced',
		desc: 'Have your website up for 5 years',
		type: 'greaterOrEqual',
		stat: 'yearsOld',
		value: 5
	},
	{
		name: 'grandpa',
		desc: 'Have your website up for 10 years',
		type: 'greaterOrEqual',
		stat: 'yearsOld',
		value: 10
	},
	{
		name: 'noticed',
		desc: 'Get featured',
		type: 'true',
		stat: 'featured'
	},
	{
		name: 'wizard',
		desc: 'Follow yourself',
		type: 'true',
		stat: 'followingSelf'
	},
	{
		name: 'break',
		desc: 'Update your site after a week of no activity',
		type: 'idleFor',
		days: 7
	},
	{
		name: 'mummy',
		desc: 'Update your site after a month of no activity',
		type: 'idleFor',
		days: 30
	},
	{
		name: 'zombie',
		desc: 'Update your site after a year of no activity',
		type: 'idleFor',
		days: 365
	},
	{
	    name: 'hotcakes',
		desc: 'Get 1,000 views in one day',
	    type: 'daily',
	    stat: 'views',
	    value: 1000
	},
	{
		name: 'discord',
		desc: 'Link your discord account to your neocities account'
	}
];
module.exports.all = allBadges;

var Site = mongoose.model('site');

module.exports.add = function(statObject, site, cb) {
	var badges = [];
	
	console.log('Adding badges...');
	
	for (var i=0;i<allBadges.length;i++) {
		var badge = allBadges[i];
		
		if (badge.type=='greaterOrEqual') {
			if (statObject[badge.stat]>=badge.value) badges.push({
	        	name: badge.name,
	        	desc: badge.desc
	        });
		}
		if (badge.type=='true') {
			if (statObject[badge.stat]) badges.push({
	        	name: badge.name,
	        	desc: badge.desc
	        });
		}
	}
	
	Site.find({name:site}, function(err, sites) {
		if (err) return console.log(err);
		
		if (sites.length==0) {
			console.log('No site data found! Adding site to database...');
			var siteModel = new Site({
				name: site,
				badges: badges.map(function(badge) {
					return badge.name
				}),
				lastCheck: new Date().getTime(),
				daysIdle: statObject.daysIdle
			});
			siteModel.save(function(err) {
				if (err) return console.log(err);
				
				statObject.badges = badges;
				cb(statObject);
			});
		}
		else {
			var siteData = sites[0];
			
			for (var i=0;i<allBadges.length;i++) {
				var badge = allBadges[i];
				var complete = false;
				
				if (siteData.badges.indexOf('discord')>-1 && badge.name=='discord') badges.push({
		        	name: badge.name,
		        	desc: badge.desc
		        });
				
				if (badge.type=='idleFor') {
				    if (siteData.daysIdle >= badge.days) {
					    if (statObject.daysIdle < badge.days) {
					        badges.push({
					        	name: badge.name,
					        	desc: badge.desc
					        });
					        complete = true;
					    }
					}
					else if(siteData.badges.indexOf(badge.name)>-1) {
					    badges.push({
				        	name: badge.name,
				        	desc: badge.desc
				        });
					}
				}
				if (badge.type=='daily') {
				    if (siteData.lastDailyCheck) {
			            if (statObject[badge.stat] > siteData[badge.stat]+1000) {
			                badges.push({
					        	name: badge.name,
					        	desc: badge.desc
					        });
			                complete = true;
			            }
			            
				        if (new Date().getTime() - siteData.lastDailyCheck > 1000*60*60*24) {
				            var dailyUpdate = {lastDailyCheck:new Date().getTime()};
				            dailyUpdate[badge.stat] = statObject[badge.stat];
				            
				            Site.update({name:site}, dailyUpdate, {upsert: true}, function(err) {
            					if (err) return console.log(err);
            				});
				        }
				        else if (siteData.badges.indexOf(badge.name)>-1 && !complete) {
				            badges.push({
					        	name: badge.name,
					        	desc: badge.desc
					        });
				        }
				    }
				    else {
				        Site.update({name:site}, {
				            lastDailyCheck: new Date().getTime(),
				            views: statObject.views
						}, {upsert: true}, function(err) {
							if (err) return console.log(err);
						});
				    }
				}
    					        
    	        if (complete) {
    			    Site.update({name:site}, {
    					$addToSet: {
    						badges: badge.name
    					}
    				}, {upsert: true}, function(err) {
    					if (err) return console.log(err);
    				});
    			}
			}
			
			Site.update({name:site}, {
				daysIdle: statObject.daysIdle
			}, {upsert: true}, function(err) {
				if (err) return console.log(err);
			});
			
			statObject.badges = badges;
			cb(statObject);
		}
	});
}

module.exports.check = function(cb) {
    Site.find(function(err, sites) {
		if (err) return console.log(err);
		
		for (var i=0;i<sites.length;i++) {
		    var site = sites[i];
		    
		    stats.get(site, function(statObject, site) {
		        for (var i=0;i<allBadges.length;i++) {
    				var badge = allBadges[i];
    				var complete = false;
    				
    				if (site.badges.indexOf(badge.name)==-1) {
	    				if (badge.type=='idleFor') {
	    				    console.log('Checking if '+site.name+' can get the '+badge.name+' badge...');
	    					if (site.daysIdle>=badge.days && statObject.daysIdle<badge.days) {
	    					    complete = true;
	    					}
	    				}
	    				if (badge.type=='daily') {
	    				    console.log('Checking if '+site.name+' can get the '+badge.name+' badge...');
	    				    if (site.lastDailyCheck) {
					            if (statObject[badge.stat] > site[badge.stat]+1000) {
					                complete = true;
					            }
	    				        if (new Date().getTime() - site.lastDailyCheck > 1000*60*60*24) {
	        			            var dailyUpdate = {lastDailyCheck:new Date().getTime()};
	        			            dailyUpdate[badge.stat] = statObject[badge.stat];
	        			            
	    				            Site.update({name:site.name}, dailyUpdate, {upsert: true}, function(err) {
	                					if (err) return console.log(err);
	                				});
	    				        }
	    				    }
	    				    else {
	    				        Site.update({name:site.name}, {$set:{
	    				            lastDailyCheck: new Date().getTime(),
	    				            views: statObject.views
	    						}}, {upsert: true}, function(err) {
	    							if (err) return console.log(err);
	    						});
	    				    }
	    				}
    				}
    				
    				if (complete) {
						Site.update({name:site.name}, {
							$addToSet: {
								badges: badge.name
							}
						}, {upsert: true}, function(err) {
							if (err) return console.log(err);
							console.log('Awarded a badge to '+site.name+'!');
						});
    				}
    			}
		    },true);
		}
	});
	cb();
}

module.exports.award = function(site, badge, cb) {
	Site.find({name:site}, function(err, sites) {
		if (err) return console.log(err);
		if (sites[0].badges.indexOf(badge)==-1) {
			Site.update({name:site}, {
				$addToSet: {
					badges: badge
				}
			}, function(err) {
				if (err) return console.log(err);
				cb();
			});
		}
	});
}

module.exports.description = function(badge) {
	for (var i=0;i<allBadges.length;i++) {
		if (allBadges[i].name==badge) return allBadges[i].desc;
	}
}