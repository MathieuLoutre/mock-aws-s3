/*
 * grunt-mock-s3
 * https://github.com/MathieuLoutre/grunt-mock-s3
 *
 * Copyright (c) 2013 Mathieu Triay
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('underscore');
var fs = require('fs-extra');
var crypto = require('crypto');
var path = require("path");

// Gathered from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
exports.walk = function (dir) {

	var results = [];
	var list = fs.readdirSync(path.join(exports._options.basePath, dir));

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

	exports._options = _.extend({
	  basePath: ''
	}, options);

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
	var basePath = exports._options.basePath;

	_.each(search.Delete.Objects, function (file) {

		var filename = path.join(basePath, search.Bucket, file.Key);

		if (fs.existsSync(filename)) {
			deleted.push(file);
			fs.unlinkSync(filename);
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

exports.deleteObject = function (search, callback) {

	var basePath = exports._options.basePath;
	var filename = path.join(basePath, search.Bucket, search.Key);

	if (fs.existsSync(filename)) {
		fs.unlinkSync(filename);
		callback(null, {});
	}
	else {
		callback("Error deleting object", null);
	}
};

function FakeStream (search) {
    var basePath = exports._options.basePath;
    this.src = path.join(basePath, search.Bucket, search.Key);
}

FakeStream.prototype.createReadStream = function () {
    return fs.createReadStream(this.src);
};

exports.getObject = function (search, callback) {
	var basePath = exports._options.basePath;
	var filename = path.join(basePath, search.Bucket, search.Key);

	if (!callback) {
		return new FakeStream(search);
	}
	else {
		fs.readFile(filename, function (err, data) {

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
	}
};

exports.putObject = function (search, callback) {

	var basePath = exports._options.basePath;
	var dest = path.join(basePath, search.Bucket, search.Key);

	if (search.Body instanceof Buffer) {
		fs.createFileSync(dest);
		fs.writeFile(dest, search.Body, function (err) {
			callback(err);
		});
	}
	else {
		fs.mkdirsSync(path.dirname(dest));

		var stream = fs.createWriteStream(dest);

		stream.on('finish', function () {
			callback(null, true);
		});

		search.Body.on('error', function (err) {
			callback(err);
		});

		stream.on('error', function (err) {
			callback(err);
		});

		search.Body.pipe(stream);
	}
};
