/*
 * grunt-aws-s3
 * https://github.com/MathieuLoutre/grunt-aws-s3
 *
 * Copyright (c) 2013 Mathieu Triay
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('underscore');
var fs = require('fs-extra');
var crypto = require('crypto');


// Gathered from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
exports.walk = function (dir) {
	
	var results = [];
	var list = fs.readdirSync(dir);

	list.forEach(function (file) {

		file = dir + '/' + file;
		var stat = fs.statSync(file);

		if (stat && stat.isDirectory()) {
			results = results.concat(exports.walk(file));
		}
		else {
			results.push(file);
		}
	});

	return results;
};

exports.S3 = function (options) {

	exports.endpoint = {
		href: ''
	};
	return exports;
};

exports.listObjects = function (search, callback) {

	var files = exports.walk(search.Bucket);

	var filtered_files = _.filter(files, function (file) { return file.replace(search.Bucket + '/', '').indexOf(search.Prefix) === 0; });
	var start = 0;
	var marker = null;
	var truncated = false;
	
	if (search.Marker) {
		start = filtered_files.indexOf(search.Bucket  + '/' + search.Marker);
	}

	filtered_files = _.rest(filtered_files, start);

	if (filtered_files.length > 1000) {
		truncated = true;
		filtered_files = filtered_files.slice(0, 1000);
	}

	var result = {
		Contents: _.map(filtered_files, function (path) {

			return {
				Key: path.replace(search.Bucket + '/', ''),
				ETag: '"' + crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex') + '"',
				LastModified: fs.statSync(path).mtime
			};
		}),
		IsTruncated: truncated
	};

	if (truncated) {
		result.Marker = _.last(result.Contents).Key;
	}

	callback(null, result);
};

exports.deleteObjects = function (search, callback) {

	var deleted = [];
	var errors = [];

	_.each(search.Delete.Objects, function (file) {

		if (fs.existsSync(search.Bucket + '/' + file.Key)) {
			deleted.push(file);
			fs.unlinkSync(search.Bucket + '/' + file.Key);
		}
		else {
			errors.push(file);
		}
	});

	if (errors.length > 0) {
		callback("Error deleting objects", {Errors: errors, Deleted: deleted});
	}
	else {
		callback(null, {Deleted: deleted});
	}
};

exports.getObject = function (search, callback) {

	fs.readFile(search.Bucket + '/' + search.Key, function (err, data) {

		if (!err) {
			callback(null, {
				Key: search.Key,
				ETag: '"' + crypto.createHash('md5').update(data).digest('hex') + '"',
				Body: data
			});
		}
		else {
			callback(err, search);			
		}
	});
};

exports.putObject = function (search, callback) {

	fs.createFileSync(search.Bucket + '/' + search.Key);
	fs.writeFile(search.Bucket + '/' + search.Key, search.Body, function (err) {

		callback(err);
	});
};