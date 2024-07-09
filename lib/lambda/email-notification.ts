const AWS = require('aws-sdk');
const sns = new AWS.SNS();

exports.lambdaHandler = async (event) => {
    const topicArn = process.env.TOPIC_ARN;
    const message = 'File processing completed successfully.';

    // Publish a notification to the SNS topic
    const params = {
        Message: message,
        TopicArn: topicArn,
    };

    await sns.publish(params).promise();

    return { status: 'Notification sent' };
};
