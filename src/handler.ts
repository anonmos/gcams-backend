import {Context, ProxyCallback, SNSEvent} from "aws-lambda";
import S3Connector from './lib/s3Connector'
import {AWSError} from "aws-sdk";
import SNSConnector from "./lib/snsConnector";

interface BucketSNSMessage {
    bucket: string
}

interface AllIndices {
    bucket: string,
    path: string
}

interface currentImage {
    lastUpdated: string,
    path: string
}

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
export async function generateIndividualBucketIndex(event: SNSEvent, context: Context, callback: ProxyCallback) {
    let message = parseEventMessage(event);
    context.callbackWaitsForEmptyEventLoop = false;

    if (!process.env.KEY || !process.env.SECRET) {
        callback(new Error("Error: Key and secret environment variables have not been set."))
    }

    let connector = new S3Connector(process.env.KEY, process.env.SECRET);

    if (!message) {
        callback(new Error(`Error: SNS Message couldn't be retrieved!  Event contents ${JSON.stringify(event)}`))
    }

    let parsedMessage: BucketSNSMessage = JSON.parse(<string> message);
    let bucket: string = parsedMessage.bucket;

    let bucketContents = await connector.getBucketContents(bucket).catch(() => {
        console.log(`Error: Bucket ${bucket} contents request failed!  See further logs.`);
        callback(new Error(`Error: Bucket ${bucket} contents request failed!  See further logs.`));
    });

    if (bucketContents && bucketContents.length > 0) {
        await connector.writeFile(bucket, `index.json`, JSON.stringify(bucketContents)).catch((err: AWSError) => {
            console.log(`Error: Writing to AWS bucket ${bucket} with message ${err.message}`);
            callback(new Error(`Error: Writing to AWS bucket ${bucket} with message ${err.message}`));
        })
    }
}

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
export async function refreshBucketIndices(event: SNSEvent, context: Context, callback: ProxyCallback) {
    context.callbackWaitsForEmptyEventLoop = false;

    if (!process.env.KEY || !process.env.SECRET || !process.env.SNS_ARN) {
        callback(new Error("Error: Key, secret, and SNS ARN environment variables have not been set."))
    }

    let s3Connector = new S3Connector(process.env.KEY, process.env.SECRET);
    let snsConnector = new SNSConnector(process.env.KEY, process.env.SECRET);

    let buckets: Array<string> | void | AWSError = await s3Connector.getBuckets().catch((err: AWSError) => {
        console.log(`Error: Failed to retrieve buckets with message: ${err.message}`);
        callback(new Error(`Error: Failed to retrieve buckets with message: ${err.message}`));
    });

    //@ts-ignore: We have a catch statement, should never be an AWS error
    if (buckets && buckets.length > 0) {
        (<Array<string>> buckets).forEach(async (bucket) => {
            await snsConnector.postMessageToTopic(<string> process.env.SNS_ARN, JSON.stringify({bucket: bucket}))
                .catch((err: AWSError) => {
                    console.log(`Error: Problem posting to SNS topic ${process.env.SNS_ARN}`);
                    callback(new Error(`Error: Problem posting to SNS topic ${process.env.SNS_ARN}`))
                })
        });
    }
}

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
export async function updateRpiFullIndexFile(event: SNSEvent, context: Context, callback: ProxyCallback) {
    context.callbackWaitsForEmptyEventLoop = false;

    if (!process.env.KEY || !process.env.SECRET) {
        callback(new Error("Error: Key and secret environment variables have not been set."))
    }

    let s3Connector = new S3Connector(process.env.KEY, process.env.SECRET);

    let buckets: Array<string> | void | AWSError = await s3Connector.getBuckets().catch((err: AWSError) => {
        console.log(`Error: Failed to retrieve buckets with message: ${err.message}`);
        callback(new Error(`Error: Failed to retrieve buckets with message: ${err.message}`));
    });

    //@ts-ignore: We have a catch statement, should never be an AWS error
    if (buckets && buckets.length > 0) {
        let indices: Array<AllIndices> = [];

        for (let i = 0; i < (<Array<string>> buckets).length; ++i) {
            let bucket = (<Array<string>> buckets)[i];

            let paths = await s3Connector.getBucketIndex(bucket).catch((err: AWSError) => {
                console.log(`Error: Failed to retrieve index.json from ${bucket} with error ${err.message}`);
                callback(new Error(`Error: Failed to retrieve index.json from ${bucket} with error ${err.message}`));
            });


            if (paths) {
                for (let j = 0; j < (<Array<string>> paths).length; ++j) {
                    let path = (<Array<string>> paths)[j];
                    indices.push({bucket: bucket, path: path});
                }
            }
        }

        await s3Connector.writeFile(RPI_BUCKET, CONCATENATED_PATHS_FILE, JSON.stringify(indices)).catch((err: AWSError) => {
            console.log(`Error: Failed to write allpaths.json to rpi-gc-bucket: ${err.message}`);
            callback(new Error(`Error: Failed to write allpaths.json to rpi-gc-bucket: ${err.message}`));
        })
    }
}

export async function updateCurrentImage(event: SNSEvent, context: Context, callback: ProxyCallback) {
    context.callbackWaitsForEmptyEventLoop = false;

    if (!process.env.KEY || !process.env.SECRET) {
        callback(new Error("Error: Key and secret environment variables have not been set."))
    }

    let s3Connector = new S3Connector(process.env.KEY, process.env.SECRET);

    let allPaths = await s3Connector.getBucketFile(RPI_BUCKET, CONCATENATED_PATHS_FILE).catch((err: AWSError) => {
        let errorString = `Error: Could not read ${CONCATENATED_PATHS_FILE} from ${RPI_BUCKET}: ${err.message}`;
        console.log(errorString);
        callback(new Error(errorString));
    });

    if (allPaths) {
        let parsedPaths = JSON.parse(<string> allPaths);
        let finalPath = selectRandomPath(parsedPaths);
        let currentFile: currentImage = {
            lastUpdated: new Date().toDateString(),
            path: finalPath
        };

        await s3Connector.writeFile(RPI_BUCKET, CURRENT_IMAGE_FILE, JSON.stringify(currentFile));
    }
}

function selectRandomPath(paths: Array<AllIndices>): string {
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

function isAllowedFiletype(path: string): boolean {
    let rval = false;

    for (let i = 0; i < ALLOWED_FILE_TYPES.length; ++i) {
        let type = ALLOWED_FILE_TYPES[i];

        if (path.includes(type)) {
            rval = true;
        }
    }

    return rval;
}

function parseEventMessage(event: SNSEvent): string | null {
    let rval = null;

    if (event && event.Records && event.Records.length > 0) {
        rval = event.Records[0].Sns.Message
    }

    return rval;
}