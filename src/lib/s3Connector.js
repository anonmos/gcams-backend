"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        return __awaiter(this, void 0, void 0, function* () {
            let failed = false;
            let response = null;
            let nextKey = undefined;
            let keys = [];
            do {
                response = yield this.performBucketRequest(bucketName, nextKey).catch((err) => {
                    console.log(`Error: Bucket content request failure: ${err.message}`);
                    failed = true;
                });
                if (response && !failed) {
                    keys = keys.concat(this.parseBucketContents(response));
                    if (response.IsTruncated) {
                        nextKey = response.NextContinuationToken;
                    }
                    else {
                        nextKey = undefined;
                    }
                }
            } while (!failed && response && nextKey);
            return keys;
        });
    }
    performBucketRequest(bucketName, nextKey) {
        let params = {
            Bucket: bucketName,
        };
        if (nextKey) {
            Object.assign(params, { ContinuationToken: nextKey });
        }
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
                    resolve(this.parseBuckets(data));
                }
            });
        });
    }
    parseBucketContents(data) {
        let rval = [];
        if (data && data.Contents) {
            data.Contents.forEach((entry) => {
                if (entry && entry.Key && entry.Key.includes(".")) {
                    rval.push(entry.Key);
                }
            });
        }
        return rval;
    }
    parseBuckets(bucketsResponse) {
        let rval = [];
        if (bucketsResponse && bucketsResponse.Buckets) {
            bucketsResponse.Buckets.forEach((bucket) => {
                if (bucket.Name && bucket.Name.includes("gcams-")) {
                    rval.push(bucket.Name);
                }
            });
        }
        return rval;
    }
}
exports.default = S3Connector;
