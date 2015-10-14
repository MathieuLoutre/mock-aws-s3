var expect = require('chai').expect;
var AWS = require('../');
var fs = require('fs');

describe('S3 with defaultOptions and basePath', function () {

    AWS.config.basePath = __dirname + '/local/';
    var s3 = AWS.S3({ 
      params: {
		Bucket: 'otters',
        Delimiter: '/',
      }
	});
	var marker = null;

	it('should list files in bucket with less than 1000 objects and use Prefix to filter', function (done) {

		s3.listObjects({Prefix: 'sea/'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(560);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.CommonPrefixes.length).to.equal(1);
			expect(data.CommonPrefixes[0].Prefix).to.exist;
			expect(data.CommonPrefixes[0].Prefix).to.equal('sea/');
			expect(data.IsTruncated).to.equal(false);
			expect(data.Marker).to.not.exist;
			expect(data.NextMarker).to.not.exist;
			done();
		});
	});

	it('should list files in bucket with less than 1000 objects and use Prefix to filter - 2', function (done) {

		s3.listObjects({Prefix: 'river/'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(912);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.CommonPrefixes.length).to.equal(1);
			expect(data.CommonPrefixes[0].Prefix).to.exist;
			expect(data.CommonPrefixes[0].Prefix).to.equal('river/');
			expect(data.IsTruncated).to.equal(false);
			expect(data.Marker).to.not.exist;
			expect(data.NextMarker).to.not.exist;
			done();
		});
	});

	it('should list files in bucket with more than 1000 objects and use Prefix to filter - 3', function (done) {

		s3.listObjects({Prefix: 'mix/'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(1000);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.CommonPrefixes.length).to.equal(1);
			expect(data.CommonPrefixes[0].Prefix).to.exist;
			expect(data.CommonPrefixes[0].Prefix).to.equal('mix/');
			expect(data.IsTruncated).to.equal(true);
			expect(data.Marker).to.not.exist;
			expect(data.NextMarker).to.exist;
			done();
		});
	});

	it('should list files starting a marker with a partial filename', function (done) {

		s3.listObjects({Prefix: '',  Marker: 'mix/yay copy 10' }, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(1000);
			expect(data.Contents[0].ETag).to.exist;
			expect(data.Contents[0].Key).to.equal('mix/yay copy 10.txt');
			expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.CommonPrefixes.length).to.equal(1);
			expect(data.CommonPrefixes[0].Prefix).to.exist;
			expect(data.CommonPrefixes[0].Prefix).to.equal('mix/');
			expect(data.IsTruncated).to.equal(true);
			expect(data.Marker).to.exist;
			expect(data.NextMarker).to.exist;
			done();
		});
	});

	it('should list all files in bucket (more than 1000)', function (done) {

		s3.listObjects({Prefix: ''}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(1000);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.CommonPrefixes.length).to.equal(2);
			expect(data.CommonPrefixes[0].Prefix).to.exist;
			expect(data.CommonPrefixes[0].Prefix).to.equal('/');
			expect(data.CommonPrefixes[1].Prefix).to.exist;
			expect(data.CommonPrefixes[1].Prefix).to.equal('mix/');
			expect(data.IsTruncated).to.equal(true);
			expect(data.Marker).to.not.exist;
			expect(data.NextMarker).to.exist;

			marker = data.NextMarker;

			done();
		});
	});

	it('should list more files in bucket (more than 1000) with marker', function (done) {

		s3.listObjects({Prefix: '', Marker: marker}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(1000);
			expect(data.Contents[0].ETag).to.exist;
			expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[0].Key).to.exist;
			expect(data.CommonPrefixes.length).to.equal(2);
			expect(data.CommonPrefixes[0].Prefix).to.exist;
			expect(data.CommonPrefixes[0].Prefix).to.equal('mix/');
			expect(data.CommonPrefixes[1].Prefix).to.exist;
			expect(data.CommonPrefixes[1].Prefix).to.equal('river/');
			expect(data.IsTruncated).to.equal(true);
			expect(data.Marker).to.exist;
			expect(data.NextMarker).to.exist;

			marker = data.NextMarker;

			done();
		});
	});

	it('should list more files in bucket (more than 1000) with marker - 2', function (done) {

		s3.listObjects({Prefix: '', Marker: marker}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(947);
			expect(data.Contents[0].ETag).to.exist;
			expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[0].Key).to.exist;
			expect(data.CommonPrefixes.length).to.equal(2);
			expect(data.CommonPrefixes[0].Prefix).to.exist;
			expect(data.CommonPrefixes[0].Prefix).to.equal('river/');
			expect(data.CommonPrefixes[1].Prefix).to.exist;
			expect(data.CommonPrefixes[1].Prefix).to.equal('sea/');
			expect(data.IsTruncated).to.equal(false);
			expect(data.Marker).to.exist;
			expect(data.NextMarker).to.not.exist;

			marker = data.NextMarker;

			done();
		});
	});

	it('should delete the specified file', function (done) {

		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy.txt')).to.equal(true);

		var to_delete = {
			Key: '/sea/yo copy.txt',

		};

		s3.deleteObject(to_delete, function (err, data) {

			expect(err).to.equal(null);
			expect(data).to.exist;
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy.txt')).to.equal(false);

			s3.listObjects({Prefix: 'sea'}, function (err, data) {

				expect(err).to.equal(null);
				expect(data.Contents.length).to.equal(559);
				expect(data.Contents[0].ETag).to.exist;
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
				expect(data.Contents[0].Key).to.exist;
				expect(data.CommonPrefixes.length).to.equal(1);
				expect(data.CommonPrefixes[0].Prefix).to.exist;
				expect(data.CommonPrefixes[0].Prefix).to.equal('sea/');
				expect(data.IsTruncated).to.equal(false);
				expect(data.Marker).to.not.exist;
				done();
			});
		});
	});

    it('should fail to delete a file that does not exist', function (done) {

		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 20000.txt')).to.equal(false);

		var to_delete = {
			Key: '/sea/yo copy 20000.txt',

		};

		s3.deleteObject(to_delete, function (err, data) {

			expect(err).to.null;
			expect(data).to.exist;

			done();
		});
	});

    it('should delete the specified files', function (done) {

		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 2.txt')).to.equal(true);
		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 3.txt')).to.equal(true);
		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 4.txt')).to.equal(true);
		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 5.txt')).to.equal(true);

		var keys = [
			{Key: '/sea/yo copy 2.txt'},
			{Key: '/sea/yo copy 3.txt'},
			{Key: '/sea/yo copy 4.txt'},
			{Key: '/sea/yo copy 5.txt'}
		];

		var to_delete = {
			Delete: {
				Objects: keys
			},

		};

		s3.deleteObjects(to_delete, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Deleted).to.exist;
			expect(data.Deleted.length).to.equal(4);
			expect(data.Deleted).to.deep.equal(keys);
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 2.txt')).to.equal(false);
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 3.txt')).to.equal(false);
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 4.txt')).to.equal(false);
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 5.txt')).to.equal(false);

			s3.listObjects({Prefix: 'sea'}, function (err, data) {

				expect(err).to.equal(null);
				expect(data.Contents.length).to.equal(555);
				expect(data.Contents[0].ETag).to.exist;
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
				expect(data.Contents[0].Key).to.exist;
				expect(data.CommonPrefixes.length).to.equal(1);
				expect(data.CommonPrefixes[0].Prefix).to.exist;
				expect(data.CommonPrefixes[0].Prefix).to.equal('sea/');
				expect(data.IsTruncated).to.equal(false);
				expect(data.Marker).to.not.exist;
				done();
			});
		});
	});

	it('should delete the specified files with a file that does not exist', function (done) {

		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 20000.txt')).to.equal(false);
		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 6.txt')).to.equal(true);
		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 7.txt')).to.equal(true);
		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 8.txt')).to.equal(true);

		var keys = [
			{Key: 'sea/yo copy 20000.txt'},
			{Key: 'sea/yo copy 6.txt'},
			{Key: 'sea/yo copy 7.txt'},
			{Key: 'sea/yo copy 8.txt'}
		];

		var to_delete = {
			Delete: {
				Objects: keys
			},

		};

		s3.deleteObjects(to_delete, function (err, data) {

			expect(err).to.not.be.null;
			expect(data.Errors).to.exist;
			expect(data.Deleted).to.exist;
			expect(data.Errors.length).to.equal(1);
			expect(data.Deleted.length).to.equal(3);
			expect(data.Errors[0].Key).to.equal('sea/yo copy 20000.txt');

			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 20000.txt')).to.equal(false);
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 6.txt')).to.equal(false);
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 7.txt')).to.equal(false);
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy 8.txt')).to.equal(false);

			done();
		});
	});

	it('should get the metadata about a file', function (done) {

		s3.headObject({Key: 'animal.txt'}, function (err, data) {

			expect(err).to.be.null;
			expect(data.ETag).to.equal('"485737f20ae6c0c3e51f68dd9b93b4e9"');
			expect(data.ContentLength).to.equal(19);
			done();
		});
	});

	it('should include a 404 statusCode for the metadata of a non-existant file', function (done) {

		s3.headObject({Key: 'doesnt-exist.txt'}, function (err, data) {

			expect(err).to.not.be.null;
			expect(err.statusCode).to.equal(404);
			done();
		});
	});

	it('should get a file', function (done) {

		s3.getObject({Key: 'sea/yo copy 10.txt'}, function (err, data) {

			expect(err).to.be.null;
			expect(data.ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Key).to.equal('sea/yo copy 10.txt');
			done();
		});
	});

	it('should get a file and its content', function (done) {

		s3.getObject({Key: 'animal.txt'}, function (err, data) {

			var expectedBody = "My favourite animal";
			expect(err).to.be.null;
			expect(data.ETag).to.equal('"485737f20ae6c0c3e51f68dd9b93b4e9"');
			expect(data.Key).to.equal('animal.txt');
			expect(data.Body.toString()).to.equal(expectedBody);
			expect(data.ContentLength).to.equal(expectedBody.length);
			done();
		});
	});

	it('should create a file and have the same content in sub dir', function (done) {

		s3.putObject({Key: 'punk/file', Body: fs.readFileSync(__dirname + '/local/file')}, function (err, data) {

			expect(err).to.be.null;
			expect(fs.existsSync(__dirname + '/local/otters/punk/file')).to.equal(true);

			s3.getObject({Key: 'punk/file'}, function (err, data) {

				expect(err).to.be.null;
				expect(data.Key).to.equal('punk/file');
				expect(data.Body.toString()).to.equal("this is a file. That's right.");
				done();
			});
		});
	});

	it('should be able to put a string', function(done) {

		s3.putObject({Key: 'animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true}'}, function(err, data) {
			expect(err).to.be.null;
			expect(fs.existsSync(__dirname + '/local/otters/animal.json')).to.equal(true);

			s3.getObject({Key: 'animal.json'}, function(err, data) {

				expect(err).to.be.null;
				expect(data.Key).to.equal('animal.json');
				expect(data.Body.toString()).to.equal('{"is dog":false,"name":"otter","stringified object?":true}');
				done();
			})
		})
	});

	it('should accept "configuration"', function() {
		expect(s3.config).to.be.ok;
		expect(s3.config.update).to.be.a('function');
	});
    
});


describe('Multiple S3 with defaultOptions', function () {

    AWS.config.basePath = __dirname + '/local/';
    var s3_1 = AWS.S3({ 
      params: {
		Bucket: 'concurrent1'
      }
	});
	var s3_2 = AWS.S3({
      params: {
		Bucket: 'concurrent2'
      }
	});

	it('should use different defaults', function(done) {

		s3_1.putObject({Key: 'animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true}'}, function(err, data) {
			expect(err).to.be.null;
			expect(fs.existsSync(__dirname + '/local/concurrent1/animal.json')).to.equal(true);

			s3_2.putObject({Key: 'animal.json', Body: '{"is dog":true,"name":"snoopy","stringified object?":true}'}, function(err, data) {
				expect(err).to.be.null;
				expect(fs.existsSync(__dirname + '/local/concurrent2/animal.json')).to.equal(true);

				s3_1.getObject({Key: 'animal.json'}, function(err, data) {
					expect(err).to.be.null;
					expect(data.Key).to.equal('animal.json');
					expect(data.Body.toString()).to.equal('{"is dog":false,"name":"otter","stringified object?":true}');

					s3_2.getObject({Key: 'animal.json'}, function(err, data) {
						expect(err).to.be.null;
						expect(data.Key).to.equal('animal.json');
						expect(data.Body.toString()).to.equal('{"is dog":true,"name":"snoopy","stringified object?":true}');
						done();
					});
				});
			});
		})
	});

});

