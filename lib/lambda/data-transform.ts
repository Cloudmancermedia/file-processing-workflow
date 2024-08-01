import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';

interface ExtractedData {
  [key: string]: string;
}

export const lambdaHandler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const { data } = JSON.parse(event.body || '{}');

  try {
    const transformedData = data.map((item: ExtractedData) => ({
      ...item,
      transformedField: item.someField.toUpperCase(), // Example transformation
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ data: transformedData }),
    };
  } catch (error) {
    console.error('Data transformation error:', error);
    return {
      statusCode: 500,
      body: 'Data transformation failed',
    };
  }
};
