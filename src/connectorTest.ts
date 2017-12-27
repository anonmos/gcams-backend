import Connector from './lib/s3Connector'
import SNSConnector from './lib/snsConnector'
import {AWSError} from "aws-sdk";
import * as FS from 'fs'
import * as Handler from './handler'

const KEY = process.env.KEY;
const SECRET = process.env.SECRET;

let connectorInstance: Connector;
let snsConnectorInstance: SNSConnector;

if (KEY && SECRET) {
    connectorInstance = new Connector(KEY, SECRET);
    snsConnectorInstance = new SNSConnector(KEY, SECRET);
} else {
    connectorInstance = new Connector();
    snsConnectorInstance = new SNSConnector();
}

async function reportBuckets(): Promise<void> {
    let bucketResponse = await connectorInstance.getBuckets().catch((err: AWSError) => {
        console.log(`Error: Caught error trying to retrieve the bukkets: ${err.message}`);
    });

    console.log(`Response from bucket request was ${JSON.stringify(bucketResponse)}`)
}

async function getBucketContents(): Promise<void> {
    let bucketResponse: Array<string> | void = await connectorInstance.getBucketContents("gcams-jim").catch((err: AWSError) => {
        console.log(`Error: Caught error trying to retrieve the contents of bukket gcams-jim: ${err.message}`);
    });

    if (bucketResponse) {
        console.log(`Response from bucket contents request was: ${JSON.stringify(bucketResponse)}`);
        console.log(`Response length: ${bucketResponse.length}`)
    }

    FS.writeFileSync("output.txt", JSON.stringify(bucketResponse));
}

async function triggerPostToMarkBucket(): Promise<void> {
    let submitResponse = await snsConnectorInstance.postMessageToTopic('arn:aws:sns:us-east-1:515554931530:indexbucket',
        JSON.stringify({bucket: "gcams-test"})).catch((err: AWSError) => {
        console.log(`AWS Error: ${err.message}`)
    });

    console.log(`Submit response was: ${JSON.stringify(submitResponse)}`)
}

async function getIndexFileContents(): Promise<void> {
    let indexFileContents = await connectorInstance.getBucketIndex("gcams-test").catch((err: AWSError) => {
        console.log(`AWS Error: ${err.message}`);
    });

    console.log(`Index file contents: ${JSON.stringify(indexFileContents)}`)
}

/*async function updateCurrentImage(): Promise<void> {
    let currentImageFile = await Handler.updateCurrentImage({}, {callbackWaitsForEmptyEventLoop: true}, function(){});
}*/

//updateCurrentImage();

//reportBuckets();
//getBucketContents();
//triggerPostToMarkBucket();
//getIndexFileContents();
