import {
  DirectoryApiConnector,
  type DirectoryGroup,
  type DirectoryIdentity,
} from '@aegis/connector-runtime';

type EntraUser = {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  accountEnabled?: boolean;
  userType?: string;
};
type EntraGroup = {
  id: string;
  displayName?: string;
  isAssignableToRole?: boolean;
  securityEnabled?: boolean;
};
type EntraMember = { id: string; '@odata.type'?: string };

export const entraReadOnlyScopes = ['User.Read.All', 'GroupMember.Read.All'] as const;

export class MicrosoftEntraIdConnector extends DirectoryApiConnector {
  constructor(fetcher: typeof fetch = fetch) {
    super(
      {
        connectorId: 'microsoft-entra-id',
        source: 'Microsoft Entra ID',
        origin: 'https://graph.microsoft.com',
        headers: ({ token }) => ({ Authorization: `Bearer ${token}` }),
        usersPath: '/v1.0/users?$select=id,displayName,userPrincipalName,accountEnabled,userType',
        groupsPath: '/v1.0/groups?$select=id,displayName,isAssignableToRole,securityEnabled',
        membersPath: (group) =>
          `/v1.0/groups/${encodeURIComponent(group.id)}/transitiveMembers?$select=id,displayName,userPrincipalName,accountEnabled`,
        users: (payload) => ((payload as { value?: EntraUser[] }).value ?? []).map(toUser),
        groups: (payload) => ((payload as { value?: EntraGroup[] }).value ?? []).map(toGroup),
        memberships: (group, payload) =>
          ((payload as { value?: EntraMember[] }).value ?? [])
            .filter((member) => member['@odata.type'] === '#microsoft.graph.user')
            .map((member) => ({
              groupId: group.id,
              identityId: member.id,
              grantType: 'INHERITED',
            })),
      },
      fetcher,
    );
  }
}
function toUser(user: EntraUser): DirectoryIdentity {
  return {
    id: user.id,
    displayName: user.displayName ?? user.userPrincipalName ?? user.id,
    email: user.userPrincipalName,
    active: user.accountEnabled,
    attributes: { userType: user.userType ?? 'Member' },
  };
}
function toGroup(group: EntraGroup): DirectoryGroup {
  return {
    id: group.id,
    displayName: group.displayName ?? group.id,
    privileged: group.isAssignableToRole ?? false,
    attributes: { securityEnabled: group.securityEnabled ?? false },
  };
}
