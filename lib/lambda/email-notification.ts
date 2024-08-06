import { SNS } from '@aws-sdk/client-sns';
import { Handler } from 'aws-lambda';
import { StepFunctionError } from './shared/errors';
import { DatabaseUpdateResult, NotificationResult } from './shared/types';

const sns = new SNS({});

export const handler: Handler<DatabaseUpdateResult, NotificationResult> = async (event: DatabaseUpdateResult): Promise<NotificationResult> => {
  const topicArn = process.env.TOPIC_ARN as string;
  const message = 'File processing completed successfully.';

  try {
    const { tableName, bucket, key } = event;
    const params = {
      Message: `Message: ${message}\nTable: ${tableName}\nBucket: ${bucket}\nKey: ${key}`,
      TopicArn: topicArn,
    };

    await sns.publish(params);

    return {
      message: `Notification sent. ${message}`
    };
  } catch (error: any) {
    console.error('Notification error:', error);
    throw new StepFunctionError(error);
  }
};
