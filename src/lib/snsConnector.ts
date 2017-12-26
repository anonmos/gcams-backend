import * as SNS from "aws-sdk/clients/sns";
import {AWSError} from "aws-sdk";

export default class SNSConnector {
    private instance: SNS;

    constructor(KEY?: string, SECRET?: string) {
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

    public async postMessageToTopic(topic: string, message: string): Promise<AWSError | SNS.PublishResponse> {
        let params = {
            Message: message,
            Subject: 'Refresh Buckets',
            TopicArn: topic,
        };

        return new Promise((resolve, reject) => {
            this.instance.publish(params, (err: AWSError, data: SNS.PublishResponse) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            })
        })
    }
}