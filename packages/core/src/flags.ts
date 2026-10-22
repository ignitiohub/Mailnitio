import { and, eq, schema, type Tx } from "@mailnitio/db";

/** Is a feature flag on for the current workspace? Workspace override wins over the platform default. */
export async function isFlagEnabled(tx: Tx, workspaceId: string, key: string): Promise<boolean> {
  const [override] = await tx
    .select({ enabled: schema.featureFlagOverrides.enabled })
    .from(schema.featureFlagOverrides)
    .where(
      and(
        eq(schema.featureFlagOverrides.workspaceId, workspaceId),
        eq(schema.featureFlagOverrides.flagKey, key),
      ),
    );
  if (override) return override.enabled;
  const [flag] = await tx
    .select({ defaultEnabled: schema.featureFlags.defaultEnabled })
    .from(schema.featureFlags)
    .where(eq(schema.featureFlags.key, key));
  return flag?.defaultEnabled ?? false;
}
