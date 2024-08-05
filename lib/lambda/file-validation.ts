import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import { ValidationResult } from './shared/types';
import { StepFunctionError } from './shared/errors';

const s3 = new S3Client({});

export const handler: Handler<ValidationResult> = async (event: ValidationResult) => {
  console.log('Event:', event);
  
  try {
    const { bucket, key } = event;
    const params = {
      Bucket: bucket,
      Key: key,
    };
    console.log('Validating file:', params);
    const headResult = await s3.send(new HeadObjectCommand(params));
    console.log('Head result:', headResult);
    console.log('File size:', headResult.ContentLength);
    
    const maxFileSize = 1024 * 1024 * 10; // 10MB
    const validFileTypes = ['text/csv', 'application/csv'];

    // Validate file size
    if (headResult.ContentLength && headResult.ContentLength > maxFileSize) {
      throw new Error('File is too large.');
    }

    // Validate file type
    if (headResult.ContentType) {
      if (!validFileTypes.includes(headResult.ContentType)) {
        throw new Error('Invalid file type.');
      }
    } else {
      throw new Error('Unable to determine file type.');
    }

    console.log('File validation successful.');
    return {
      body: { bucket, key }
    };

  } catch (error: any) {
    console.error('File validation error was caught:', error);
    throw new StepFunctionError(error);
  }
};
