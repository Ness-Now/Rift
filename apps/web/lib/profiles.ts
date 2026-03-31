import type { RiotProfile } from "@rift/shared-types";

export function selectPreferredProfile(
  profiles: RiotProfile[],
  selectedProfileId: number | null | undefined
) {
  return profiles.find((profile) => profile.id === selectedProfileId)
    ?? profiles.find((profile) => profile.is_primary)
    ?? profiles[0]
    ?? null;
}
