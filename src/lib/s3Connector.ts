import * as S3 from 'aws-sdk/clients/s3'
import {AWSError} from "aws-sdk";
import {ListBucketsOutput, ListObjectsV2Output, PutObjectOutput} from "aws-sdk/clients/s3";

export default class S3Connector {
    private instance: S3;

    constructor(KEY?: string, SECRET?: string) {
        let options = {
            apiVersion: '2012-08-10',
            signatureVersion: 'v4',
            region: 'us-west-1',
        };

        if (KEY && SECRET) {
            let keySecret = {
                accessKeyId: KEY,
                secretAccessKey: SECRET
            };

            Object.assign(options, keySecret);
        }

        this.instance = new S3(options);
    }

    public writeFile(bucketName: string, fileName: string, fileContents: string): Promise<AWSError | PutObjectOutput> {
        let params: S3.PutObjectRequest = {
            Bucket: bucketName,
            Key: fileName,
            Body: fileContents,
            ACL: "public-read"
        };

        return new Promise((resolve, reject) => {
            this.instance.putObject(params, (err: AWSError, data: PutObjectOutput) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            })
        })
    }

    public async getBucketContents(bucketName: string): Promise<Array<string>> {
        let failed = false;
        let response = null;
        let nextKey: string | undefined = undefined;
        let keys: Array<string> = [];

        do {
            response = await this.performBucketRequest(bucketName, nextKey).catch((err: AWSError) => {
                console.log(`Error: Bucket content request failure: ${err.message}`);
                failed = true;
            });

            if (response && !failed) {
                keys = keys.concat(this.parseBucketContents(<ListObjectsV2Output> response));

                if ((<ListObjectsV2Output> response).IsTruncated) {
                    nextKey = (<ListObjectsV2Output> response).NextContinuationToken;
                } else {
                    nextKey = undefined;
                }
            }

        } while (!failed && response && nextKey);

        return keys;
    }


    private performBucketRequest(bucketName: string, nextKey?: string): Promise<AWSError | ListObjectsV2Output> {
        let params: S3.ListObjectsV2Request = {
            Bucket: bucketName,
        };

        if (nextKey) {
            Object.assign(params, {ContinuationToken: nextKey})
        }

        return new Promise((resolve, reject) => {
            this.instance.listObjectsV2(params, (err: AWSError, data: ListObjectsV2Output) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            })
        })
    }

    public getBuckets(): Promise<AWSError | Array<string>> {
        return new Promise((resolve, reject) => {
            this.instance.listBuckets((err: AWSError, data: ListBucketsOutput) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(this.parseBuckets(data))
                }
            })
        });
    }

    private parseBucketContents(data: ListObjectsV2Output): Array<string> {
        let rval: Array<string> = [];

        if (data && data.Contents) {
            data.Contents.forEach((entry) => {
                if (entry && entry.Key && entry.Key.includes(".")) {
                    rval.push(entry.Key)
                }
            })
        }

        return rval;
    }

    private parseBuckets(bucketsResponse: ListBucketsOutput): Array<string> {
        let rval: Array<string> = [];

        if (bucketsResponse && bucketsResponse.Buckets) {
            bucketsResponse.Buckets.forEach((bucket) => {
                if (bucket.Name && bucket.Name.includes("gcams-")) {
                    rval.push(bucket.Name)
                }
            })
        }

        return rval;
    }
}

