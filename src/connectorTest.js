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
const FS = require("fs");
const KEY = process.env.KEY;
const SECRET = process.env.SECRET;
let connectorInstance;
let snsConnectorInstance;
if (KEY && SECRET) {
    connectorInstance = new s3Connector_1.default(KEY, SECRET);
    snsConnectorInstance = new snsConnector_1.default(KEY, SECRET);
}
else {
    connectorInstance = new s3Connector_1.default();
    snsConnectorInstance = new snsConnector_1.default();
}
function reportBuckets() {
    return __awaiter(this, void 0, void 0, function* () {
        let bucketResponse = yield connectorInstance.getBuckets().catch((err) => {
            console.log(`Error: Caught error trying to retrieve the bukkets: ${err.message}`);
        });
        console.log(`Response from bucket request was ${JSON.stringify(bucketResponse)}`);
    });
}
function getBucketContents() {
    return __awaiter(this, void 0, void 0, function* () {
        let bucketResponse = yield connectorInstance.getBucketContents("gcams-jim").catch((err) => {
            console.log(`Error: Caught error trying to retrieve the contents of bukket gcams-jim: ${err.message}`);
        });
        if (bucketResponse) {
            console.log(`Response from bucket contents request was: ${JSON.stringify(bucketResponse)}`);
            console.log(`Response length: ${bucketResponse.length}`);
        }
        FS.writeFileSync("output.txt", JSON.stringify(bucketResponse));
    });
}
function triggerPostToMarkBucket() {
    return __awaiter(this, void 0, void 0, function* () {
        let submitResponse = yield snsConnectorInstance.postMessageToTopic('arn:aws:sns:us-east-1:515554931530:indexbucket', JSON.stringify({ bucket: "gcams-test" })).catch((err) => {
            console.log(`AWS Error: ${err.message}`);
        });
        console.log(`Submit response was: ${JSON.stringify(submitResponse)}`);
    });
}
function getIndexFileContents() {
    return __awaiter(this, void 0, void 0, function* () {
        let indexFileContents = yield connectorInstance.getBucketIndex("gcams-test").catch((err) => {
            console.log(`AWS Error: ${err.message}`);
        });
        console.log(`Index file contents: ${JSON.stringify(indexFileContents)}`);
    });
}
/*async function updateCurrentImage(): Promise<void> {
    let currentImageFile = await Handler.updateCurrentImage({}, {callbackWaitsForEmptyEventLoop: true}, function(){});
}*/
//updateCurrentImage();
//reportBuckets();
//getBucketContents();
//triggerPostToMarkBucket();
//getIndexFileContents();
