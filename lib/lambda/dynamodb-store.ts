import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Handler } from 'aws-lambda';
import { DdbParams } from './shared/types';
import { StepFunctionError } from './shared/errors';

// This seems weird
const dynamoDbClient = new DynamoDB({});;

export const handler: Handler = async (event: any) => {
  console.log('Event:', event);

  try {
    const { data, bucket, key } = JSON.parse(event);
    const tableName = process.env.TABLE_NAME as string;
    for (const item of data) {
      const params: DdbParams = {
        TableName: tableName,
        Item: {
          ...item,
        },
      };
      console.log('Inserting data:', params);
      await dynamoDbClient.send(new PutCommand(params));
    }

    return { 
      message: 'Data inserted successfully.',
      tableName,
      bucket,
      key,
    };
  } catch (error: any) {
    console.error('Database update error:', error);
    throw new StepFunctionError(error);
  }
};
