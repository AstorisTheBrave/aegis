import {
  DirectoryApiConnector,
  type DirectoryGroup,
  type DirectoryIdentity,
} from '@aegis/connector-runtime';

type GoogleUser = {
  id: string;
  primaryEmail: string;
  name?: { fullName?: string };
  suspended?: boolean;
  isAdmin?: boolean;
};
type GoogleGroup = { id: string; email: string; name?: string; adminCreated?: boolean };
type GoogleMember = { id: string; type?: string; role?: string };

export const googleWorkspaceReadOnlyScopes = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
] as const;

export class GoogleWorkspaceConnector extends DirectoryApiConnector {
  constructor(fetcher: typeof fetch = fetch) {
    super(
      {
        connectorId: 'google-workspace',
        source: 'Google Workspace',
        origin: 'https://admin.googleapis.com',
        headers: ({ token }) => ({ Authorization: `Bearer ${token}` }),
        usersPath: '/admin/directory/v1/users?customer=my_customer&projection=full&maxResults=500',
        groupsPath: '/admin/directory/v1/groups?customer=my_customer&maxResults=200',
        membersPath: (group) =>
          `/admin/directory/v1/groups/${encodeURIComponent(group.id)}/members?maxResults=200`,
        users: (payload) => ((payload as { users?: GoogleUser[] }).users ?? []).map(toUser),
        groups: (payload) => ((payload as { groups?: GoogleGroup[] }).groups ?? []).map(toGroup),
        memberships: (group, payload) =>
          ((payload as { members?: GoogleMember[] }).members ?? [])
            .filter((member) => member.type === 'USER')
            .map((member) => ({ groupId: group.id, identityId: member.id })),
        nextPath: (payload, currentPath) => {
          const token = (payload as { nextPageToken?: string }).nextPageToken;
          return token
            ? `${currentPath}${currentPath.includes('?') ? '&' : '?'}pageToken=${encodeURIComponent(token)}`
            : undefined;
        },
      },
      fetcher,
    );
  }
}

function toUser(user: GoogleUser): DirectoryIdentity {
  return {
    id: user.id,
    displayName: user.name?.fullName ?? user.primaryEmail,
    email: user.primaryEmail,
    active: !user.suspended,
    attributes: { isAdmin: user.isAdmin ?? false },
  };
}
function toGroup(group: GoogleGroup): DirectoryGroup {
  return {
    id: group.id,
    displayName: group.name ?? group.email,
    privileged: group.adminCreated ?? false,
    attributes: { email: group.email },
  };
}
