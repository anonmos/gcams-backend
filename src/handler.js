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
const ALLOWED_FILE_TYPES = ["jpeg", "jpg", "gif", "png", "svg", "bmp"];
const RPI_BUCKET = "rpi-gc-bucket";
const CONCATENATED_PATHS_FILE = "allpaths.json";
const CURRENT_IMAGE_FILE = "current.json";
/**
 * Takes the Message from an SNSEvent in the shape of {"bucket":"bucket-name"} and queries every file path, then
 * writes it to an "index.json" file in that bucket with a list of those paths.
 *
 * Requires that the following environment variables be set:
 *  - process.env.KEY -- AWS API access key ID
 *  - process.env.SECRET -- AWS API secret access key
 *
 * File paths are filtered to have extensions, as directories are treated as files on S3
 *
 * @param {SNSEvent} event
 * @param {Context} context
 * @param {ProxyCallback} callback
 * @returns {Promise<void>}
 */
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
/**
 * Retrieves a list of all buckets with naming convention "gcams-*".  Creates SNS events to trigger generateIndividualBucketIndex
 * and cause it to index each bucket in parallel.
 *
 * Requires that the following environment variables be set:
 *  - process.env.KEY -- AWS API access key ID
 *  - process.env.SECRET -- AWS API secret access key
 *  - SNS_ARN -- AWS SNS ARN identifying the SNS topic where generateIndividualBucketIndex is subscribed
 *
 * @param {SNSEvent} event
 * @param {Context} context
 * @param {ProxyCallback} callback
 * @returns {Promise<void>}
 */
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
/**
 * Retrieves a list of all existing buckets, pulls their index.json files, and concatenates them all into a single
 * "allpaths.json" within the "rpi-gc-bucket" bucket.
 *
 * Requires that the following environment variables be set:
 *  - process.env.KEY -- AWS API access key ID
 *  - process.env.SECRET -- AWS API secret access key
 *
 * @param {SNSEvent} event
 * @param {Context} context
 * @param {ProxyCallback} callback
 * @returns {Promise<void>}
 */
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
            yield s3Connector.writeFile(RPI_BUCKET, CONCATENATED_PATHS_FILE, JSON.stringify(indices)).catch((err) => {
                console.log(`Error: Failed to write allpaths.json to rpi-gc-bucket: ${err.message}`);
                callback(new Error(`Error: Failed to write allpaths.json to rpi-gc-bucket: ${err.message}`));
            });
        }
    });
}
exports.updateRpiFullIndexFile = updateRpiFullIndexFile;
/**
 * Updates the `current.json` file within the `rpi-gc-bucket` to have a new set of image paths.
 * Then updates the history file to include the prior current path.  Will also, eventually, resize the nextNextPath file
 * to have a low resolution version ready.
 *
 * Requires that the following environment variables be set:
 *  - process.env.KEY -- AWS API access key ID
 *  - process.env.SECRET -- AWS API secret access key
 *
 * @param {SNSEvent} event
 * @param {Context} context
 * @param {ProxyCallback} callback
 * @returns {Promise<void>}
 */
function updateCurrentImage(event, context, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        context.callbackWaitsForEmptyEventLoop = false;
        if (!process.env.KEY || !process.env.SECRET) {
            callback(new Error("Error: Key and secret environment variables have not been set."));
        }
        let s3Connector = new s3Connector_1.default(process.env.KEY, process.env.SECRET);
        let allPaths = yield s3Connector.getBucketFile(RPI_BUCKET, CONCATENATED_PATHS_FILE).catch((err) => {
            let errorString = `Error: Could not read ${CONCATENATED_PATHS_FILE} from ${RPI_BUCKET}: ${err.message}`;
            console.log(errorString);
            callback(new Error(errorString));
        });
        let currentImageFile = yield s3Connector.getBucketFile(RPI_BUCKET, CURRENT_IMAGE_FILE).catch((err) => {
            console.log(`Info: Problem getting current image file with error: ${err.message}, building a new one.`);
        });
        let currentImageObject = undefined;
        if (currentImageFile && currentImageFile.length > 0) {
            currentImageObject = JSON.parse(currentImageFile);
        }
        let historyFileName = `${getDateString()}.json`;
        let historyFile = yield s3Connector.getBucketFile(RPI_BUCKET, historyFileName).catch((err) => {
            console.log(`Info: Couldn't find a history file for today, creating a new one.`);
        });
        let historyObject = [];
        if (historyFile && historyFile.length > 0) {
            historyObject = JSON.parse(historyFile);
        }
        if (currentImageObject) {
            historyObject.push({ dateShown: currentImageObject.lastUpdated, path: currentImageObject.path });
        }
        yield s3Connector.writeFile(RPI_BUCKET, historyFileName, JSON.stringify(historyObject));
        if (allPaths) {
            let parsedPaths = JSON.parse(allPaths);
            let newPath = selectRandomPath(parsedPaths);
            let path = "";
            let nextPath = "";
            let nextNextPath = "";
            if (currentImageObject) {
                path = currentImageObject.nextPath;
                nextPath = currentImageObject.nextNextPath;
                nextNextPath = newPath;
            }
            else {
                path = newPath;
                nextPath = selectRandomPath(parsedPaths);
                nextNextPath = selectRandomPath(parsedPaths);
            }
            let currentFile = {
                lastUpdated: new Date().toUTCString(),
                path: path,
                nextPath: nextPath,
                nextNextPath: nextNextPath
            };
            yield s3Connector.writeFile(RPI_BUCKET, CURRENT_IMAGE_FILE, JSON.stringify(currentFile));
        }
    });
}
exports.updateCurrentImage = updateCurrentImage;
function getDateString() {
    let date = new Date();
    let day = (date.getDate()).toString();
    day = day.length === 1 ? `0${day}` : day;
    let month = (date.getMonth() + 1).toString();
    month = month.length === 1 ? `0${month}` : month;
    let year = date.getFullYear();
    return `${year}${month}${day}`;
}
function selectRandomPath(paths) {
    let path = "";
    let bucket = "";
    let randomPathNumber = 0;
    do {
        randomPathNumber = Math.floor(Math.random() * paths.length);
        path = paths[randomPathNumber].path;
        bucket = paths[randomPathNumber].bucket;
    } while (!isAllowedFiletype(path));
    if (path.length > 0) {
        path = `https://${bucket}.s3.amazonaws.com/${encodeURIComponent(path)}`;
    }
    return path;
}
function isAllowedFiletype(path) {
    let rval = false;
    for (let i = 0; i < ALLOWED_FILE_TYPES.length; ++i) {
        let type = ALLOWED_FILE_TYPES[i];
        if (path.toLowerCase().includes(type)) {
            rval = true;
        }
    }
    return rval;
}
function parseEventMessage(event) {
    let rval = null;
    if (event && event.Records && event.Records.length > 0) {
        rval = event.Records[0].Sns.Message;
    }
    return rval;
}
