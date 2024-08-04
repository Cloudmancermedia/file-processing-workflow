import { S3 } from '@aws-sdk/client-s3';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, Handler } from 'aws-lambda';

const s3 = new S3({});

// Define the custom event type for the Lambda handler
interface S3Event {
  bucket: string;
  key: string;
}

// Define the custom result type for the Lambda handler
interface ValidationResult {
  statusCode: number;
  body: string;
}

export const handler: Handler<ValidationResult> = async (event: ValidationResult) => {
  const { bucket, key } = JSON.parse(event.body || '{}');

  try {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    const headResult = await s3.headObject(params);

    // Example validation: Check file size and type
    const maxFileSize = 1024 * 1024 * 10; // 10MB
    const validFileTypes = ['text/csv', 'application/csv'];

    // Validate file size
    if (headResult.ContentLength && headResult.ContentLength > maxFileSize) {
      throw new Error('File is too large');
    }

    // Validate file type
    if (headResult.ContentType) {
      if (!validFileTypes.includes(headResult.ContentType)) {
        throw new Error('Invalid file type');
      }
      // Check for xlsx format
      if (headResult.ContentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        throw new Error('XLSX format is not allowed');
      }
    } else {
      throw new Error('Unable to determine file type');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ bucket, key }),
    };

  } catch (error) {
    console.error('File validation error:', error);
    return {
      statusCode: 400,
      body: 'File validation failed',
    };
  }
};
