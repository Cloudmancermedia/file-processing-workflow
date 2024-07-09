import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class FileProcessingWorkflowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for file uploads
    const fileUploadBucket = new s3.Bucket(this, 'FileUploadBucket', {
      bucketName: 'file-processing-workflow-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // SNS Topic for notifications
    const notificationTopic = new sns.Topic(this, 'NotificationTopic');
    notificationTopic.addSubscription(new snsSubscriptions.EmailSubscription('user@example.com'));

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'FileDataTable', {
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function to handle S3 events
    const s3EventHandler = new lambda.Function(this, 'S3EventHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 's3_event_handler.lambdaHandler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BUCKET_NAME: fileUploadBucket.bucketName,
        TOPIC_ARN: notificationTopic.topicArn,
      },
    });

    // Grant S3 permissions to the Lambda function
    fileUploadBucket.grantReadWrite(s3EventHandler);

    // Add S3 event notification to the bucket
    fileUploadBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3notifications.LambdaDestination(s3EventHandler));

    // Define Lambda functions for each step
    const fileValidationFunction = new lambda.Function(this, 'FileValidationFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'file_validation.lambdaHandler',
      code: lambda.Code.fromAsset('lambda'),
    });

    const dataExtractionFunction = new lambda.Function(this, 'DataExtractionFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'data_extraction.lambdaHandler',
      code: lambda.Code.fromAsset('lambda'),
    });

    const dataTransformationFunction = new lambda.Function(this, 'DataTransformationFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'data_transformation.lambdaHandler',
      code: lambda.Code.fromAsset('lambda'),
    });

    const databaseUpdateFunction = new lambda.Function(this, 'DatabaseUpdateFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'database_update.lambdaHandler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(databaseUpdateFunction);

    const notificationFunction = new lambda.Function(this, 'NotificationFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'notification.lambdaHandler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TOPIC_ARN: notificationTopic.topicArn,
      },
    });

    notificationTopic.grantPublish(notificationFunction);

    // Define Step Functions tasks
    const validateFileTask = new tasks.LambdaInvoke(this, 'Validate File', {
      lambdaFunction: fileValidationFunction,
      outputPath: '$.Payload',
    });

    const dataExtractionTask = new tasks.LambdaInvoke(this, 'Data Extraction', {
      lambdaFunction: dataExtractionFunction,
      outputPath: '$.Payload',
    });

    const dataTransformationTask = new tasks.LambdaInvoke(this, 'Data Transformation', {
      lambdaFunction: dataTransformationFunction,
      outputPath: '$.Payload',
    });

    const databaseUpdateTask = new tasks.LambdaInvoke(this, 'Database Update', {
      lambdaFunction: databaseUpdateFunction,
      outputPath: '$.Payload',
    });

    const notificationTask = new tasks.LambdaInvoke(this, 'Send Notification', {
      lambdaFunction: notificationFunction,
      outputPath: '$.Payload',
    });

    // Define the Step Functions state machine
    const definition = validateFileTask
      .next(dataExtractionTask)
      .next(dataTransformationTask)
      .next(databaseUpdateTask)
      .next(notificationTask);

    new stepfunctions.StateMachine(this, 'FileProcessingStateMachine', {
      definition,
    });
  }
}
