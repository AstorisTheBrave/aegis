export interface OfficialConnectorProfile {
  readonly id: string;
  readonly vendor: string;
  readonly authentication: readonly ('OAUTH2' | 'API_TOKEN' | 'APP_INSTALLATION')[];
  readonly minimumReadScopes: readonly string[];
  readonly readEndpoints: readonly string[];
  readonly status: 'profiled';
  readonly liveCertification: 'required';
}

export const officialConnectorProfiles: readonly OfficialConnectorProfile[] = [
  profile(
    'google-workspace',
    'Google Workspace',
    ['OAUTH2'],
    ['Directory API read-only directory scopes'],
    ['/admin/directory/v1/users', '/admin/directory/v1/groups'],
  ),
  profile(
    'slack',
    'Slack',
    ['OAUTH2'],
    ['users:read', 'channels:read', 'groups:read', 'im:read', 'mpim:read'],
    ['/api/users.list', '/api/conversations.list'],
  ),
  profile(
    'microsoft-entra-id',
    'Microsoft Entra ID',
    ['OAUTH2'],
    ['User.Read.All', 'GroupMember.Read.All'],
    ['/v1.0/users', '/v1.0/groups'],
  ),
  profile(
    'gitlab',
    'GitLab',
    ['API_TOKEN', 'OAUTH2'],
    ['read_api'],
    ['/api/v4/groups/:id/members/all', '/api/v4/groups/:id/projects'],
  ),
  profile(
    'okta',
    'Okta',
    ['OAUTH2', 'API_TOKEN'],
    ['okta.users.read', 'okta.groups.read'],
    ['/api/v1/users', '/api/v1/groups'],
  ),
  profile(
    'aws-iam',
    'AWS IAM',
    ['API_TOKEN'],
    ['iam:ListUsers', 'iam:ListGroups', 'iam:GetGroup'],
    ['IAM ListUsers', 'IAM ListGroups', 'IAM GetGroup'],
  ),
  profile(
    'atlassian',
    'Atlassian Cloud',
    ['OAUTH2', 'API_TOKEN'],
    ['read:jira-user', 'read:confluence-user'],
    ['/rest/api/3/users/search', '/rest/api/3/group/member'],
  ),
  profile(
    'notion',
    'Notion',
    ['OAUTH2', 'API_TOKEN'],
    ['read content capability'],
    ['/v1/users', '/v1/search'],
  ),
];

function profile(
  id: string,
  vendor: string,
  authentication: OfficialConnectorProfile['authentication'],
  minimumReadScopes: readonly string[],
  readEndpoints: readonly string[],
): OfficialConnectorProfile {
  return {
    id,
    vendor,
    authentication,
    minimumReadScopes,
    readEndpoints,
    status: 'profiled',
    liveCertification: 'required',
  };
}
