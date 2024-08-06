import { Handler } from 'aws-lambda';
import { ExtractedData, ExtractionResult, TransformResult } from './shared/types';
import { StepFunctionError } from './shared/errors';

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

export const handler: Handler<ExtractionResult, TransformResult> = async (event: ExtractionResult): Promise<TransformResult> => {
  console.log('Event:', event);

  try {
    const { bucket, key } = event;
    const data = JSON.parse(event.data) as ExtractedData[];
    const transformedData = data.map((item: ExtractedData) => formatForDynamoDB(item));

    return {
      data: JSON.stringify(transformedData),
      bucket,
      key 
    };
  } catch (error: any) {
    console.error('Data transformation error:', error);
    throw new StepFunctionError(error);
  }
};
