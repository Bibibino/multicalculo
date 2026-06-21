import { carrierAAdapter } from "@travel-quote/carrier-a";
import { carrierBAdapter } from "@travel-quote/carrier-b";
import { carrierCAdapter } from "@travel-quote/carrier-c";
import type { TravelInsuranceCarrierAdapter } from "@travel-quote/carrier-sdk";

export type AdapterRegistry = ReadonlyMap<string, TravelInsuranceCarrierAdapter>;

export const createAdapterRegistry = (): AdapterRegistry =>
  new Map([
    [carrierAAdapter.metadata.id, carrierAAdapter],
    [carrierBAdapter.metadata.id, carrierBAdapter],
    [carrierCAdapter.metadata.id, carrierCAdapter]
  ]);

export const getAdapter = (
  registry: AdapterRegistry,
  carrierSlug: string
): TravelInsuranceCarrierAdapter => {
  const adapter = registry.get(carrierSlug);

  if (!adapter) {
    throw new Error(`Adapter not registered: ${carrierSlug}`);
  }

  return adapter;
};
