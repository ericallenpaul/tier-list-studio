import type { GeneratedItemsResult } from "../../../shared/models/api.js";
import type { AiGenerateItemsInput } from "../../../shared/schemas/inputs.js";
import { localAiItemProvider } from "./localProvider.js";

export type AiItemProvider = {
  id: string;
  label: string;
  configured: boolean;
  enabled: boolean;
  generateItems: (input: AiGenerateItemsInput) => Promise<GeneratedItemsResult>;
};

type ProviderSummary = Pick<AiItemProvider, "id" | "label" | "configured" | "enabled">;

type ProviderRegistryOptions = {
  providers: AiItemProvider[];
};

export const createAiProviderRegistry = ({ providers }: ProviderRegistryOptions) => {
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));

  const listProviders = (): ProviderSummary[] =>
    providers.map(({ id, label, configured, enabled }) => ({ id, label, configured, enabled }));

  const generateItems = async (input: AiGenerateItemsInput) => {
    const provider = providerMap.get(input.providerId);
    if (!provider) {
      throw new Error(`Unknown AI provider: ${input.providerId}`);
    }

    if (!provider.enabled) {
      throw new Error(`${provider.label} is not available.`);
    }

    if (!provider.configured) {
      throw new Error(`${provider.label} is not configured.`);
    }

    return provider.generateItems(input);
  };

  return {
    listProviders,
    generateItems
  };
};

const createOpenAiPlaceholderProvider = (configured: boolean): AiItemProvider => ({
  id: "openai",
  label: "OpenAI",
  configured,
  enabled: false,
  generateItems: async () => {
    throw new Error("OpenAI item generation is disabled until an external provider implementation is added.");
  }
});

export const createDefaultAiProviderRegistry = (options: { openAiApiKeyConfigured: boolean }) =>
  createAiProviderRegistry({
    providers: [
      localAiItemProvider,
      createOpenAiPlaceholderProvider(options.openAiApiKeyConfigured)
    ]
  });
