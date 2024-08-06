import { S3 } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import csvParser from 'csv-parser'; 
import { Readable } from 'stream';
import { ExtractionResult, ValidationResult } from './shared/types';
import { StepFunctionError } from './shared/errors';
import { ExtractedData } from './shared/types';

const s3 = new S3({});

export const handler: Handler<ValidationResult, ExtractionResult> = async (event: ValidationResult): Promise<ExtractionResult> => {
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

    //custom for dealing with the BOM character
    const parser = csvParser({
      mapHeaders: ({ header, index }: { header: string; index: number }) => {
        let transformedHeader = header;
        // Remove BOM from the first header if present
        if (index === 0 && header.startsWith('\ufeff')) {
          transformedHeader = header.substring(1);
        }
        return transformedHeader.toLowerCase().replace(/\s+/g, '_');
      },
    });

    await new Promise((resolve, reject) => {
      dataStream
        .pipe(parser)
        .on('data', (row: Record<string, string>) => {
          const convertedRow: ExtractedData = {};
          // Iterate over each key-value pair in the row
          for (const [key, value] of Object.entries(row)) {
            // Attempt to parse the value as a number
            const parsedNumber = Number(value);
            convertedRow[key] = isNaN(parsedNumber) ? value : parsedNumber;
          }
          extractedData.push(convertedRow);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    return { 
      data: JSON.stringify(extractedData),
      bucket,
      key
    }

  } catch (error: any) {
    console.error('Data extraction error:', error);
    throw new StepFunctionError(error);
  }
};
