import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';

const dynamoDbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

interface TransformedData {
  fileId: string;
  [key: string]: string;
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const { data } = JSON.parse(event.body || '{}');
  const tableName = process.env.TABLE_NAME as string;

  try {
    for (const item of data) {
      const params = {
        TableName: tableName,
        Item: {
          fileId: item.fileId,
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
