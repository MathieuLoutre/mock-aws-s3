# Mock AWS S3 SDK

This is a very simple interface that mocks the AWS SDK for Node.js.
It is very incomplete as it will mainly be used to test the grunt plugin `grunt-aws-s3`.
At the time of writing (although the tests pass), it may not be suitable for general use.

Available:
- listObjects
- deleteObjects
- deleteObject
- getObject
- headObject
- putObject
- copyObject
- upload

It uses a directory to mock a bucket and its content.

If you'd like to see some more features or you have some suggestions, feel free to use the issues or submit a pull request.

## Release History
* 2015-08-27   v0.5.0   Refactor and default options by @whitingj
* 2015-07-28   v0.4.0   Add headObject method by @mdlavin
* 2015-07-21   v0.3.0   Add CommonPrefixes to listObjects by @jakepruitt
* 2015-03-15   v0.2.7   Mock out AWS' config submodule by @necaris
* 2015-03-13   v0.2.6   Partial match support and ContentLength by @mick
* 2015-03-03   v0.2.5   Allow string and fix tests by @lbud
* 2015-02-05   v0.2.4   Fix url encoding for copy by @ahageali
* 2015-01-22   v0.2.3   Support for copyObject
* 2014-02-02   v0.2.1   Support for deleteObject
* 2014-01-08   v0.2.0   Support streams for getObject/putObject
* 2013-10-24   v0.1.2   Fix isTruncated typo
* 2013-10-09   v0.1.1   Add LastModified to listObject
* 2013-08-09   v0.1.0   First release

## Example

```js
var AWSMock = require('mock-aws-s3');
var s3 = AWSMock.S3({
	Bucket: '/tmp/example'
});
s3.putObject({Key: 'sea/animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true}'}, function(err, data) {
	s3.listObjects({Prefix: 'sea'}, function (err, data) {
		console.log(data);
	});
});
```