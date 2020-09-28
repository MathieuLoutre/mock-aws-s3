/// <reference types="node" />
import fs from 'fs-extra';
import { AWSError } from 'aws-sdk/lib/error';
import { CopyObjectOutput, CopyObjectRequest, CreateBucketOutput, CreateBucketRequest, DeleteBucketRequest, DeleteObjectOutput, DeleteObjectRequest, DeleteObjectsOutput, DeleteObjectsRequest, GetObjectOutput, GetObjectRequest, GetObjectTaggingOutput, GetObjectTaggingRequest, HeadObjectOutput, HeadObjectRequest, ListObjectsOutput, ListObjectsRequest, ListObjectsV2Output, ListObjectsV2Request, PutObjectOutput, PutObjectRequest, PutObjectTaggingOutput, PutObjectTaggingRequest } from 'aws-sdk/clients/s3';
declare type Cb<T = any> = (err: AWSError | null, data: T) => void;
/** FakeStream class for mocking S3 streams */
declare class FakeStream {
    private src;
    constructor(search: {
        Bucket: string;
        Key: string;
    });
    createReadStream(): fs.ReadStream;
}
interface S3MockOptions {
    params: any;
}
declare class S3Mock {
    private objectMetadataDictionary;
    private objectTaggingDictionary;
    private defaultOptions;
    private config;
    constructor(options?: S3MockOptions);
    listObjectsV2(searchV2: ListObjectsV2Request, callback: Cb<ListObjectsV2Output>): void;
    listObjects(search: ListObjectsRequest, callback: Cb<ListObjectsOutput>): void;
    getSignedUrl(operation: 'getObject' | 'putObject', params: {
        Bucket: string;
        Key: string;
    }, callback: Cb): string | {
        statusCode: number;
    } | undefined;
    deleteObjects(search: DeleteObjectsRequest, callback: Cb<DeleteObjectsOutput>): void;
    deleteObject(search: DeleteObjectRequest, callback: Cb<DeleteObjectOutput>): void;
    headObject(search: HeadObjectRequest, callback: Cb<HeadObjectOutput>): FakeStream | undefined;
    copyObject(search: CopyObjectRequest, callback: Cb<CopyObjectOutput>): void;
    getObject(search: GetObjectRequest, callback: Cb<GetObjectOutput>): FakeStream | undefined;
    createBucket(params: CreateBucketRequest, callback: Cb<CreateBucketOutput>): void;
    /**
     * Deletes a bucket. Behaviour as createBucket
     * @param params {Bucket: bucketName}. Name of bucket to delete
     * @param callback
     * @returns void
     */
    deleteBucket(params: DeleteBucketRequest, callback: Cb<{}>): void;
    putObject(search: PutObjectRequest, callback: Cb<PutObjectOutput>): {
        send: (cb: any) => void;
    };
    getObjectTagging(search: GetObjectTaggingRequest, callback: Cb<GetObjectTaggingOutput>): void;
    putObjectTagging(search: PutObjectTaggingRequest, callback: Cb<PutObjectTaggingOutput>): void;
    upload(search: any, options: any, callback: Cb): void | {
        send: (cb: any) => void;
    };
}
export declare const S3: (options: S3MockOptions) => S3Mock;
export {};
