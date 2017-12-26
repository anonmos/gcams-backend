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
const s3Connector_1 = require("./lib/s3Connector");
const snsConnector_1 = require("./lib/snsConnector");
function generateIndividualBucketIndex(event, context, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        let message = parseEventMessage(event);
        context.callbackWaitsForEmptyEventLoop = false;
        if (!process.env.KEY || !process.env.SECRET) {
            callback(new Error("Error: Key and secret environment variables have not been set."));
        }
        let connector = new s3Connector_1.default(process.env.KEY, process.env.SECRET);
        if (!message) {
            callback(new Error(`Error: SNS Message couldn't be retrieved!  Event contents ${JSON.stringify(event)}`));
        }
        let parsedMessage = JSON.parse(message);
        let bucket = parsedMessage.bucket;
        let bucketContents = yield connector.getBucketContents(bucket).catch(() => {
            console.log(`Error: Bucket ${bucket} contents request failed!  See further logs.`);
            callback(new Error(`Error: Bucket ${bucket} contents request failed!  See further logs.`));
        });
        if (bucketContents && bucketContents.length > 0) {
            yield connector.writeFile(bucket, `index.json`, JSON.stringify(bucketContents)).catch((err) => {
                console.log(`Error: Writing to AWS bucket ${bucket} with message ${err.message}`);
                callback(new Error(`Error: Writing to AWS bucket ${bucket} with message ${err.message}`));
            });
        }
    });
}
exports.generateIndividualBucketIndex = generateIndividualBucketIndex;
function refreshBucketIndices(event, context, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        context.callbackWaitsForEmptyEventLoop = false;
        if (!process.env.KEY || !process.env.SECRET || !process.env.SNS_ARN) {
            callback(new Error("Error: Key, secret, and SNS ARN environment variables have not been set."));
        }
        let s3Connector = new s3Connector_1.default(process.env.KEY, process.env.SECRET);
        let snsConnector = new snsConnector_1.default(process.env.KEY, process.env.SECRET);
        let buckets = yield s3Connector.getBuckets().catch((err) => {
            console.log(`Error: Failed to retrieve buckets with message: ${err.message}`);
            callback(new Error(`Error: Failed to retrieve buckets with message: ${err.message}`));
        });
        //@ts-ignore: We have a catch statement, should never be an AWS error
        if (buckets && buckets.length > 0) {
            buckets.forEach((bucket) => __awaiter(this, void 0, void 0, function* () {
                yield snsConnector.postMessageToTopic(process.env.SNS_ARN, JSON.stringify({ bucket: bucket }))
                    .catch((err) => {
                    console.log(`Error: Problem posting to SNS topic ${process.env.SNS_ARN}`);
                    callback(new Error(`Error: Problem posting to SNS topic ${process.env.SNS_ARN}`));
                });
            }));
        }
    });
}
exports.refreshBucketIndices = refreshBucketIndices;
function updateRpiFullIndexFile(event, context, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        context.callbackWaitsForEmptyEventLoop = false;
        if (!process.env.KEY || !process.env.SECRET) {
            callback(new Error("Error: Key and secret environment variables have not been set."));
        }
        let s3Connector = new s3Connector_1.default(process.env.KEY, process.env.SECRET);
        let buckets = yield s3Connector.getBuckets().catch((err) => {
            console.log(`Error: Failed to retrieve buckets with message: ${err.message}`);
            callback(new Error(`Error: Failed to retrieve buckets with message: ${err.message}`));
        });
        //@ts-ignore: We have a catch statement, should never be an AWS error
        if (buckets && buckets.length > 0) {
            let indices = [];
            for (let i = 0; i < buckets.length; ++i) {
                let bucket = buckets[i];
                let paths = yield s3Connector.getBucketIndex(bucket).catch((err) => {
                    console.log(`Error: Failed to retrieve index.json from ${bucket} with error ${err.message}`);
                    callback(new Error(`Error: Failed to retrieve index.json from ${bucket} with error ${err.message}`));
                });
                if (paths) {
                    for (let j = 0; j < paths.length; ++j) {
                        let path = paths[j];
                        indices.push({ bucket: bucket, path: path });
                    }
                }
            }
            yield s3Connector.writeFile("rpi-gc-bucket", "allpaths.json", JSON.stringify(indices)).catch((err) => {
                console.log(`Error: Failed to write allpaths.json to rpi-gc-bucket: ${err.message}`);
                callback(new Error(`Error: Failed to write allpaths.json to rpi-gc-bucket: ${err.message}`));
            });
        }
    });
}
exports.updateRpiFullIndexFile = updateRpiFullIndexFile;
function parseEventMessage(event) {
    let rval = null;
    if (event && event.Records && event.Records.length > 0) {
        rval = event.Records[0].Sns.Message;
    }
    return rval;
}
