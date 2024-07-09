exports.lambdaHandler = async (event) => {
  // Extract bucket name and file key from the event
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  // Start the Step Function execution
  const stepfunctions = new AWS.StepFunctions();
  const params = {
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify({ bucket, key }),
  };

  await stepfunctions.startExecution(params).promise();

  return { statusCode: 200, body: 'Step Function started.' };
};
