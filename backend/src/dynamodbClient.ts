import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb';

import {CONFIG} from './config';

const dynamoDbClient = new DynamoDBClient({
  region: CONFIG.awsRegion,
});

export const dynamoDbDocumentClient = DynamoDBDocumentClient.from(
  dynamoDbClient,
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  },
);
