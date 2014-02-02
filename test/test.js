var expect = require('chai').expect;
var AWS = require('../');
var fs = require('fs');

describe('S3', function () {

	var s3 = AWS.S3();
	var marker = null;

	it('should list files in bucket with less than 1000 objects and use Prefix to filter', function (done) {

		s3.listObjects({Prefix: 'sea/', Bucket: __dirname + '/local/otters'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(560);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.IsTruncated).to.equal(false);
			expect(data.Marker).to.not.exist;
			done();
		});
	});

	it('should list files in bucket with less than 1000 objects and use Prefix to filter - 2', function (done) {

		s3.listObjects({Prefix: 'river/', Bucket: __dirname + '/local/otters'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(912);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.IsTruncated).to.equal(false);
			expect(data.Marker).to.not.exist;
			done();
		});
	});

	it('should list files in bucket with more than 1000 objects and use Prefix to filter - 3', function (done) {

		s3.listObjects({Prefix: 'mix/', Bucket: __dirname + '/local/otters'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(1000);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.IsTruncated).to.equal(true);
			expect(data.Marker).to.exist;
			done();
		});
	});

	it('should list all files in bucket (more than 1000)', function (done) {

		s3.listObjects({Prefix: '', Bucket: __dirname + '/local/otters'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(1000);
			expect(data.Contents[1].ETag).to.exist;
			expect(data.Contents[1].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[1].Key).to.exist;
			expect(data.IsTruncated).to.equal(true);
			expect(data.Marker).to.exist;

			marker = data.Marker;

			done();
		});
	});

	it('should list more files in bucket (more than 1000) with marker', function (done) {

		s3.listObjects({Prefix: '', Marker: marker, Bucket: __dirname + '/local/otters'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(1000);
			expect(data.Contents[0].ETag).to.exist;
			expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[0].Key).to.exist;
			expect(data.IsTruncated).to.equal(true);
			expect(data.Marker).to.exist;
			
			marker = data.Marker;

			done();
		});
	});

	it('should list more files in bucket (more than 1000) with marker - 2', function (done) {

		s3.listObjects({Prefix: '', Marker: marker, Bucket: __dirname + '/local/otters'}, function (err, data) {

			expect(err).to.equal(null);
			expect(data.Contents.length).to.equal(947);
			expect(data.Contents[0].ETag).to.exist;
			expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Contents[0].Key).to.exist;
			expect(data.IsTruncated).to.equal(false);
			expect(data.Marker).to.not.exist;
			
			marker = data.Marker;

			done();
		});
	});

	it('should delete the specified file', function (done) {

		expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy.txt')).to.equal(true);

		var to_delete = {
			Key: '/sea/yo copy.txt',
			Bucket: __dirname + '/local/otters'
		};

		s3.deleteObject(to_delete, function (err, data) {

			expect(err).to.equal(null);
			expect(data).to.exist;
			expect(fs.existsSync(__dirname + '/local/otters/sea/yo copy.txt')).to.equal(false);

			s3.listObjects({Prefix: 'sea', Bucket: __dirname + '/local/otters'}, function (err, data) {

				expect(err).to.equal(null);
				expect(data.Contents.length).to.equal(559);
				expect(data.Contents[0].ETag).to.exist;
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
				expect(data.Contents[0].Key).to.exist;
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
			Bucket: __dirname + '/local/otters'
		};

		s3.deleteObject(to_delete, function (err, data) {

			expect(err).to.not.null;
			expect(data).to.null;

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
			Bucket: __dirname + '/local/otters'
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

			s3.listObjects({Prefix: 'sea', Bucket: __dirname + '/local/otters'}, function (err, data) {

				expect(err).to.equal(null);
				expect(data.Contents.length).to.equal(555);
				expect(data.Contents[0].ETag).to.exist;
				expect(data.Contents[0].ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
				expect(data.Contents[0].Key).to.exist;
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
			Bucket: __dirname + '/local/otters'
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

	it('should get a file', function (done) {

		s3.getObject({Key: 'sea/yo copy 10.txt', Bucket: __dirname + '/local/otters'}, function (err, data) {

			expect(err).to.be.null;
			expect(data.ETag).to.equal('"d41d8cd98f00b204e9800998ecf8427e"');
			expect(data.Key).to.equal('sea/yo copy 10.txt');
			done();
		});
	});

	it('should get a file and its content', function (done) {

		s3.getObject({Key: 'animal.txt', Bucket: __dirname + '/local/otters'}, function (err, data) {
			
			expect(err).to.be.null;
			expect(data.ETag).to.equal('"485737f20ae6c0c3e51f68dd9b93b4e9"');
			expect(data.Key).to.equal('animal.txt');
			expect(data.Body.toString()).to.equal("My favourite animal");
			done();
		});
	});

	it('should create a file and have the same content in sub dir', function (done) {

		s3.putObject({Key: 'punk/file', Body: fs.readFileSync(__dirname + '/local/file'), Bucket: __dirname + '/local/otters'}, function (err, data) {
			
			expect(err).to.be.null;
			expect(fs.existsSync(__dirname + '/local/otters/punk/file')).to.equal(true);

			s3.getObject({Key: 'punk/file', Bucket: __dirname + '/local/otters'}, function (err, data) {
				
				expect(err).to.be.null;
				expect(data.Key).to.equal('punk/file');
				expect(data.Body.toString()).to.equal("this is a file. That's right.");
				done();
			});
		});
	});

});