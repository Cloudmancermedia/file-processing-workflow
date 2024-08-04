import { S3 } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import { csvParser } from 'csv-parser';
import { Readable } from 'stream';
import { ValidationResult } from './shared/types';

const s3 = new S3({});

interface ExtractedData {
  [key: string]: string;
}

export const handler: Handler<ValidationResult> = async (event: ValidationResult) => {
  console.log('Event:', event);
  
  try {
    const { bucket, key } = event;
    const params = {
      Bucket: bucket,
      Key: key,
    };

    const s3Object = await s3.getObject(params);
    const dataStream = s3Object.Body as Readable;

    const extractedData: ExtractedData[] = [];

    await new Promise((resolve, reject) => {
      dataStream
        .pipe(csvParser())
        .on('data', (row: ExtractedData) => extractedData.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    return {
      statusCode: 200,
      body: { data: extractedData },
    };
  } catch (error) {
    console.error('Data extraction error:', error);
    return {
      statusCode: 500,
      body: 'Data extraction failed',
    };
  }
};
