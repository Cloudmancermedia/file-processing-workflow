import { S3Event, Context, S3Handler } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const stepfunctions = new SFNClient({});

export const handler: S3Handler = async (event: S3Event): Promise<any> => {
  try {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    const input = JSON.stringify({ bucket, key });
    const params = {
      stateMachineArn: process.env.STATE_MACHINE_ARN as string,
      input,
    };

    await stepfunctions.send(new StartExecutionCommand(params));

    return {
      message: 'Step Function started successfully.',
    }
  } catch (error) {
    console.error('Error starting Step Function execution', error);
    throw new Error('Error starting Step Function execution');
  }
};
