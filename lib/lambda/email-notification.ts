import { SNS } from '@aws-sdk/client-sns';
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';

const sns = new SNS({});

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const topicArn = process.env.TOPIC_ARN as string;
  const message = 'File processing completed successfully.';

  try {
    const params = {
      Message: message,
      TopicArn: topicArn,
    };

    await sns.publish(params);

    return {
      statusCode: 200,
      body: 'Notification sent',
    };
  } catch (error) {
    console.error('Notification error:', error);
    return {
      statusCode: 500,
      body: 'Notification failed',
    };
  }
};
