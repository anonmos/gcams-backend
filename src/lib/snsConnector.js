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
const SNS = require("aws-sdk/clients/sns");
class SNSConnector {
    constructor(KEY, SECRET) {
        let options = {
            apiVersion: '2012-08-10',
            signatureVersion: 'v4',
            region: 'us-east-1',
        };
        if (KEY && SECRET) {
            let keySecret = {
                accessKeyId: KEY,
                secretAccessKey: SECRET
            };
            Object.assign(options, keySecret);
        }
        this.instance = new SNS(options);
    }
    postMessageToTopic(topic, message) {
        return __awaiter(this, void 0, void 0, function* () {
            let params = {
                Message: message,
                Subject: 'Refresh Buckets',
                TopicArn: topic,
            };
            return new Promise((resolve, reject) => {
                this.instance.publish(params, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
}
exports.default = SNSConnector;
