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
const s3Connector_1 = require("./s3Connector");
const KEY = process.env.KEY;
const SECRET = process.env.SECRET;
let connectorInstance;
if (KEY && SECRET) {
    connectorInstance = new s3Connector_1.default(KEY, SECRET);
}
else {
    connectorInstance = new s3Connector_1.default();
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
        console.log(`Response from bucket contents request was: ${JSON.stringify(bucketResponse)}`);
    });
}
reportBuckets();
getBucketContents();
