const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event) => {
    const { data } = event;
    const tableName = process.env.TABLE_NAME;

    // Update the DynamoDB table with the transformed data
    for (const item of data) {
        const params = {
            TableName: tableName,
            Item: {
                fileId: item.fileId,
                ...item
            }
        };

        await dynamodb.put(params).promise();
    }

    return { status: 'Data inserted successfully' };
};
