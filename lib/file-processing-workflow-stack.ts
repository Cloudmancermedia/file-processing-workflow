import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { DefinitionBody, Fail, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

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

    // DynamoDB Table
    const table = new TableV2(this, 'DataTable', {
      partitionKey: { name: 'name', type: AttributeType.STRING },
      tableName: 'file_processing_workflow_table',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Deploy and subscribe my email to the SNS topic

    const layer = new LayerVersion(
      this,
      "Layer",
      {
        code: Code.fromAsset("lib/lambda/layers"),
        compatibleRuntimes: [ Runtime.NODEJS_20_X],
        layerVersionName: "NodeJsLayer"
      }
    );

    // Define Lambda functions for each step
    const fileValidationFunction = new NodejsFunction(this, 'FileValidationFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'lib/lambda/file-validation.ts',
    });
    fileUploadBucket.grantRead(fileValidationFunction);

    const dataExtractionFunction = new NodejsFunction(this, 'DataExtractionFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'lib/lambda/data-extraction.ts',
      layers: [
        layer
      ],
      bundling: {
        externalModules: [
          'csv-parser'
        ]
      }
    });
    fileUploadBucket.grantRead(dataExtractionFunction);

    const dataTransformationFunction = new NodejsFunction(this, 'DataTransformationFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'lib/lambda/data-transform.ts',
    });

    const dynamoDbStoreFunction = new NodejsFunction(this, 'DynamoDbStoreFunction', {
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      entry: 'lib/lambda/dynamodb-store.ts',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(dynamoDbStoreFunction);

    const notificationFunction = new NodejsFunction(this, 'NotificationFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'lib/lambda/email-notification.ts',
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

    const dynamoDbStoreTask = new LambdaInvoke(this, 'DynamoDb Store', {
      lambdaFunction: dynamoDbStoreFunction,
      outputPath: '$.Payload',
    });

    const notificationTask = new LambdaInvoke(this, 'Send Notification', {
      lambdaFunction: notificationFunction,
      outputPath: '$.Payload',
    });

    // Define fail state
    const failState = new Fail(this, 'FailState', {
      cause: 'State Machine Failed',
      error: 'StateMachineError',
    });

    // Define the Step Functions state machine
    const stateMachine = new StateMachine(this, 'FileProcessingStateMachine', {
      definitionBody: DefinitionBody.fromChainable(
        validateFileTask
          .addCatch(failState, {
            errors: ['States.ALL'],
            resultPath: '$.errorInfo',
          })
          .next(
            dataExtractionTask
              .addCatch(failState, {
                errors: ['States.ALL'],
                resultPath: '$.errorInfo',
              })
          )
          .next(
            dataTransformationTask
              .addCatch(failState, {
                errors: ['States.ALL'],
                resultPath: '$.errorInfo',
              })
          )
          .next(
            dynamoDbStoreTask
              .addCatch(failState, {
                errors: ['States.ALL'],
                resultPath: '$.errorInfo',
              })
          )
          .next(
            notificationTask
              .addCatch(failState, {
                errors: ['States.ALL'],
                resultPath: '$.errorInfo',
              })
          )
      ),
    });

    // Lambda function to handle S3 events
    const s3EventHandler = new NodejsFunction(this, 'S3EventHandler', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'lib/lambda/s3-event.ts',
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn
      },
    });

    // Add S3 event notification to the bucket
    // make sure to import the correct LambdaDestination (from s3-notifications) as there are multiple constructs with the same name
    fileUploadBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(s3EventHandler) 
    );
    stateMachine.grantStartExecution(s3EventHandler);
  }
}
