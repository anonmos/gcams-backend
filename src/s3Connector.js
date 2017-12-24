"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const S3 = require("aws-sdk/clients/s3");
class S3Connector {
    constructor(KEY, SECRET) {
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
    writeFile(bucketName, fileName, fileContents) {
        let params = {
            Bucket: bucketName,
            Key: fileName,
            Body: fileContents,
            ACL: "public-read"
        };
        return new Promise((resolve, reject) => {
            this.instance.putObject(params, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    getBucketContents(bucketName) {
        let params = {
            Bucket: bucketName
        };
        return new Promise((resolve, reject) => {
            this.instance.listObjectsV2(params, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    getBuckets() {
        return new Promise((resolve, reject) => {
            this.instance.listBuckets((err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
}
exports.default = S3Connector;
