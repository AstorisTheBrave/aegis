import { z } from 'zod';

export const CONNECTOR_PROTOCOL_VERSION = '1.0.0' as const;

export const readOnlyCapabilities = ['IDENTITY_READ', 'ACCESS_GRAPH_READ', 'USAGE_READ'] as const;

export const forbiddenV1Capabilities = [
  'ACTION_WRITE',
  'LIFECYCLE_WRITE',
  'ENTITLEMENT_WRITE',
] as const;

const capabilitySchema = z.enum([...readOnlyCapabilities, ...forbiddenV1Capabilities]);

const imageDigestSchema = z
  .string()
  .regex(
    /^(?:[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*)@sha256:[a-f0-9]{64}$/,
    'imageDigest must be an OCI image reference pinned to a sha256 digest',
  );

export const connectorManifestSchema = z
  .object({
    protocolVersion: z.literal(CONNECTOR_PROTOCOL_VERSION),
    id: z.string().regex(/^[a-z][a-z0-9-]{2,62}$/),
    vendor: z.string().min(1).max(120),
    capabilities: z.array(capabilitySchema).min(1),
    authenticationModes: z.array(z.enum(['OAUTH2', 'API_TOKEN', 'APP_INSTALLATION'])).min(1),
    minimumScopes: z.array(z.string().min(1)).min(1),
    imageDigest: imageDigestSchema,
  })
  .strict()
  .superRefine((manifest, context) => {
    const duplicates = manifest.capabilities.filter(
      (capability, index) => manifest.capabilities.indexOf(capability) !== index,
    );

    if (duplicates.length > 0) {
      context.addIssue({
        code: 'custom',
        message: `capabilities must not repeat values: ${[...new Set(duplicates)].join(', ')}`,
        path: ['capabilities'],
      });
    }

    const forbidden = manifest.capabilities.filter((capability) =>
      (forbiddenV1Capabilities as readonly string[]).includes(capability),
    );

    if (forbidden.length > 0) {
      context.addIssue({
        code: 'custom',
        message: `protocol v1 is read-only and does not permit: ${forbidden.join(', ')}`,
        path: ['capabilities'],
      });
    }
  });

export type ConnectorCapability = z.infer<typeof capabilitySchema>;
export type ConnectorManifest = z.infer<typeof connectorManifestSchema>;

export function parseManifest(input: unknown): ConnectorManifest {
  return connectorManifestSchema.parse(input);
}
