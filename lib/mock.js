"use strict";
/*
 * grunt-mock-s3
 * https://github.com/MathieuLoutre/grunt-mock-s3
 *
 * Copyright (c) 2013 Mathieu Triay
 * Licensed under the MIT license.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3 = void 0;
const underscore_1 = __importDefault(require("underscore"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const buffer_1 = __importDefault(require("buffer"));
const bluebird_1 = __importDefault(require("bluebird"));
const core_1 = require("aws-sdk/lib/core");
const Buffer = buffer_1.default.Buffer;
// Gathered from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
function walk(dir) {
    let results = [];
    const list = fs_extra_1.default.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        var stat = fs_extra_1.default.statSync(file);
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
function applyBasePath(search, config) {
    if (underscore_1.default.isUndefined(config.basePath)) {
        return search;
    }
    var modifyKeys = ['Bucket', 'CopySource'];
    var ret = underscore_1.default.mapObject(search, function (value, key) {
        if (underscore_1.default.indexOf(modifyKeys, key) === -1) {
            return value;
        }
        else {
            return config.basePath + '/' + value;
        }
    });
    return ret;
}
/** FakeStream class for mocking S3 streams */
class FakeStream {
    constructor(search) {
        this.src = search.Bucket + '/' + search.Key;
    }
    createReadStream() {
        return fs_extra_1.default.createReadStream(this.src);
    }
}
/**
 * Decorate a method to enable calling `.promise()` on the returned value to get a Promise, when the method
 * is initially called without a callback.
 * @decorator
 * @private
 */
function createPromisable(wrapped) {
    return function () {
        // @ts-expect-error
        var self = this;
        var promisified = bluebird_1.default.promisify(wrapped, { context: self });
        var args = [].slice.call(arguments);
        var callback = null;
        var lastArgIndex = Math.min(args.length - 1, wrapped.length);
        if (args.length >= 1) {
            var lastArg = args[lastArgIndex];
            if (underscore_1.default.isFunction(lastArg)) {
                callback = lastArg;
            }
        }
        if (!underscore_1.default.isFunction(callback)) {
            return {
                // @ts-expect-error
                createReadStream: function () {
                    // @ts-expect-error
                    this.send();
                    // @ts-expect-error
                    if (this._returned instanceof FakeStream) {
                        // @ts-expect-error
                        return this._returned.createReadStream();
                    }
                },
                promise: function () {
                    // @ts-expect-error
                    return promisified.apply(self, args);
                },
                send: function (cb) {
                    // @ts-expect-error
                    args.push(cb); // @ts-expect-error
                    this._returned = wrapped.apply(self, args);
                }
            };
        }
        else {
            wrapped.apply(self, args);
        }
    };
}
class S3Mock {
    constructor(options) {
        this.objectMetadataDictionary = [];
        this.objectTaggingDictionary = [];
        this.config = {
            update: function () { }
        };
        if (!underscore_1.default.isUndefined(options) && !underscore_1.default.isUndefined(options.params)) {
            this.defaultOptions = underscore_1.default.extend({}, applyBasePath(options.params, this.config));
        }
    }
    listObjectsV2(searchV2, callback) {
        var searchV1 = underscore_1.default(searchV2).clone();
        // Marker in V1 is StartAfter in V2
        // ContinuationToken trumps marker on subsequent requests.
        searchV1.Marker = searchV2.ContinuationToken || searchV2.StartAfter;
        this.listObjects(searchV1, function (err, resultV1) {
            var resultV2 = underscore_1.default(resultV1).clone();
            // Rewrite NextMarker to NextContinuationToken
            resultV2.NextContinuationToken = resultV1.NextMarker;
            // Remember original ContinuationToken and StartAfter
            resultV2.ContinuationToken = searchV2.ContinuationToken;
            resultV2.StartAfter = searchV2.StartAfter;
            callback(err, resultV2);
        });
    }
    listObjects(search, callback) {
        var _a;
        search = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(search, this.config));
        var files = walk(search.Bucket);
        var filteredFiles = underscore_1.default.filter(files, function (file) {
            return (!search.Prefix ||
                file.replace(search.Bucket + '/', '').indexOf(search.Prefix) === 0);
        });
        var start = 0;
        var truncated = false;
        if (search.Marker) {
            var isPartial; // @ts-expect-error
            var markerFile = underscore_1.default(filteredFiles).find(function (file) {
                var marker = search.Bucket + '/' + search.Marker;
                if (file.indexOf(marker) === 0) {
                    isPartial = file.length !== marker.length;
                    return true;
                }
            });
            var startFile;
            if (isPartial) {
                // @ts-expect-error
                startFile = filteredFiles[filteredFiles.indexOf(markerFile)];
            }
            else {
                // @ts-expect-error
                startFile = filteredFiles[filteredFiles.indexOf(markerFile) + 1];
            }
            start = filteredFiles.indexOf(startFile);
        }
        if (start === -1) {
            filteredFiles = [];
        }
        else {
            filteredFiles = underscore_1.default.rest(filteredFiles, start);
        }
        if (filteredFiles.length > Math.min(1000, search.MaxKeys || 1000)) {
            truncated = true;
            filteredFiles = filteredFiles.slice(0, Math.min(1000, search.MaxKeys || 1000));
        }
        const result = {
            Contents: underscore_1.default.map(filteredFiles, function (path) {
                var stat = fs_extra_1.default.statSync(path);
                return {
                    Key: path.replace(search.Bucket + '/', ''),
                    ETag: '"' +
                        crypto_1.default
                            .createHash('md5')
                            .update(fs_extra_1.default.readFileSync(path))
                            .digest('hex') +
                        '"',
                    LastModified: stat.mtime,
                    Size: stat.size
                };
            }),
            CommonPrefixes: underscore_1.default.reduce(filteredFiles, function (prefixes, path) {
                var prefix = path
                    .replace(search.Bucket + '/', '')
                    .split('/')
                    .slice(0, -1)
                    .join('/')
                    .concat('/');
                // @ts-expect-error
                return prefixes.indexOf(prefix) === -1 // @ts-expect-error
                    ? prefixes.concat([prefix])
                    : prefixes;
            }, []).map(function (prefix) {
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
            result.NextMarker = (_a = underscore_1.default.last(result.Contents)) === null || _a === void 0 ? void 0 : _a.Key;
        }
        callback(null, result);
    }
    getSignedUrl(operation, params, callback) {
        const url = 'https://s3.us-east-2.amazonaws.com/' +
            params.Bucket +
            '/' +
            params.Key +
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
            '2105e8d7892eb5dcc455ddd603c61e47520774a7289178af9ecc';
        switch (operation) {
            case 'getObject':
                this.headObject(params, function (err, props) {
                    if (err) {
                        err.statusCode = 404;
                    }
                    if (callback) {
                        if (err) {
                            callback(err, null);
                        }
                        else {
                            console.log('TEST');
                            callback(null, url);
                        }
                    }
                    else {
                        if (err) {
                            throw err;
                        }
                        return url;
                    }
                });
                break;
            case 'putObject':
                if (!params.Bucket || !params.Key) {
                    return { statusCode: 404 };
                }
                return url;
            default:
        }
    }
    deleteObjects(search, callback) {
        search = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(search, this.config));
        var deleted = [];
        var errors = [];
        underscore_1.default.each(search.Delete.Objects, function (file) {
            if (fs_extra_1.default.existsSync(search.Bucket + '/' + file.Key)) {
                // @ts-expect-error
                deleted.push(file);
                fs_extra_1.default.unlinkSync(search.Bucket + '/' + file.Key);
            }
            else {
                // @ts-expect-error
                errors.push(file);
            }
        });
        if (errors.length > 0) {
            callback(new core_1.AWSError('Error deleting objects'), {
                // @ts-expect-error
                Errors: errors,
                // @ts-expect-error
                Deleted: deleted
            });
        }
        else {
            // @ts-expect-error
            callback(null, { Deleted: deleted });
        }
    }
    deleteObject(search, callback) {
        search = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(search, this.config));
        if (fs_extra_1.default.existsSync(search.Bucket + '/' + search.Key)) {
            fs_extra_1.default.unlinkSync(search.Bucket + '/' + search.Key);
            callback(null, {});
        }
        else {
            callback(null, {});
        }
    }
    headObject(search, callback) {
        var self = this;
        search = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(search, this.config));
        if (!callback) {
            return new FakeStream(search);
        }
        else {
            fs_extra_1.default.readFile(search.Bucket + '/' + search.Key, function (err, data) {
                if (!err) {
                    var props = {
                        Key: search.Key,
                        ETag: '"' + crypto_1.default.createHash('md5').update(data).digest('hex') + '"',
                        ContentLength: data.length
                    };
                    // @ts-expect-error
                    if (self.objectMetadataDictionary[search.Key]) {
                        // @ts-expect-error
                        props.Metadata = self.objectMetadataDictionary[search.Key];
                    }
                    callback(null, props);
                }
                else {
                    callback(err.code === 'ENOENT'
                        ? new core_1.AWSError(JSON.stringify(Object.assign(Object.assign({}, err), { statusCode: 404 })))
                        : new core_1.AWSError(err.message), search);
                }
            });
        }
    }
    copyObject(search, callback) {
        search = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(search, this.config));
        fs_extra_1.default.mkdirsSync(path_1.default.dirname(search.Bucket + '/' + search.Key));
        fs_extra_1.default.copy(decodeURIComponent(search.CopySource), search.Bucket + '/' + search.Key, function (err) {
            callback(new core_1.AWSError(err.message), search);
        });
    }
    getObject(search, callback) {
        var self = this;
        search = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(search, this.config));
        if (!callback) {
            return new FakeStream(search);
        }
        else {
            var path = search.Bucket + '/' + search.Key;
            fs_extra_1.default.readFile(path, function (err, data) {
                if (!err) {
                    var stat = fs_extra_1.default.statSync(path);
                    var props = {
                        Key: search.Key,
                        ETag: '"' + crypto_1.default.createHash('md5').update(data).digest('hex') + '"',
                        Body: data,
                        LastModified: stat.mtime,
                        ContentLength: data.length
                    };
                    // @ts-expect-error
                    if (self.objectMetadataDictionary[search.Key]) {
                        // @ts-expect-error
                        props.Metadata = self.objectMetadataDictionary[search.Key];
                    }
                    callback(null, props);
                }
                else {
                    if (err.code === 'ENOENT') {
                        return callback(new core_1.AWSError(JSON.stringify({
                            cfId: undefined,
                            code: 'NoSuchKey',
                            message: 'The specified key does not exist.',
                            name: 'NoSuchKey',
                            region: null,
                            statusCode: 404
                        })), search);
                    }
                    callback(new core_1.AWSError(err.message), search);
                }
            });
        }
    }
    createBucket(params, callback) {
        var err = null;
        // param prop tests - these need to be done here to avoid issues with defaulted values
        if (typeof params === 'object' && params !== null) {
            // null is an object, at least in older V8's
            // Bucket - required, String
            if (typeof params.Bucket !== 'string' || params.Bucket.length <= 0) {
                // NOTE: This *will not* match the error provided by the AWS SDK - but that's chasing a moving target
                err = new Error("Mock-AWS-S3: Argument 'params' must contain a 'Bucket' (String) property");
            }
            // Should we check the remaining props of the params Object? (probably)
        }
        else {
            err = new Error("Mock-AWS-S3: Argument 'params' must be an Object");
        }
        // Note: this.defaultOptions is an object which was passed in to the constructor
        var opts = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(params, this.config));
        // If the params object is well-formed...
        if (err === null) {
            // We'll assume that if basePath is set, it's correctly set (i.e. data type etc.) and if not...
            // we'll default to the local dir (which seems to be the existing behaviour - in e.g. putObject)
            // It would be nicer if there were a strongly defined default
            var bucketPath = opts.basePath || '';
            bucketPath += opts.Bucket;
            fs_extra_1.default.mkdirs(bucketPath, function (err) {
                return callback(new core_1.AWSError(err.message), {});
            });
        }
        else {
            // ...if the params object is not well-formed, fail fast
            return callback(new core_1.AWSError(err.message), {});
        }
    }
    /**
     * Deletes a bucket. Behaviour as createBucket
     * @param params {Bucket: bucketName}. Name of bucket to delete
     * @param callback
     * @returns void
     */
    deleteBucket(params, callback) {
        var err = null;
        if (typeof params === 'object' && params !== null) {
            if (typeof params.Bucket !== 'string' || params.Bucket.length <= 0) {
                err = new Error("Mock-AWS-S3: Argument 'params' must contain a 'Bucket' (String) property");
            }
        }
        else {
            err = new Error("Mock-AWS-S3: Argument 'params' must be an Object");
        }
        var opts = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(params, this.config));
        if (err !== null) {
            callback(new core_1.AWSError(err.message), {});
        }
        var bucketPath = opts.basePath || '';
        bucketPath += opts.Bucket;
        fs_extra_1.default.remove(bucketPath, function (err) {
            return callback(new core_1.AWSError(err.message), {});
        });
    }
    putObject(search, callback) {
        search = underscore_1.default.extend({}, this.defaultOptions, applyBasePath(search, this.config));
        if (search.Metadata) {
            // @ts-expect-error
            this.objectMetadataDictionary[search.Key] = search.Metadata;
        }
        if (typeof search.Tagging === 'string') {
            // URL query parameter encoded
            var tags = {}; // @ts-expect-error
            var tagSet = [];
            // quick'n'dirty parsing into an object (does not support hashes or arrays)
            search.Tagging.split('&').forEach(function (part) {
                var item = part.split('='); // @ts-expect-error
                tags[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
            });
            // expand into tagset
            Object.keys(tags).forEach(function (key) {
                tagSet.push({
                    Key: key,
                    Value: tags[key]
                });
            });
            // @ts-expect-error
            this.objectTaggingDictionary[search.Key] = tagSet;
        }
        var dest = search.Bucket + '/' + search.Key;
        // @ts-expect-error
        var sendCallback = null;
        var done = function () {
            // @ts-expect-error
            if (typeof sendCallback === 'function') {
                // @ts-expect-error
                sendCallback.apply(this, arguments);
            }
            if (typeof callback === 'function') {
                // @ts-expect-error
                callback.apply(this, arguments);
            }
        };
        if (typeof search.Body === 'string') {
            search.Body = Buffer.from(search.Body);
        }
        if (search.Body instanceof Buffer) {
            fs_extra_1.default.createFileSync(dest);
            fs_extra_1.default.writeFile(dest, search.Body, function (err) {
                // @ts-expect-error
                done(err, { Location: dest, Key: search.Key, Bucket: search.Bucket });
            });
        }
        else {
            fs_extra_1.default.mkdirsSync(path_1.default.dirname(dest));
            var stream = fs_extra_1.default.createWriteStream(dest);
            stream.on('finish', function () {
                // @ts-expect-error
                done(null, true);
            });
            // @ts-expect-error
            search.Body.on('error', function (err) {
                // @ts-expect-error
                done(err);
            });
            stream.on('error', function (err) {
                // @ts-expect-error
                done(err);
            });
            // @ts-expect-error
            search.Body.pipe(stream);
        }
        return {
            // @ts-expect-error
            send: function (cb) {
                sendCallback = cb;
            }
        };
    }
    getObjectTagging(search, callback) {
        var self = this;
        this.headObject(search, function (err, _props) {
            if (err) {
                return callback(err, { TagSet: [] });
            }
            else {
                return callback(null, {
                    VersionId: '1',
                    TagSet: self.objectTaggingDictionary[search.Key] || []
                });
            }
        });
    }
    putObjectTagging(search, callback) {
        var self = this;
        if (!search.Tagging || !search.Tagging.TagSet) {
            return callback(new core_1.AWSError('Tagging.TagSet required'), {});
        }
        this.headObject(search, function (err, props) {
            if (err) {
                return callback(err, {});
            }
            else {
                // @ts-expect-error
                self.objectTaggingDictionary[search.Key] = search.Tagging.TagSet;
                return callback(null, {
                    VersionId: '1'
                });
            }
        });
    }
    upload(search, options, callback) {
        if (typeof options === 'function' && callback === undefined) {
            callback = options;
            options = null;
        }
        if (options && options.tags) {
            if (!Array.isArray(options.tags)) {
                return callback(new core_1.AWSError(`Tags must be specified as an array; ${typeof options.tags} provided`), null);
            }
        }
        return this.putObject(search, // @ts-expect-error
        function (err, data) {
            if (options && options.tags) {
                // https://github.com/aws/aws-sdk-js/pull/1425
                // @ts-expect-error
                return this.putObjectTagging({
                    Bucket: search.Bucket,
                    Key: search.Key,
                    Tagging: {
                        TagSet: options.tags
                    }
                }, // @ts-expect-error
                function (err) {
                    if (err) {
                        return callback(err, null);
                    }
                    return callback(null, data);
                });
            }
            return callback(err, data);
        }.bind(this));
    }
}
exports.S3 = function (options) {
    Object.keys(S3Mock.prototype).forEach((key) => {
        // @ts-expect-error
        if (typeof S3Mock.prototype[key] === 'function') {
            // @ts-expect-error
            S3Mock.prototype[key] = createPromisable(S3Mock.prototype[key]);
        }
    });
    return new S3Mock(options);
};
//# sourceMappingURL=mock.js.map