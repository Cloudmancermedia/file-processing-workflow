import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaDestination } from 'aws-cdk-lib/aws-appconfig';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export class FileProcessingWorkflowStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for file uploads
    const fileUploadBucket = new Bucket(this, 'FileUploadBucket', {
      bucketName: 'file-processing-workflow-bucket',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // SNS Topic for notifications
    const notificationTopic = new Topic(this, 'NotificationTopic');
    notificationTopic.addSubscription(new EmailSubscription('user@example.com'));

    // DynamoDB Table
    const table = new Table(this, 'FileDataTable', {
      partitionKey: { name: 'fileId', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Lambda function to handle S3 events
    const s3EventHandler = new Function(this, 'S3EventHandler', {
      runtime: Runtime.NODEJS_LATEST,
      handler: 's3_event_handler.lambdaHandler',
      code: Code.fromAsset('lambda'),
      environment: {
        BUCKET_NAME: fileUploadBucket.bucketName,
        TOPIC_ARN: notificationTopic.topicArn,
      },
    });

    // Grant S3 permissions to the Lambda function
    fileUploadBucket.grantReadWrite(s3EventHandler);

    // Add S3 event notification to the bucket
    fileUploadBucket.addEventNotification(EventType.OBJECT_CREATED, LambdaDestination.bind(s3EventHandler));

    // Define Lambda functions for each step
    const fileValidationFunction = new Function(this, 'FileValidationFunction', {
      runtime: Runtime.NODEJS_LATEST,
      handler: 'file_validation.lambdaHandler',
      code: Code.fromAsset('lambda'),
    });

    const dataExtractionFunction = new Function(this, 'DataExtractionFunction', {
      runtime: Runtime.NODEJS_LATEST,
      handler: 'data_extraction.lambdaHandler',
      code: Code.fromAsset('lambda'),
    });

    const dataTransformationFunction = new Function(this, 'DataTransformationFunction', {
      runtime: Runtime.NODEJS_LATEST,
      handler: 'data_transformation.lambdaHandler',
      code: Code.fromAsset('lambda'),
    });

    const databaseUpdateFunction = new Function(this, 'DatabaseUpdateFunction', {
      runtime: Runtime.NODEJS_LATEST,
      handler: 'database_update.lambdaHandler',
      code: Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(databaseUpdateFunction);

    const notificationFunction = new Function(this, 'NotificationFunction', {
      runtime: Runtime.NODEJS_LATEST,
      handler: 'notification.lambdaHandler',
      code: Code.fromAsset('lambda'),
      environment: {
        TOPIC_ARN: notificationTopic.topicArn,
      },
    });

    notificationTopic.grantPublish(notificationFunction);

    // Define Step Functions tasks
    const validateFileTask = new LambdaInvoke(this, 'Validate File', {
      lambdaFunction: fileValidationFunction,
      outputPath: '$.Payload',
    });

    const dataExtractionTask = new LambdaInvoke(this, 'Data Extraction', {
      lambdaFunction: dataExtractionFunction,
      outputPath: '$.Payload',
    });

    const dataTransformationTask = new LambdaInvoke(this, 'Data Transformation', {
      lambdaFunction: dataTransformationFunction,
      outputPath: '$.Payload',
    });

    const databaseUpdateTask = new LambdaInvoke(this, 'Database Update', {
      lambdaFunction: databaseUpdateFunction,
      outputPath: '$.Payload',
    });

    const notificationTask = new LambdaInvoke(this, 'Send Notification', {
      lambdaFunction: notificationFunction,
      outputPath: '$.Payload',
    });

    // Define the Step Functions state machine
    const definition = validateFileTask
      .next(dataExtractionTask)
      .next(dataTransformationTask)
      .next(databaseUpdateTask)
      .next(notificationTask);

    new StateMachine(this, 'FileProcessingStateMachine', {
      definition,
    });
  }
}
