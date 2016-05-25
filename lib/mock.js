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
var path = require('path');
var Buffer = require('buffer').Buffer;

var config = {};

// Gathered from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
function walk (dir) {

	var results = [];
	var list = fs.readdirSync(dir);

	list.forEach(function (file) {

		file = dir + '/' + file;
		var stat = fs.statSync(file);

		if (stat && stat.isDirectory()) {
			results = results.concat(walk(file));
		}
		else {
			results.push(file);
		}
	});

	return results;
}

/** Add basePath to selected keys */
function applyBasePath(search) {

	if (_.isUndefined(config.basePath)) {
		return search;
	}

	var modifyKeys = ['Bucket', 'CopySource'];
	
	var ret = _.mapObject(search, function (value, key) {
		if (_.indexOf(modifyKeys, key) === -1) {
			return value;
		}
		else {
			return config.basePath + '/' + value;
		}
	})

	return ret;
}

/** FakeStream object for mocking S3 streams */
function FakeStream (search) {
		this.src = search.Bucket + '/' + search.Key;
}

FakeStream.prototype.createReadStream = function () {
		return fs.createReadStream(this.src);
};

/** Mocks key pieces of the amazon s3 sdk */
function S3Mock(options) {
	if (!_.isUndefined(options) && !_.isUndefined(options.params)) {
		this.defaultOptions = _.extend({}, applyBasePath(options.params));
	}
	
	this.config = {
		update: function() {}
	};
}

S3Mock.prototype = {
	
	listObjects: function (search, callback) {
		
		search = _.extend({}, this.defaultOptions, applyBasePath(search));
		var files = walk(search.Bucket);

		var filtered_files = _.filter(files, function (file) { return !search.Prefix || file.replace(search.Bucket + '/', '').indexOf(search.Prefix) === 0; });
		var start = 0;
		var truncated = false;

		if (search.Marker) {
			var isPartial;
			var markerFile = _(filtered_files).find(function (file) {
			
			var marker = search.Bucket  + '/' + search.Marker;
				if (file.indexOf(marker) === 0) {
					isPartial = file.length == marker.length ? false : true;
					return true;
				}
			});

			var startFile;
			
			if (isPartial) {
				startFile = filtered_files[filtered_files.indexOf(markerFile)];
			}
			else {
				startFile = filtered_files[filtered_files.indexOf(markerFile) + 1];
			}

			start = filtered_files.indexOf(startFile);
		}

		if (start == -1) {
			filtered_files = [];
		}
		else {
			filtered_files = _.rest(filtered_files, start);
		}

		if (filtered_files.length > Math.min(1000, search.MaxKeys || 1000)) {
			truncated = true;
			filtered_files = filtered_files.slice(0, Math.min(1000, search.MaxKeys || 1000));
		}

		var result = {
			Contents: _.map(filtered_files, function (path) {
				
				var stat = fs.statSync(path);

				return {
					Key: path.replace(search.Bucket + '/', ''),
					ETag: '"' + crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex') + '"',
					LastModified: stat.mtime,
					Size: stat.size
				};
			}),
			CommonPrefixes: _.reduce(filtered_files, function (prefixes, path) {
				var prefix = path
					.replace(search.Bucket + '/', '')
					.split('/')
					.slice(0, -1)
					.join('/')
					.concat('/');
				return prefixes.indexOf(prefix) === -1 ? prefixes.concat([prefix]) : prefixes;
			}, []).map(function(prefix) {
				return {
					Prefix: prefix
				};
			}),
			IsTruncated: truncated
		};

		if (search.Marker) {
			result.Marker = search.Marker;
		}

		if (truncated && search.Delimiter) {
			result.NextMarker = _.last(result.Contents).Key;
		}

		callback(null, result);
	},

	deleteObjects: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search));

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
	},

	deleteObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search));

		if (fs.existsSync(search.Bucket + '/' + search.Key)) {
			fs.unlinkSync(search.Bucket + '/' + search.Key);
			callback(null, true);
		}
		else {
			callback(null, {});
		}
	},

	headObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search));

		if (!callback) {
			return new FakeStream(search);
		}
		else {
			fs.readFile(search.Bucket + '/' + search.Key, function (err, data) {

				if (!err) {
					callback(null, {
						Key: search.Key,
						ETag: '"' + crypto.createHash('md5').update(data).digest('hex') + '"',
						ContentLength: data.length
					});
				}
				else {
					if (err.code === 'ENOENT') {
						err.statusCode = 404;
					}
					callback(err, search);
				}
			});
		}
	},

	getObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search));

		if (!callback) {
			return new FakeStream(search);
		}
		else {
			fs.readFile(search.Bucket + '/' + search.Key, function (err, data) {

				if (!err) {
					callback(null, {
						Key: search.Key,
						ETag: '"' + crypto.createHash('md5').update(data).digest('hex') + '"',
						Body: data,
						ContentLength: data.length
					});
				}
				else {
					callback(err, search);
				}
			});
		}
	},

	copyObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search));

		fs.mkdirsSync(path.dirname(search.Bucket + '/' + search.Key));

		fs.copy(decodeURIComponent(search.CopySource), search.Bucket + '/' + search.Key, function (err, data) {
			callback(err, search);
		});
	},

	putObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search));

		var dest = search.Bucket + '/' + search.Key;

		var sendCallback = null;

		var done = function () {
			
			if (typeof sendCallback === "function") {
				sendCallback.apply(this, arguments);
			}
			
			if (typeof callback === "function") {
				callback.apply(this, arguments);
			}
		};

		if (typeof search.Body === 'string') {
			search.Body = new Buffer(search.Body);
		}

		if (search.Body instanceof Buffer) {
			fs.createFileSync(dest);
			fs.writeFile(dest, search.Body, function (err) {
				done(err);
			});
		}
		else {
			fs.mkdirsSync(path.dirname(dest));

			var stream = fs.createWriteStream(dest);

			stream.on('finish', function () {
				done(null, true);
			});

			search.Body.on('error', function (err) {
				done(err);
			});

			stream.on('error', function (err) {
				done(err);
			});

			search.Body.pipe(stream);
		}
		return {
			send: function (cb) {
				sendCallback = cb;
			}
		}
	},

	upload: function (search, options, callback) {
		if (typeof options === 'function' && callback === undefined) {
			callback = options;
			options = null;
		}

		return this.putObject(search, callback);
	}

};

exports.config = config;

exports.S3 = function (options) {
	return new S3Mock(options);
};
