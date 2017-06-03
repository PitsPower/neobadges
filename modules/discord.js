var Discord = require('discord.js');
var client = new Discord.Client();

var mongoose = require('mongoose');
var request = require('request');
var cheerio = require('cheerio');
var sha1 = require('sha1');

var stats = require('./stats');
var badges = require('./badges');

var Site = mongoose.model('site');

client.on('ready', function() {
	client.user.setUsername('BadgeBot');
	client.user.setGame('n!help');
	console.log('BadgeBot is active!');
});

var commands = [
    {
        name: 'link',
        desc: 'Links your account to your neocities account',
        example: 'Use your neocities website name: e.g. `n!link kyledrake`',
        action: function(msg, args) {
            var site = args[0];
            if (site) {
            	console.log('Generating site data...');
	            stats.get(site, function(statObject,_,cache) {
	            	if (statObject) {
		            	badges.add(statObject, site, function() {
		            		if (hasDiscordCode(site,msg.author,cache)) {
								badges.award(site, 'discord', function() {
								    msg.channel.send(msg.author + ' has linked their account to '+site+'! Enjoy the badge!');
								});
								Site.update({name:site}, {
								    discord: msg.author
								}, function(err) {
								    if (err) return console.log(err);
								    console.log('Put discord name in database!');
								});
		            		}
		            		else {
		            			msg.channel.send("To make sure "+site+" is actually you, post this as a message on your neocities page (you can delete it later):\n\n`"+sha1(msg.author)+"`\n\nType `n!link "+site+"` again once you're done.");
		            		}
		            	});
	            	}
	            	else {
	            		msg.channel.send("That website doesn't exist!");
	            	}
	            },true);
            }
            else {
            	msg.channel.send(this.example);
            }
        }
    },
    {
        name: 'badges',
        desc: "Lists all of your badges, or lists someone else's badges",
        example: '`n!badges` or `n!badges kyledrake`',
        action: function(msg, args) {
        	if (args[0]) {
        		var site = args[0];
            	msg.channel.send('Please wait while we get '+site+"'s badges...").then(function(message) {
                    displayBadges(site,message);
            	});
        	}
        	else {
	        	checkIfLinked(msg, function(sites) {
	            	msg.channel.send('Please wait while we get your badges...').then(function(message) {
	                    displayBadges(sites[0].name,message);
	            	});
	        	});
        	}
        }
    },
    {
    	name: 'stats',
    	desc: "Lists all of your stats, or lists someone else's stats",
    	example: '`n!stats` or `n!stats kyledrake`',
    	action: function(msg, args) {
        	if (args[0]) {
        		var site = args[0];
            	msg.channel.send('Please wait while we get '+site+"'s stats...").then(function(message) {
                    displayStats(site,message);
            	});
        	}
        	else {
	        	checkIfLinked(msg, function(sites) {
	            	msg.channel.send('Please wait while we get your stats...').then(function(message) {
	                    displayStats(sites[0].name,message);
	            	});
	        	});
        	}
    	}
    },
    {
    	name: 'random',
    	desc: "Lists the stats of a random neocities site",
    	example: '`n!random`',
    	action: function(msg, args) {
    		console.log('Getting a random website...');
    		request('https://neocities.org/browse?page='+~~(Math.random()*100), function(err, response, body) {
    			if (err) return console.log(err);
    			
    			var $ = cheerio.load(body);
    			var site = $('.website-Gallery li').eq(~~(Math.random()*100)).attr('id').replace('username_','');
    			
    			console.log('Found site: '+site+'!');
    			
    			msg.channel.send('Please wait while we get '+site+"'s stats...").then(function(message) {
                    displayStats(site,message);
            	});
    		});
    	}
    }
];

function displayStats(site,message) {
	stats.get(site, function(statObject) {
		if (statObject) {
			var statArray = [];
			var statsToShow = ['rank','views','followers','updates','tips'];
			for (var i=0;i<statsToShow.length;i++) {
				var emojiToShow = 'thinking';
				var statToShow = statsToShow[i];
				var statValue = statObject[statToShow];
				
				if (statToShow=='rank') emojiToShow = 'trophy';
				if (statToShow=='views') emojiToShow = 'eyes';
				if (statToShow=='followers') emojiToShow = 'white_check_mark';
				if (statToShow=='updates') emojiToShow = 'construction';
				if (statToShow=='tips') emojiToShow = 'moneybag';
				
				if (statToShow=='rank') {
					switch (statValue%10) {
						case 1:
							statValue += 'st';
							break;
						case 2:
							statValue += 'nd';
							break;
						case 3:
							statValue += 'rd';
							break;
						default:
							statValue += 'th';
							break;
					}
				}
				
				statArray.push(':'+emojiToShow+':  '+capital(statToShow)+': '+statValue);
			}
			
		    message.edit({embed: {
		    	color: 16762454,
		        title: '__**'+capital(site)+"'s Stats**__",
		        url: 'https://neocities.org/site/'+site,
		        description: statArray.join('\n')
		    }});
		}
		else {
			message.edit("That website doesn't exist!");
		}
	});
}

function displayBadges(site,message) {
	stats.get(site, function(statObject) {
		if (statObject) {
			badges.add(statObject, site, function(data) {
			    message.edit({embed: {
			    	color: 16762454,
			        title: '__**'+capital(site)+"'s Badges**__",
		        	url: 'https://neocities.org/site/'+site,
			        description: data.badges.map(function(badge) {
	    		        return ':medal:  '+capital(badge)+' - '+badges.description(badge);
	    		    }).join('\n')
			    }});
			});
		}
		else {
			message.edit("That website doesn't exist!");
		}
	});
}

function checkIfLinked(msg,cb) {
	Site.find({discord:msg.author}, function(err, sites) {
        if (err) return console.log(err);
        
        if (sites.length==0) {
            msg.channel.send('You are not linked to your neocities account! Link your account with the `n!link` command.');
        }
        else {
        	cb(sites);
        }
    });
}

function hasDiscordCode(site,discordName,cache) {
	console.log('Checking for discord code...');
	console.log('Discord ID: '+discordName);
	console.log('Discord code: '+sha1(discordName));
	
	var $ = cheerio.load(cache.site);
	
	var hasCode = false;
	$('.comment').each(function() {
		if ($(this).find('.title .text a').text()==site && $(this).find('.content').first().text().trim()==sha1(discordName)) {
			console.log('Discord code found!');
			hasCode = true;
			return;
		}
	});
	return hasCode;
}

function capital(str) {
	return str[0].toUpperCase()+str.substr(1,str.length);
}

var commandStart = 'n!';
client.on('message', function(msg) {
	if (msg.content.match(/^(n!).+/)) {
		var command = msg.content.split(' ')[0].replace(commandStart,'');
		var args = msg.content.split(' ');
		args.shift();
		
		for (var i=0;i<commands.length;i++) {
		    if (command == commands[i].name) {
		        commands[i].action(msg, args);
		    }
		}
		if (command == 'help') {
		    var helpArray = [];
    		for (var i=0;i<commands.length;i++) {
    		    var command = commands[i];
    		    helpArray.push({
    		        name: 'n!'+command.name,
    		        value: command.desc+'\n('+command.example+')'
    		    });
    		}
    		msg.channel.send({embed: {
    		    color: 16762454,
    		    fields: helpArray
    		}});
		}
	}
});

client.login('MzE5OTA5MDgyMTkyNTQzNzY2.DBHyUw.pbcXeF9XN00aSJiRIg97Rc7pgFI');