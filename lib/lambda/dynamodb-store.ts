import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Handler } from 'aws-lambda';
import { DdbParams } from './shared/types';

// This seems weird
const dynamoDbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const handler: Handler = async (event: any) => {
  console.log('Event:', event);

  try {
    const { data } = event;
    const tableName = process.env.TABLE_NAME as string;
    for (const item of data) {
      const params: DdbParams = {
        TableName: tableName,
        Item: {
          ...item,
        },
      };

      await ddbDocClient.send(new PutCommand(params));
    }

    return {
      statusCode: 200,
      body: 'Data inserted successfully',
    };
  } catch (error) {
    console.error('Database update error:', error);
    return {
      statusCode: 500,
      body: 'Database update failed',
    };
  }
};
