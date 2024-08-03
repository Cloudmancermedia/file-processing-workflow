import { S3 } from '@aws-sdk/client-s3';
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';

const s3 = new S3({});

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const { bucket, key } = JSON.parse(event.body || '{}');

  try {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    const headResult = await s3.headObject(params);

    // Example validation: Check file size and type
    const maxFileSize = 1024 * 1024 * 10; // 10MB
    const validFileTypes = ['image/jpeg', 'image/png'];

    if (
      headResult.ContentLength && 
      headResult.ContentLength > maxFileSize
    ) {
      throw new Error('File is too large');
    }

    if (
      headResult.ContentType &&
      !validFileTypes.includes(headResult.ContentType)
    ) {
      throw new Error('Invalid file type');
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
