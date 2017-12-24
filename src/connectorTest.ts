import Connector from './s3Connector'
import {AWSError} from "aws-sdk";
import * as FS from 'fs'

const KEY = process.env.KEY;
const SECRET = process.env.SECRET;

let connectorInstance: Connector;

if (KEY && SECRET) {
    connectorInstance = new Connector(KEY, SECRET);
} else {
    connectorInstance = new Connector();
}

async function reportBuckets(): Promise<void> {
    let bucketResponse = await connectorInstance.getBuckets().catch((err: AWSError) => {
        console.log(`Error: Caught error trying to retrieve the bukkets: ${err.message}`);
    });

    console.log(`Response from bucket request was ${JSON.stringify(bucketResponse)}`)
}

async function getBucketContents(): Promise<void> {
    let bucketResponse = await connectorInstance.getBucketContents("gcams-jim").catch((err: AWSError) => {
        console.log(`Error: Caught error trying to retrieve the contents of bukket gcams-jim: ${err.message}`);
    });

    console.log(`Response from bucket contents request was: ${JSON.stringify(bucketResponse)}`)
}

reportBuckets();
getBucketContents();
