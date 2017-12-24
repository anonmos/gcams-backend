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

    public getBucketContents(bucketName: string): Promise<AWSError | ListObjectsV2Output> {
        let params: S3.ListObjectsV2Request = {
            Bucket: bucketName
        };

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

    public getBuckets(): Promise<AWSError | ListBucketsOutput> {
        return new Promise((resolve, reject) => {
            this.instance.listBuckets((err: AWSError, data: ListBucketsOutput) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            })
        });
    }

    /*public async getAllBucketContents(): Promise<AWSError | Array<ListObjectsV2Output>> {
        let bucketsResult: void | AWSError | ListBucketsOutput = await this.getBuckets().catch((err: AWSError) => {
            console.log(`Error: Failed to get all bucket contents due to: ${err.message}`)
        });

        if (bucketsResult && (<ListBucketsOutput> bucketsResult).Buckets !== undefined) {
            let buckets: string[] = [];
            //@ts-ignore: We made sure it's not undefined
            (<ListBucketsOutput> bucketsResult).Buckets.forEach((bucket) => {
                if ((<string> bucket.Name).includes("gcams-")) {
                    buckets.push(<string> bucket.Name)
                }
            });

            let bucketResultRequests: Promise<any>[] = [];

            buckets.forEach((bucket) => {
                bucketResultRequests.push(this.getBucketContents(bucket))
            });

            Promise.all(bucketResultRequests).then((data) => {
                if((<ListObjectsV2Output> data).Buckets) {

                }
            })
        }
    }*/
}

