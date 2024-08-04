// Define the custom event type for the Lambda handler
export interface S3Event {
  bucket: string;
  key: string;
}

// Define the custom result type for the Lambda handler
export interface ValidationResult {
  bucket: string;
  key: string;
};