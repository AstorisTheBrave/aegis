import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const awsIamReadOnlyActions = [
  'iam:ListUsers',
  'iam:ListGroups',
  'iam:GetGroup',
  'iam:ListAttachedUserPolicies',
] as const;
export class AwsIamConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('aws-iam', 'AWS IAM', source);
  }
}
