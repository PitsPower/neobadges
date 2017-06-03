var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var siteSchema = new Schema({
	name: String,
	badges: [
		String
	],
	lastDailyCheck: Number,
	views: Number,
	daysIdle: Number,
	discord: String
});
mongoose.model('site', siteSchema);