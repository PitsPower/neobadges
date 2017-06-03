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
	discord: String,
	private: Boolean,
	profileType: String
});
mongoose.model('site', siteSchema);