import { S3 } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import { ValidationResult } from './shared/types';

const s3 = new S3({});

export const handler: Handler<ValidationResult> = async (event: ValidationResult) => {
  console.log('Event:', event);
  
  try {
    const { bucket, key } = event;
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
      body: { bucket, key }
    };

  } catch (error) {
    console.error('File validation error:', error);
    throw new Error('File validation failed');
  }
};
