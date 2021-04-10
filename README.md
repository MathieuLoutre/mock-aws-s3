# Mock AWS S3 SDK

This is a very simple interface that mocks the AWS SDK for Node.js. The implementation is incomplete but most basic features are supported.

Available:
- createBucket
- deleteBucket
- listObjects
- listObjectsV2
- deleteObjects
- deleteObject
- getObject
- headObject
- putObject
- copyObject
- getObjectTagging
- putObjectTagging
- upload
- getSignedUrl

It uses a directory to mock a bucket and its content.

If you'd like to see some more features or you have some suggestions, feel free to use the issues or submit a pull request.

## Release History
* 2021-04-10   v4.0.2   Update dependencies, remove extra log and use proper path concat
* 2020-01-30   v4.0.0   Fix promises and update packages with various contributions.
* 2018-06-16   v3.0.0   Contributions from @benedict-wellard and @telenor-digital-asia adding support for promises and deleteBucket
* 2017-08-11   v2.6.0   Contributions from @pamelafox and @fkleon adding support for listObjectsV2, tagging and more useful debug info returned
* 2017-05-31   v2.5.1   Fix bug when statSync was called on non existing files, spotted by @AllanHodkinson
* 2017-05-20   v2.5.0   Set LastModified on getObject by @stujo, support for custom metadata on get/head by @rgparkins and putObject returns some data on error by @pamelafox
* 2017-02-02   v2.4.0   Account for no existing keys when getting an object by @derPuntigamer
* 2016-06-03   v2.3.0   Add createBucket method and tests by @neilstuartcraig
* 2016-05-25   v2.2.1   Add Size attribute by @aldafu
* 2016-04-25   v2.2.0   Add MaxKey options in listObject by @hauboldj
* 2016-01-18   v2.1.0   Fix markers on listObjects (by @wellsjo) and add send method (by @AllieRays and @IonicaBizau)
* 2015-11-04   v2.0.0   Static basePath configuration, bound params (by @CJNE) and match upload API (by @kyleseely)
* 2015-10-25   v1.1.0   Removed because of potential breaking change with bound params
* 2015-09-24   v1.0.0   Breaking changes and awesome PR to fix API inconsistencies by @irothschild
* 2015-08-27   v0.5.0   Refactor and default options by @whitingj
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

### Instantiate

```js
var AWSMock = require('mock-aws-s3');
AWSMock.config.basePath = '/tmp/buckets/' // Can configure a basePath for your local buckets
var s3 = AWSMock.S3({
	params: { Bucket: 'example' }
});
```

### PutObject/ListObjects

```js
s3.putObject({Key: 'sea/animal.json', Body: '{"is dog":false,"name":"otter","stringified object?":true}'}, function(err, data) {
	s3.listObjects({Prefix: 'sea'}, function (err, data) {
		console.log(data);
	});
});
```

### CreateBucket

```js
var params = { Bucket: 'example' };
s3.createBucket(params, function(err) {
    if(err) {
        console.error(err);
    }
});
```

### DeleteBucket

```js
var params = { Bucket: 'example' };
s3.deleteBucket(params, function(err) {
    if(err) {
        console.error(err);
    }
});
```
