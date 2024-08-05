export interface S3Event {
  bucket: string;
  key: string;
}

export interface ValidationResult {
  bucket: string;
  key: string;
};

export interface ExtractedData {
  [key: string]: string | number;
}

export interface TransformedData {
  [key: string]: string;
}
export interface DdbParams {
  TableName: string;
  Item: TransformedData;
}

