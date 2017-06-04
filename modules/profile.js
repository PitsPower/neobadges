var mongoose = require('mongoose');
var request = require('request');
var cheerio = require('cheerio');
var favicon = require('favicon');

var Site = mongoose.model('site');

module.exports.get = function(site, discord, cb) {
    Site.find({name:site}, function(err, sites) {
        if (err) return console.log(err);
        
        var siteData = sites[0];
        
        if (siteData) {
            if (siteData.profileType) {
                console.log('Profile option found!');
                
                if (siteData.profileType=='website') getWebsiteProfile(site,cb);
                if (siteData.profileType=='favicon') getFavicon(site,cb);
                if (siteData.profileType=='discord') discord.getProfile(site,cb);
            } else {
                console.log('No profile option found. Setting option to default...');
                Site.update({name:site}, {
                    profileType: 'website'
                }, function(err) {
                    if (err) return console.log(err);
                    
                    getWebsiteProfile(site, cb);
                });
            }
        }
        else {
            console.log("Website doesn't exist. Terminating!");
        }
    });
}

function getWebsiteProfile(site, cb) {
    request('https://neocities.org/site/'+site, function(err, response, body) {
        if (err) return console.log(err);
        
        var $ = cheerio.load(body);
        cb('https://neocities.org'+$('.screenshot').attr('style').replace('background-image:url(','').replace(');',''));
    });
}
function getFavicon(site, cb) {
    favicon('https://'+site+'.neocities.org', function(err, url) {
        if (err) return console.log(err);
        if (url.indexOf('http')>-1) {
            cb(url);
        }
        else {
            if (url[0]=='/') {
                cb('https://'+site+'.neocities.org'+url);
            }
            else {
                cb('https://'+site+'.neocities.org/'+url);
            }
        }
    });
}