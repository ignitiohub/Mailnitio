import { financialServicesPack } from "./financial-services";
import { genericPack } from "./generic";
import type { IndustryPack, PackId } from "./types";
import { utilitiesPack } from "./utilities";

export * from "./generate";
export * from "./types";

export const industryPacks: Record<PackId, IndustryPack> = {
  "financial-services": financialServicesPack,
  utilities: utilitiesPack,
  generic: genericPack,
};

export function getPack(id: string): IndustryPack | undefined {
  return (industryPacks as Record<string, IndustryPack>)[id];
}
