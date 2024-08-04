import { APIGatewayProxyHandler, Handler } from 'aws-lambda';

interface ExtractedData {
  [key: string]: string | number;
}

// Helper function to format data for DynamoDB
const formatForDynamoDB = (item: ExtractedData) => {
  const formattedItem: { [key: string]: { S?: string; N?: string } } = {};

  for (const key in item) {
    if (typeof item[key] === 'number') {
      formattedItem[key] = { N: item[key].toString() };
    } else if (typeof item[key] === 'string') {
      formattedItem[key] = { S: item[key].toLowerCase() }; // Convert to lowercase
    }
  }

  return formattedItem;
};

export const handler: Handler = async (event: any) => {
  
  try {
    const { data } = event;
    const transformedData = data.map((item: ExtractedData) => formatForDynamoDB(item));

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
