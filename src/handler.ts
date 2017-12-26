import {Context, ProxyCallback, SNSEvent} from "aws-lambda";
import Connector from './lib/s3Connector'
import {AWSError} from "aws-sdk";
import SNSConnector from "./lib/snsConnector";

interface BucketSNSMessage {
    bucket: string
}

export async function generateIndividualBucketIndex(event: SNSEvent, context: Context, callback: ProxyCallback) {
    let message = parseEventMessage(event);
    context.callbackWaitsForEmptyEventLoop = false;

    if (!process.env.KEY || !process.env.SECRET) {
        callback(new Error("Error: Key and secret environment variables have not been set."))
    }

    let connector = new Connector(process.env.KEY, process.env.SECRET);

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

export async function refreshBucketIndices(event: SNSEvent, context: Context, callback: ProxyCallback) {
    context.callbackWaitsForEmptyEventLoop = false;

    if (!process.env.KEY || !process.env.SECRET || !process.env.SNS_ARN) {
        callback(new Error("Error: Key, secret, and SNS ARN environment variables have not been set."))
    }

    let s3Connector = new Connector(process.env.KEY, process.env.SECRET);
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

function parseEventMessage(event: SNSEvent): string | null {
    let rval = null;

    if (event && event.Records && event.Records.length > 0) {
        rval = event.Records[0].Sns.Message
    }

    return rval;
}