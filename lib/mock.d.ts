/// <reference types="node" />
import fs from 'fs-extra';
/** FakeStream class for mocking S3 streams */
declare class FakeStream {
    private src;
    constructor(search: {
        Bucket: string;
        Key: string;
    });
    createReadStream(): fs.ReadStream;
}
declare type BucketCreationParams = {
    Bucket: string;
};
interface S3MockOptions {
    params: any;
}
declare class S3Mock {
    private readonly options?;
    private objectMetadataDictionary;
    private objectTaggingDictionary;
    private defaultOptions;
    private config;
    constructor(options?: S3MockOptions | undefined);
    listObjectsV2(searchV2: any, callback: any): void;
    listObjects(search: any, callback: any): void;
    getSignedUrl(operation: 'getObject' | 'putObject', params: {
        Bucket: string;
        Key: string;
    }, callback: any): string | {
        statusCode: number;
    } | undefined;
    deleteObjects(search: any, callback: any): void;
    deleteObject(search: any, callback: any): void;
    headObject(search: any, callback: any): FakeStream | undefined;
    copyObject(search: any, callback: any): void;
    getObject(search: any, callback: any): FakeStream | undefined;
    createBucket(params: BucketCreationParams, callback: any): any;
    /**
     * Deletes a bucket. Behaviour as createBucket
     * @param params {Bucket: bucketName}. Name of bucket to delete
     * @param callback
     * @returns void
     */ deleteBucket(params: any, callback: any): void;
    putObject(search: any, callback: any): {
        send: (cb: any) => void;
    };
    getObjectTagging(search: any, callback: any): void;
    putObjectTagging(search: any, callback: any): any;
    upload(search: any, options: any, callback: any): any;
}
export declare const S3: (options: S3MockOptions) => S3Mock;
export {};
