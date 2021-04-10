/*
 * grunt-mock-s3
 * https://github.com/MathieuLoutre/grunt-mock-s3
 *
 * Copyright (c) 2013 Mathieu Triay
 * Licensed under the MIT license.
 */

'use strict'

var _ = require('underscore')
var fs = require('fs-extra')
var crypto = require('crypto')
var path = require('path')
var Buffer = require('buffer').Buffer
var Promise = require('bluebird')
var path = require('path')
var config = {}

// Gathered from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
function walk (dir) {
	var results = []
	var list = fs.readdirSync(dir)

	list.forEach(function (file) {
		file = dir + '/' + file
		var stat = fs.statSync(file)

		if (stat && stat.isDirectory()) {
			results = results.concat(walk(file))
		}
		else {
			results.push(file)
		}
	})

	return results
}

/** Add basePath to selected keys */
function applyBasePath (search) {
	if (_.isUndefined(config.basePath)) {
		return search
	}

	var modifyKeys = ['Bucket', 'CopySource']

	var ret = _.mapObject(search, function (value, key) {
		if (_.indexOf(modifyKeys, key) === -1) {
			return value
		}
		else {
			if (config.basePath == null || value == null) {
				return
			}
			return path.join(config.basePath, value)
		}
	})

	return ret
}

/** FakeStream object for mocking S3 streams */
function FakeStream (search) {
	this.src = search.Bucket + '/' + search.Key
}

FakeStream.prototype.createReadStream = function () {
	return fs.createReadStream(this.src)
}

/**
 * Decorate a method to enable calling `.promise()` on the returned value to get a Promise, when the method
 * is initially called without a callback.
 * @decorator
 * @private
 */
function createPromisable (wrapped) {
	return function () {
		var self = this
		var promisified = Promise.promisify(wrapped, { context: self })
		var args = [].slice.call(arguments)
		var callback = null
		var lastArgIndex = Math.min(args.length - 1, wrapped.length)

		if (args.length >= 1) {
			var lastArg = args[lastArgIndex]

			if (_.isFunction(lastArg)) {
				callback = lastArg
			}
		}

		if (!_.isFunction(callback)) {
			return {
				createReadStream: function () {
					this.send()

					if (this._returned instanceof FakeStream) {
						return this._returned.createReadStream()
					}
				},
				promise: function () {
					return promisified.apply(self, args)
				},
				send: function (cb) {
					args.push(cb)
					this._returned = wrapped.apply(self, args)
				}
			}
		}
		else {
			wrapped.apply(self, args)
		}
	}
}

/** Mocks key pieces of the amazon s3 sdk */
function S3Mock (options) {
	if (!_.isUndefined(options) && !_.isUndefined(options.params)) {
		this.defaultOptions = _.extend({}, applyBasePath(options.params))
	}

	this.config = {
		update: function () {}
	}
}

S3Mock.prototype = {
	objectMetadataDictionary: [],
	objectTaggingDictionary: [],

	listObjectsV2: function (searchV2, callback) {
		var searchV1 = _(searchV2).clone()
		// Marker in V1 is StartAfter in V2
		// ContinuationToken trumps marker on subsequent requests.
		searchV1.Marker = searchV2.ContinuationToken || searchV2.StartAfter

		this.listObjects(searchV1, function (err, resultV1) {
			var resultV2 = _(resultV1).clone()
			// Rewrite NextMarker to NextContinuationToken
			resultV2.NextContinuationToken = resultV1.NextMarker
			// Remember original ContinuationToken and StartAfter
			resultV2.ContinuationToken = searchV2.ContinuationToken
			resultV2.StartAfter = searchV2.StartAfter
			callback(err, resultV2)
		})
	},

	listObjects: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search))
		var files = walk(search.Bucket)

		var filteredFiles = _.filter(files, function (file) {
			return !search.Prefix || file.replace(search.Bucket + '/', '').indexOf(search.Prefix) === 0
		})
		var start = 0
		var truncated = false

		if (search.Marker) {
			var isPartial
			var markerFile = _(filteredFiles).find(function (file) {
				var marker = search.Bucket + '/' + search.Marker

				if (file.indexOf(marker) === 0) {
					isPartial = file.length !== marker.length

					return true
				}
			})

			var startFile

			if (isPartial) {
				startFile = filteredFiles[filteredFiles.indexOf(markerFile)]
			}
			else {
				startFile = filteredFiles[filteredFiles.indexOf(markerFile) + 1]
			}

			start = filteredFiles.indexOf(startFile)
		}

		if (start === -1) {
			filteredFiles = []
		}
		else {
			filteredFiles = _.rest(filteredFiles, start)
		}

		if (filteredFiles.length > Math.min(1000, search.MaxKeys || 1000)) {
			truncated = true
			filteredFiles = filteredFiles.slice(0, Math.min(1000, search.MaxKeys || 1000))
		}

		var result = {
			Contents: _.map(filteredFiles, function (path) {
				var stat = fs.statSync(path)

				return {
					Key: path.replace(search.Bucket + '/', ''),
					ETag: '"' + crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex') + '"',
					LastModified: stat.mtime,
					Size: stat.size
				}
			}),
			CommonPrefixes: _.reduce(filteredFiles, function (prefixes, path) {
				var prefix = path
					.replace(search.Bucket + '/', '')
					.split('/')
					.slice(0, -1)
					.join('/')
					.concat('/')

				return prefixes.indexOf(prefix) === -1 ? prefixes.concat([prefix]) : prefixes
			}, []).map(function (prefix) {
				return {
					Prefix: prefix
				}
			}),
			IsTruncated: truncated
		}

		if (search.Marker) {
			result.Marker = search.Marker
		}

		if (truncated && search.Delimiter) {
			result.NextMarker = _.last(result.Contents).Key
		}

		callback(null, result)
	},

	deleteObjects: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search))

		var deleted = []
		var errors = []

		_.each(search.Delete.Objects, function (file) {
			if (fs.existsSync(search.Bucket + '/' + file.Key)) {
				deleted.push(file)
				fs.unlinkSync(search.Bucket + '/' + file.Key)
			}
			else {
				errors.push(file)
			}
		})

		if (errors.length > 0) {
			callback('Error deleting objects', { Errors: errors, Deleted: deleted })
		}
		else {
			callback(null, { Deleted: deleted })
		}
	},

	deleteObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search))

		if (fs.existsSync(search.Bucket + '/' + search.Key)) {
			fs.unlinkSync(search.Bucket + '/' + search.Key)
			callback(null, true)
		}
		else {
			callback(null, {})
		}
	},

	headObject: function (search, callback) {
		var self = this

		search = _.extend({}, this.defaultOptions, applyBasePath(search))

		if (!callback) {
			return new FakeStream(search)
		}
		else {
			fs.readFile(search.Bucket + '/' + search.Key, function (err, data) {
				if (!err) {
					var props = {
						Key: search.Key,
						ETag: '"' + crypto.createHash('md5').update(data).digest('hex') + '"',
						ContentLength: data.length
					}

					if (self.objectMetadataDictionary[search.Key]) {
						props.Metadata = self.objectMetadataDictionary[search.Key]
					}

					callback(null, props)
				}
				else {
					if (err.code === 'ENOENT') {
						err.statusCode = 404
					}

					callback(err, search)
				}
			})
		}
	},

	getObject: function (search, callback) {
		var self = this
		search = _.extend({}, this.defaultOptions, applyBasePath(search))

		if (!callback) {
			return new FakeStream(search)
		}
		else {
			var path = search.Bucket + '/' + search.Key

			fs.readFile(path, function (err, data) {
				if (!err) {
					var stat = fs.statSync(path)

					var props = {
						Key: search.Key,
						ETag: '"' + crypto.createHash('md5').update(data).digest('hex') + '"',
						Body: data,
						LastModified: stat.mtime,
						ContentLength: data.length
					}

					if (self.objectMetadataDictionary[search.Key]) {
						props.Metadata = self.objectMetadataDictionary[search.Key]
					}

					callback(null, props)
				}
				else {
					if (err.code === 'ENOENT') {
						return callback({
							cfId: undefined,
							code: 'NoSuchKey',
							message: 'The specified key does not exist.',
							name: 'NoSuchKey',
							region: null,
							statusCode: 404
						}, search)
					}

					callback(err, search)
				}
			})
		}
	},

	copyObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search))

		fs.mkdirsSync(path.dirname(search.Bucket + '/' + search.Key))
		fs.copy(decodeURIComponent(search.CopySource), search.Bucket + '/' + search.Key, function (err, data) {
			callback(err, search)
		})
	},

	createBucket: function (params, callback) {
		var err = null

		// param prop tests - these need to be done here to avoid issues with defaulted values
		if (typeof (params) === 'object' && params !== null) { // null is an object, at least in older V8's
			// Bucket - required, String
			if (typeof (params.Bucket) !== 'string' || params.Bucket.length <= 0) {
				// NOTE: This *will not* match the error provided by the AWS SDK - but that's chasing a moving target
				err = new Error("Mock-AWS-S3: Argument 'params' must contain a 'Bucket' (String) property")
			}

			// Should we check the remaining props of the params Object? (probably)
		}
		else {
			err = new Error("Mock-AWS-S3: Argument 'params' must be an Object")
		}

		// Note: this.defaultOptions is an object which was passed in to the constructor
		var opts = _.extend({}, this.defaultOptions, applyBasePath(params))

		// If the params object is well-formed...
		if (err === null) {
			// We'll assume that if basePath is set, it's correctly set (i.e. data type etc.) and if not...
			// we'll default to the local dir (which seems to be the existing behaviour - in e.g. putObject)
			// It would be nicer if there were a strongly defined default
			var bucketPath = opts.basePath || ''
			bucketPath += opts.Bucket

			fs.mkdirs(bucketPath, function (err) {
				return callback(err)
			})
		}
		else { // ...if the params object is not well-formed, fail fast
			return callback(err)
		}
	},

	/**
	 * Deletes a bucket. Behaviour as createBucket
	 * @param params {Bucket: bucketName}. Name of bucket to delete
	 * @param callback
	 * @returns void
	 */
	deleteBucket: function (params, callback) {
		var err = null

		if (typeof (params) === 'object' && params !== null) {
			if (typeof (params.Bucket) !== 'string' || params.Bucket.length <= 0) {
				err = new Error("Mock-AWS-S3: Argument 'params' must contain a 'Bucket' (String) property")
			}
		}
		else {
			err = new Error("Mock-AWS-S3: Argument 'params' must be an Object")
		}

		var opts = _.extend({}, this.defaultOptions, applyBasePath(params))

		if (err !== null) {
			callback(err)
		}

		var bucketPath = opts.basePath || ''
		bucketPath += opts.Bucket

		fs.remove(bucketPath, function (err) {
			return callback(err)
		})
	},

	putObject: function (search, callback) {
		search = _.extend({}, this.defaultOptions, applyBasePath(search))

		if (search.Metadata) {
			this.objectMetadataDictionary[search.Key] = search.Metadata
		}

		if (typeof search.Tagging === 'string') {
			// URL query parameter encoded
			var tags = {}
			var tagSet = []

			// quick'n'dirty parsing into an object (does not support hashes or arrays)
			search.Tagging.split('&').forEach(function (part) {
				var item = part.split('=')
				tags[decodeURIComponent(item[0])] = decodeURIComponent(item[1])
			})

			// expand into tagset
			Object.keys(tags).forEach(function (key) {
				tagSet.push({
					Key: key,
					Value: tags[key]
				})
			})

			this.objectTaggingDictionary[search.Key] = tagSet
		}

		var dest = search.Bucket + '/' + search.Key

		var sendCallback = null

		var done = function () {
			if (typeof sendCallback === 'function') {
				sendCallback.apply(this, arguments)
			}

			if (typeof callback === 'function') {
				callback.apply(this, arguments)
			}
		}

		if (typeof search.Body === 'string') {
			search.Body = Buffer.from(search.Body)
		}

		if (search.Body instanceof Buffer) {
			fs.createFileSync(dest)

			fs.writeFile(dest, search.Body, function (err) {
				done(err, { Location: dest, Key: search.Key, Bucket: search.Bucket })
			})
		}
		else {
			fs.mkdirsSync(path.dirname(dest))

			var stream = fs.createWriteStream(dest)

			stream.on('finish', function () {
				done(null, true)
			})

			search.Body.on('error', function (err) {
				done(err)
			})

			stream.on('error', function (err) {
				done(err)
			})

			search.Body.pipe(stream)
		}

		return {
			send: function (cb) {
				sendCallback = cb
			}
		}
	},

	getObjectTagging: function (search, callback) {
		var self = this

		this.headObject(search, function (err, props) {
			if (err) {
				return callback(err)
			}
			else {
				return callback(null, {
					VersionId: '1',
					TagSet: self.objectTaggingDictionary[search.Key] || []
				})
			}
		})
	},

	putObjectTagging: function (search, callback) {
		var self = this

		if (!search.Tagging || !search.Tagging.TagSet) {
			return callback(new Error('Tagging.TagSet required'))
		}

		this.headObject(search, function (err, props) {
			if (err) {
				return callback(err)
			}
			else {
				self.objectTaggingDictionary[search.Key] = search.Tagging.TagSet

				return callback(null, {
					VersionId: '1'
				})
			}
		})
	},

	upload: function (search, options, callback) {
		if (typeof options === 'function' && callback === undefined) {
			callback = options
			options = null
		}

		if (options && options.tags) {
			if (!Array.isArray(options.tags)) {
				return callback(new Error('Tags must be specified as an array; ' + typeof options.tags + ' provided'))
			}
		}

		return this.putObject(search, function (err, data) {
			if (options && options.tags) {
				// https://github.com/aws/aws-sdk-js/pull/1425
				return this.putObjectTagging({
					Bucket: search.Bucket,
					Key: search.Key,
					Tagging: {
						TagSet: options.tags
					}
				}, function (err) {
					if (err) {
						return callback(err)
					}

					return callback(null, data)
				})
			}

			return callback(err, data)
		}.bind(this))
	},

	getSignedUrl: function (operation, params, callback) {
		var url = 'https://s3.us-east-2.amazonaws.com/' +
			params.Bucket +
			'/' + params.Key +
			'?X-Amz-Date=20170720T182534Z&X-Amz-SignedHeaders=host' +
			'&X-Amz-Credential=ASIAIYLQNVRRFNZOCFBA%2F20170720%2' +
			'Fus-east-2%2Fs3%2Faws4_request&X-Amz-Algorithm=AWS4-HMAC-SHA256&X' +
			'-Amz-Expires=604800&X-Amz-Security-Token=FQoDYXdzEJP%2F%2F%2F%2F%2' +
			'F%2F%2F%2F%2F%2FwEaDOLWx95j90zPxGh7WSLdAVnoYoKC4gjrrR1xbokFWRRwutm' +
			'uAmOxaIVcQqOy%2Fqxy%2FXQt3Iz%2FohuEEmI7%2FHPzShy%2BfgQtvfUeDaojrAx' +
			'5q8fG9P1KuIfcedfkiU%2BCxpM2foyCGlXzoZuNlcF8ohm%2BaM3wh4%2BxQ%2FpSh' +
			'Ll18cKiKEiw0QF1UQGj%2FsiEqzoM81vOSUVWL9SpTTkVq8EQHY1chYKBkBWt7eIQc' +
			'xjTI2dQeYOohlrbnZ5Y1%2F1cxPgrbk6PkNFO3whAoliSjyRC8e4TSjIY2j3V6d9fU' +
			'y4%2Fp6nLZIf9wuERL7xW9PjE6eZbKOHnw8sF&X-Amz-Signature=a14b3065ab82' +
			'2105e8d7892eb5dcc455ddd603c61e47520774a7289178af9ecc'

		switch (operation) {
			case 'getObject':
				this.headObject(params, function (err, props) {
					if (err) {
						err.statusCode = 404
					}
					if (callback) {
						if (err) {
							callback(err, null)
						}
						else {
							callback(null, url)
						}
					}
					else {
						if (err) {
							throw new Error(err)
						}

						return url
					}
				})

				break
			case 'putObject':
				if (!params.Bucket || !params.Key) {
					throw new Error({ statusCode: 404 })
				}

				return url
			default:
		}
	}
}

_.forEach(S3Mock.prototype, function (value, key, obj) {
	if (_.isFunction(value)) {
		obj[key] = createPromisable(value)
	}
})

exports.config = config

exports.S3 = function (options) {
	return new S3Mock(options)
}
