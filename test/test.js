'use strict'

var expect = require('chai').expect
var AWS = require('../')
var fs = require('fs')
var streamBuffers = require('stream-buffers')
var path = require('path')

describe('S3', function () {
	var s3 = AWS.S3()
	var marker = null // for listObjects
	var continuationToken = null // for listObjectsV2

	// createBucket tests
	it('should create a bucket with valid arguments', function (done) {
		var params =
		{
			// Using the path below to avoid writing to VCS'd dirs
			// Formatting the bucket name as per other tests
			Bucket: path.join(__dirname, '/local/test-bucket-1')
		}

		s3.createBucket(params, function (err) {
			expect(err).to.equal(null)
			expect(fs.existsSync(params.Bucket)).to.equal(true)
			done()
		})
	})

	it('should return an error with invalid arguments (null params.Bucket)', function (done) {
		var params =
		{
			// Using the path below to avoid writing to VCS'd dirs
			// Formatting the bucket name as per other tests
			// Bucket: null
		}

		s3.createBucket(params, function (err) {
			// This isn't working, maybe a chai issue?
			// expect(new Error).to.be.an('error');
			// expect(err).to.be.an("error");

			// So this will have to do for the moment
			expect(err).not.to.equal(null)
			expect(fs.existsSync(params.Bucket)).to.equal(false)
			done()
		})
	})

	it('should recursively create a bucket with valid arguments and a non-existant directory hierarchy', function (done) {
		var params =
		{
			// Using the path below to avoid writing to VCS'd dirs
			// Formatting the bucket name as per other tests
			Bucket: path.join(__dirname, '/local/some/non-existant/dir/test-bucket-1')
		}

		s3.createBucket(params, function (err) {
			expect(err).to.equal(null)
			expect(fs.existsSync(params.Bucket)).to.equal(true)
			done()
		})
	})

	it('should list files in bucket with less than 1000 objects and use Prefix to filter', function (done) {
		s3.listObjects({ Prefix: 'sea/', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(560)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(1)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('sea/')
			expect(data.IsTruncated).to.equal(false)
			expect(data.Marker).to.not.exist
			expect(data.NextMarker).to.not.exist
			done()
		})
	})

	it('should limit number of files returned to MaxKeys', function (done) {
		s3.listObjects({ Prefix: 'sea/', Bucket: path.join(__dirname, '/local/otters'), MaxKeys: 55 }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(55)
			expect(data.IsTruncated).to.equal(true)
			done()
		})
	})

	it('should list files in bucket with less than 1000 objects and use Prefix to filter - 2', function (done) {
		s3.listObjects({ Prefix: 'river/', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(912)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(1)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('river/')
			expect(data.IsTruncated).to.equal(false)
			expect(data.Marker).to.not.exist
			expect(data.NextMarker).to.not.exist
			done()
		})
	})

	it('should list files in bucket with more than 1000 objects and use Prefix to filter - 3', function (done) {
		s3.listObjects({ Prefix: 'mix/', Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' },
			function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(1000)
				expect(data.Contents[1].ETag).to.exist
				expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[1].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(1)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('mix/')
				expect(data.IsTruncated).to.equal(true)
				expect(data.Marker).to.not.exist
				expect(data.NextMarker).to.exist
				done()
			})
	})

	it('should list files starting a marker with a partial filename', function (done) {
		s3.listObjects({ Prefix: '',
			Bucket: path.join(__dirname, '/local/otters'),
			Marker: 'mix/yay copy 10',
			Delimiter: '/' }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(1000)
			expect(data.Contents[0].ETag).to.exist
			expect(data.Contents[0].Key).to.equal('mix/yay copy 10.txt')
			expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.CommonPrefixes.length).to.equal(1)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('mix/')
			expect(data.IsTruncated).to.equal(true)
			expect(data.Marker).to.exist
			expect(data.NextMarker).to.exist
			done()
		})
	})

	it('should list all files in bucket (more than 1000)', function (done) {
		s3.listObjects({ Prefix: '', Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(1000)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(2)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('/')
			expect(data.CommonPrefixes[1].Prefix).to.exist
			expect(data.CommonPrefixes[1].Prefix).to.equal('mix/')
			expect(data.IsTruncated).to.equal(true)
			expect(data.Marker).to.not.exist
			expect(data.NextMarker).to.exist

			marker = data.NextMarker

			done()
		})
	})

	it('should list more files in bucket (more than 1000) with marker', function (done) {
		s3.listObjects({ Prefix: '', Marker: marker, Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' },
			function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(1000)
				expect(data.Contents[0].ETag).to.exist
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[0].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(2)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('mix/')
				expect(data.CommonPrefixes[1].Prefix).to.exist
				expect(data.CommonPrefixes[1].Prefix).to.equal('river/')
				expect(data.IsTruncated).to.equal(true)
				expect(data.Marker).to.exist
				expect(data.NextMarker).to.exist

				marker = data.NextMarker

				done()
			})
	})

	it('should list more files in bucket (more than 1000) with marker - 2', function (done) {
		s3.listObjects({ Prefix: '', Marker: marker, Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' },
			function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(945)
				expect(data.Contents[0].ETag).to.exist
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[0].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(2)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('river/')
				expect(data.CommonPrefixes[1].Prefix).to.exist
				expect(data.CommonPrefixes[1].Prefix).to.equal('sea/')
				expect(data.IsTruncated).to.equal(false)
				expect(data.Marker).to.exist
				expect(data.NextMarker).to.not.exist

				marker = data.NextMarker

				done()
			})
	})

	it('should list all files in bucket (more than 1000) with no Prefix specified', function (done) {
		s3.listObjects({ Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(1000)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(2)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('/')
			expect(data.CommonPrefixes[1].Prefix).to.exist
			expect(data.CommonPrefixes[1].Prefix).to.equal('mix/')
			expect(data.IsTruncated).to.equal(true)

			done()
		})
	})

	// listV2
	it('should list files in bucket with less than 1000 objects and use Prefix to filter (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: 'sea/', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(560)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(1)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('sea/')
			expect(data.IsTruncated).to.equal(false)
			expect(data.StartAfter).to.not.exist
			expect(data.ContinuationToken).to.not.exist
			expect(data.NextContinuationToken).to.not.exist
			done()
		})
	})

	it('should limit number of files returned to MaxKeys (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: 'sea/', Bucket: path.join(__dirname, '/local/otters'), MaxKeys: 55 }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(55)
			expect(data.IsTruncated).to.equal(true)
			done()
		})
	})

	it('should list files in bucket with less than 1000 objects and use Prefix to filter - 2 (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: 'river/', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(912)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(1)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('river/')
			expect(data.IsTruncated).to.equal(false)
			expect(data.StartAfter).to.not.exist
			expect(data.ContinuationToken).to.not.exist
			expect(data.NextContinuationToken).to.not.exist
			done()
		})
	})

	it('should list files in bucket with more than 1000 objects and use Prefix to filter - 3 (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: 'mix/', Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' },
			function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(1000)
				expect(data.Contents[1].ETag).to.exist
				expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[1].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(1)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('mix/')
				expect(data.IsTruncated).to.equal(true)
				expect(data.StartAfter).to.not.exist
				expect(data.ContinuationToken).to.not.exist
				expect(data.NextContinuationToken).to.exist
				done()
			})
	})

	it('should list files starting a marker with a partial filename (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: '',
			Bucket: path.join(__dirname, '/local/otters'),
			StartAfter: 'mix/yay copy 10',
			Delimiter: '/' }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(1000)
			expect(data.Contents[0].ETag).to.exist
			expect(data.Contents[0].Key).to.equal('mix/yay copy 10.txt')
			expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.CommonPrefixes.length).to.equal(1)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('mix/')
			expect(data.IsTruncated).to.equal(true)
			expect(data.StartAfter).to.exist
			expect(data.ContinuationToken).to.not.exist
			expect(data.NextContinuationToken).to.exist
			done()
		})
	})

	it('should list all files in bucket (more than 1000) (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: '', Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(1000)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(2)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('/')
			expect(data.CommonPrefixes[1].Prefix).to.exist
			expect(data.CommonPrefixes[1].Prefix).to.equal('mix/')
			expect(data.IsTruncated).to.equal(true)
			expect(data.StartAfter).to.not.exist
			expect(data.ContinuationToken).to.not.exist
			expect(data.NextContinuationToken).to.exist

			continuationToken = data.NextContinuationToken

			done()
		})
	})

	it('should list more files in bucket (more than 1000) with continuationToken (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: '', ContinuationToken: continuationToken, Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' },
			function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(1000)
				expect(data.Contents[0].ETag).to.exist
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[0].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(2)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('mix/')
				expect(data.CommonPrefixes[1].Prefix).to.exist
				expect(data.CommonPrefixes[1].Prefix).to.equal('river/')
				expect(data.IsTruncated).to.equal(true)
				expect(data.StartAfter).to.not.exist
				expect(data.ContinuationToken).to.exist
				expect(data.NextContinuationToken).to.exist

				continuationToken = data.NextContinuationToken

				done()
			})
	})

	it('should list more files in bucket (more than 1000) with marker - 2 (listV2)', function (done) {
		s3.listObjectsV2({ Prefix: '', ContinuationToken: continuationToken, Bucket: path.join(__dirname, '/local/otters'), Delimiter: '/' },
			function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(945)
				expect(data.Contents[0].ETag).to.exist
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[0].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(2)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('river/')
				expect(data.CommonPrefixes[1].Prefix).to.exist
				expect(data.CommonPrefixes[1].Prefix).to.equal('sea/')
				expect(data.IsTruncated).to.equal(false)
				expect(data.StartAfter).to.not.exist
				expect(data.ContinuationToken).to.exist
				expect(data.NextContinuationToken).to.not.exist

				continuationToken = data.NextContinuationToken

				done()
			})
	})

	it('should list all files in bucket (more than 1000) with no Prefix specified (listV2)', function (done) {
		s3.listObjectsV2({ Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Contents.length).to.equal(1000)
			expect(data.Contents[1].ETag).to.exist
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Contents[1].Key).to.exist
			expect(data.CommonPrefixes.length).to.equal(2)
			expect(data.CommonPrefixes[0].Prefix).to.exist
			expect(data.CommonPrefixes[0].Prefix).to.equal('/')
			expect(data.CommonPrefixes[1].Prefix).to.exist
			expect(data.CommonPrefixes[1].Prefix).to.equal('mix/')
			expect(data.IsTruncated).to.equal(true)
			expect(data.StartAfter).to.not.exist
			expect(data.ContinuationToken).to.not.exist
			expect(data.NextContinuationToken).to.not.exist // only returned with delimter

			done()
		})
	})

	it('should delete the specified file', function (done) {
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy.txt'))).to.equal(true)

		var toDelete = {
			Key: '/sea/yo copy.txt',
			Bucket: path.join(__dirname, '/local/otters')
		}

		s3.deleteObject(toDelete, function (err, data) {
			expect(err).to.equal(null)
			expect(data).to.exist
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy.txt'))).to.equal(false)

			s3.listObjects({ Prefix: 'sea', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(559)
				expect(data.Contents[0].ETag).to.exist
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[0].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(1)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('sea/')
				expect(data.IsTruncated).to.equal(false)
				expect(data.Marker).to.not.exist
				done()
			})
		})
	})

	it('should not error when deleting a file that does not exist', function (done) {
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 20000.txt'))).to.equal(false)

		var toDelete = {
			Key: '/sea/yo copy 20000.txt',
			Bucket: path.join(__dirname, '/local/otters')
		}

		s3.deleteObject(toDelete, function (err, data) {
			expect(err).to.equal(null)
			expect(data).to.exist

			done()
		})
	})

	it('should delete the specified files', function (done) {
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 2.txt'))).to.equal(true)
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 3.txt'))).to.equal(true)
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 4.txt'))).to.equal(true)
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 5.txt'))).to.equal(true)

		var keys = [
			{ Key: '/sea/yo copy 2.txt' },
			{ Key: '/sea/yo copy 3.txt' },
			{ Key: '/sea/yo copy 4.txt' },
			{ Key: '/sea/yo copy 5.txt' }
		]

		var toDelete = {
			Delete: {
				Objects: keys
			},
			Bucket: path.join(__dirname, '/local/otters')
		}

		s3.deleteObjects(toDelete, function (err, data) {
			expect(err).to.equal(null)
			expect(data.Deleted).to.exist
			expect(data.Deleted.length).to.equal(4)
			expect(data.Deleted).to.deep.equal(keys)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 2.txt'))).to.equal(false)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 3.txt'))).to.equal(false)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 4.txt'))).to.equal(false)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 5.txt'))).to.equal(false)

			s3.listObjects({ Prefix: 'sea', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
				expect(err).to.equal(null)
				expect(data.Contents.length).to.equal(555)
				expect(data.Contents[0].ETag).to.exist
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
				expect(data.Contents[0].Key).to.exist
				expect(data.CommonPrefixes.length).to.equal(1)
				expect(data.CommonPrefixes[0].Prefix).to.exist
				expect(data.CommonPrefixes[0].Prefix).to.equal('sea/')
				expect(data.IsTruncated).to.equal(false)
				expect(data.Marker).to.not.exist
				done()
			})
		})
	})

	it('should delete the specified files with a file that does not exist', function (done) {
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 20000.txt'))).to.equal(false)
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 6.txt'))).to.equal(true)
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 7.txt'))).to.equal(true)
		expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 8.txt'))).to.equal(true)

		var keys = [
			{ Key: 'sea/yo copy 20000.txt' },
			{ Key: 'sea/yo copy 6.txt' },
			{ Key: 'sea/yo copy 7.txt' },
			{ Key: 'sea/yo copy 8.txt' }
		]

		var toDelete = {
			Delete: {
				Objects: keys
			},
			Bucket: path.join(__dirname, '/local/otters')
		}

		s3.deleteObjects(toDelete, function (err, data) {
			expect(err).to.not.equal(null)
			expect(data.Errors).to.exist
			expect(data.Deleted).to.exist
			expect(data.Errors.length).to.equal(1)
			expect(data.Deleted.length).to.equal(3)
			expect(data.Errors[0].Key).to.equal('sea/yo copy 20000.txt')

			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 20000.txt'))).to.equal(false)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 6.txt'))).to.equal(false)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 7.txt'))).to.equal(false)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/sea/yo copy 8.txt'))).to.equal(false)

			done()
		})
	})

	it('should get the metadata about a file', function (done) {
		s3.headObject({ Key: 'animal.txt', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.ETag).to.equal('"485737f20ae6c0c3e51f68dd9b93b4e9"')
			expect(data.ContentLength).to.equal(19)
			done()
		})
	})

	it('should include a 404 statusCode for the metadata of a non-existant file', function (done) {
		s3.headObject({ Key: 'doesnt-exist.txt', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.not.equal(null)
			expect(err.statusCode).to.equal(404)
			done()
		})
	})

	it('should get a file', function (done) {
		s3.getObject({ Key: 'sea/yo copy 10.txt', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data.ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"')
			expect(data.Key).to.equal('sea/yo copy 10.txt')
			done()
		})
	})

	it('should get a file and its content', function (done) {
		s3.getObject({ Key: 'animal.txt', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			var expectedBody = 'My favourite animal'
			expect(err).to.equal(null)
			expect(data.ETag).to.equal('"485737f20ae6c0c3e51f68dd9b93b4e9"')
			expect(data.Key).to.equal('animal.txt')
			expect(data.Body.toString()).to.equal(expectedBody)
			expect(data.ContentLength).to.equal(expectedBody.length)
			done()
		})
	})

	it('should get a readable stream out of a file', function (done) {
		var expectedBody = 'My favourite animal'

		var request = s3.getObject({ Key: 'animal.txt', Bucket: path.join(__dirname, '/local/otters') })

		// Duck type-check the request object. It must have ALL of the following at least:
		expect(request).to.have.property('promise')
		expect(request).to.have.property('send')
		expect(request).to.have.property('createReadStream')

		// Dump the stream to a buffer to test it
		const writableStream = new streamBuffers.WritableStreamBuffer()

		request.createReadStream().pipe(writableStream).on('finish', function () {
			expect(writableStream.getContentsAsString()).to.equal(expectedBody)
			done()
		})
	})

	it('should create a file and have the same content in sub dir', function (done) {
		s3.putObject({ Key: 'punk/file', Body: fs.readFileSync(path.join(__dirname, '/local/file')), Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/punk/file'))).to.equal(true)

			s3.getObject({ Key: 'punk/file', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
				expect(err).to.equal(null)
				expect(data.Key).to.equal('punk/file')
				expect(data.Body.toString()).to.equal("this is a file. That's right.")
				done()
			})
		})
	})

	it('should be able to put a string', function (done) {
		s3.putObject({ Key: 'animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true}', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/animal.json'))).to.equal(true)

			s3.getObject({ Key: 'animal.json', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
				expect(err).to.equal(null)
				expect(data.Key).to.equal('animal.json')
				expect(data.Body.toString()).to.equal('{"is dog":false,"name":"otter","stringified object?":true}')
				done()
			})
		})
	})

	it('should be able to upload a string', function (done) {
		s3.upload({ Key: 'animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true,"upload":true}', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/animal.json'))).to.equal(true)

			s3.getObject({ Key: 'animal.json', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
				expect(err).to.equal(null)
				expect(data.Key).to.equal('animal.json')
				expect(data.Body.toString()).to.equal('{"is dog":false,"name":"otter","stringified object?":true,"upload":true}')
				done()
			})
		})
	})

	it('should be able to upload something and use the send method to handle the callback', function (done) {
		var req = s3.upload({ Key: 'animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true,"upload":true}', Bucket: path.join(__dirname, '/local/otters') })

		req.send(function (err, data) {
			expect(err).to.equal(null)
			expect(fs.existsSync(path.join(__dirname, '/local/otters/animal.json'))).to.equal(true)

			s3.getObject({ Key: 'animal.json', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
				expect(err).to.equal(null)
				expect(data.Key).to.equal('animal.json')
				expect(data.Body.toString()).to.equal('{"is dog":false,"name":"otter","stringified object?":true,"upload":true}')
				done()
			})
		})
	})

	it('should be able to upload something and use a Promise to handle the async result', function (done) {
		var req = s3.upload({ Key: 'animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true,"upload":true}', Bucket: path.join(__dirname, '/local/otters') })

		req.promise()
			.then(function (result) {
				expect(fs.existsSync(path.join(__dirname, '/local/otters/animal.json'))).to.equal(true)

				s3.getObject({ Key: 'animal.json', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
					expect(err).to.equal(null)
					expect(data.Key).to.equal('animal.json')
					expect(data.Body.toString()).to.equal('{"is dog":false,"name":"otter","stringified object?":true,"upload":true}')
					done()
				})
			})
			.catch(done)
	})

	it('should be able to tag uploads using tags option', function (done) {
		var key = 'tagging-' + Math.random()
		var bucket = path.join(__dirname, '/local/tags')
		var tags = [{ Key: 'foo', Value: 'bar' }]

		s3.upload({ Key: key, Bucket: bucket, Body: 'stuff' }, { tags: tags }, function (err, data) {
			expect(err).to.be.null

			s3.getObjectTagging({ Key: key, Bucket: bucket }, function (err, data) {
				expect(err).to.be.null

				expect(data.TagSet).to.deep.equal([
					{ Key: 'foo', Value: 'bar' }
				])

				done()
			})
		})
	})

	it('should be able to put an object with tagging and retrieve them afterwards', function (done) {
		s3.putObject({
			Key: 'animal.json',
			Body: '{"is dog":false,"name":"otter","stringified object?":true}',
			Bucket: path.join(__dirname, '/local/otters'),
			Tagging: 'tag1=test1&tag2=test2'
		}, function (err, data) {
			expect(err).to.equal(null)

			s3.getObjectTagging({ Key: 'animal.json', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
				expect(err).to.equal(null)

				expect(data.TagSet).to.deep.equal([
					{ Key: 'tag1', Value: 'test1' },
					{ Key: 'tag2', Value: 'test2' }
				])

				done()
			})
		})
	})

	it('should fail to put object tags against a non-existing object', function (done) {
		s3.putObjectTagging({ Key: 'does-not-exist',
			Bucket: path.join(__dirname, '/local/otters'),
			Tagging: { TagSet: [] }
		}, function (err, data) {
			expect(err).to.not.equal(null)
			expect(err.statusCode).to.equal(404)
			done()
		})
	})

	it('should put object tags against an existing object', function (done) {
		s3.putObjectTagging({ Key: 'animal.txt',
			Bucket: path.join(__dirname, '/local/otters'),
			Tagging: { TagSet: [{ Key: 'type', Value: 'otter' }] }
		}, function (err, data) {
			expect(err).to.equal(null)
			expect(data).to.not.equal(null)
			done()
		})
	})

	it('should get object tags from an existing object', function (done) {
		s3.getObjectTagging({ Key: 'animal.txt', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.equal(null)
			expect(data).to.not.equal(null)

			expect(data.TagSet).to.deep.equal([
				{ Key: 'type', Value: 'otter' }
			])

			done()
		})
	})

	it('should fail to get object tags from a non-existing object', function (done) {
		s3.getObjectTagging({ Key: 'does-not-exist', Bucket: path.join(__dirname, '/local/otters') }, function (err, data) {
			expect(err).to.not.equal(null)
			expect(err.statusCode).to.equal(404)
			done()
		})
	})

	// delete bucket
	it('should delete a bucket with valid arguments', function (done) {
		var params = {
			// Using the path below to avoid writing to VCS'd dirs
			// Formatting the bucket name as per other tests
			Bucket: path.join(__dirname, '/local/test-bucket-1')
		}

		s3.createBucket(params, function () {
			s3.deleteBucket(params, function (err) {
				expect(err).to.equal(null)
				expect(fs.existsSync(params.Bucket)).to.equal(false)
				done()
			})
		})
	})

	it('should accept "configuration"', function () {
		expect(s3.config).to.be.ok
		expect(s3.config.update).to.be.a('function')
	})

	it('should create presigned url with valid configuration for getObject async', function (done) {
		var params =
		{
			// Using the path below to avoid writing to VCS'd dirs
			// Formatting the bucket name as per other tests
			Bucket: path.join(__dirname, '/local/otters'),
			Key: 'animal.txt'
		}

		s3.getSignedUrl('getObject', params, function (err, url) {
			expect(err).to.be.null

			expect(url).to.be.a('string')
			done()
		})
	})

	it('should return an error with invalid arguments (null params.Bucket)', function (done) {
		var params =
		{
			// Using the path below to avoid writing to VCS'd dirs
			// Formatting the bucket name as per other tests
			// Bucket: null
		}

		s3.getSignedUrl('getObject', params, function (err, url) {
			// This isn't working, maybe a chai issue?
			// expect(new Error).to.be.an('error');
			// expect(err).to.be.an("error");

			// So this will have to do for the moment
			expect(err).not.to.equal(null)
			expect(url).to.equal(null)
			done()
		})
	})
})
