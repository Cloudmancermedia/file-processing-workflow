import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';
import { DdbParams } from './shared/types';
import { StepFunctionError } from './shared/errors';

const dynamoDbClient = new DynamoDBClient({});;

export const handler: Handler = async (event: any) => {
  console.log('Event:', event);

  try {
    const { data, bucket, key } = event;
    console.log('Event Data:', data);
    const parsedData = JSON.parse(data);
    console.log('Parsed Data:', parsedData);
    const tableName = process.env.TABLE_NAME as string;
    for (const item of parsedData) {
      const params: DdbParams = {
        TableName: tableName,
        Item: {
          ...item,
        },
      };
      console.log('Inserting data:', params);
      await dynamoDbClient.send(new PutItemCommand(params));
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
