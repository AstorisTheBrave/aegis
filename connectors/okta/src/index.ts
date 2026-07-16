import {
  DirectoryApiConnector,
  type DirectoryGroup,
  type DirectoryIdentity,
} from '@aegis/connector-runtime';

type OktaUser = {
  id: string;
  status?: string;
  profile?: { login?: string; email?: string; firstName?: string; lastName?: string };
};
type OktaGroup = { id: string; type?: string; profile?: { name?: string; description?: string } };
type OktaMember = { id: string };
export const oktaReadOnlyScopes = ['okta.users.read', 'okta.groups.read'] as const;

export class OktaConnector extends DirectoryApiConnector {
  constructor(origin: string, fetcher: typeof fetch = fetch) {
    super(
      {
        connectorId: 'okta',
        source: 'Okta',
        origin,
        headers: ({ token }) => ({ Authorization: `SSWS ${token}` }),
        usersPath: '/api/v1/users?limit=200',
        groupsPath: '/api/v1/groups?limit=200',
        membersPath: (group) => `/api/v1/groups/${encodeURIComponent(group.id)}/users?limit=200`,
        users: (payload) => (payload as OktaUser[]).map(toUser),
        groups: (payload) => (payload as OktaGroup[]).map(toGroup),
        memberships: (group, payload) =>
          (payload as OktaMember[]).map((member) => ({ groupId: group.id, identityId: member.id })),
      },
      fetcher,
    );
  }
}
function toUser(user: OktaUser): DirectoryIdentity {
  const profile = user.profile ?? {};
  return {
    id: user.id,
    displayName:
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.login || user.id,
    email: profile.email,
    active: user.status === 'ACTIVE',
    attributes: { status: user.status ?? 'UNKNOWN' },
  };
}
function toGroup(group: OktaGroup): DirectoryGroup {
  return {
    id: group.id,
    displayName: group.profile?.name ?? group.id,
    privileged: group.type === 'APP_GROUP',
    attributes: { type: group.type ?? 'UNKNOWN' },
  };
}
