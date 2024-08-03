import { S3 } from '@aws-sdk/client-s3';
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3 = new S3({});

interface ExtractedData {
  [key: string]: string;
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const { bucket, key } = JSON.parse(event.body || '{}');

  try {
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
      body: JSON.stringify({ bucket, key, data: extractedData }),
    };
  } catch (error) {
    console.error('Data extraction error:', error);
    return {
      statusCode: 500,
      body: 'Data extraction failed',
    };
  }
};
