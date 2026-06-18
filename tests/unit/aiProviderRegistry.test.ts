import { describe, expect, it } from "vitest";

import { createAiProviderRegistry, createDefaultAiProviderRegistry } from "../../src/main/services/ai/providerRegistry";
import { localAiItemProvider } from "../../src/main/services/ai/localProvider";

describe("ai provider registry", () => {
  it("lists providers without exposing generation functions", () => {
    const registry = createAiProviderRegistry({
      providers: [localAiItemProvider]
    });

    expect(registry.listProviders()).toEqual([
      {
        id: "local",
        label: "Local",
        configured: true,
        enabled: true
      }
    ]);
  });

  it("generates deterministic breakfast suggestions with the local provider", async () => {
    const registry = createAiProviderRegistry({
      providers: [localAiItemProvider]
    });

    await expect(registry.generateItems({
      providerId: "local",
      prompt: "Generate five breakfast foods",
      count: 5
    })).resolves.toEqual({
      items: [
        { label: "Pancakes", metadata: { source: "local-ai", prompt: "Generate five breakfast foods" } },
        { label: "Waffles", metadata: { source: "local-ai", prompt: "Generate five breakfast foods" } },
        { label: "Omelet", metadata: { source: "local-ai", prompt: "Generate five breakfast foods" } },
        { label: "Bagel", metadata: { source: "local-ai", prompt: "Generate five breakfast foods" } },
        { label: "Yogurt", metadata: { source: "local-ai", prompt: "Generate five breakfast foods" } }
      ]
    });
  });

  it("rejects unknown and unconfigured providers", async () => {
    const registry = createAiProviderRegistry({
      providers: [{
        id: "external",
        label: "External",
        configured: false,
        enabled: true,
        generateItems: async () => ({ items: [] })
      }]
    });

    await expect(registry.generateItems({
      providerId: "missing",
      prompt: "Ideas",
      count: 5
    })).rejects.toThrow(/Unknown AI provider/);

    await expect(registry.generateItems({
      providerId: "external",
      prompt: "Ideas",
      count: 5
    })).rejects.toThrow(/not configured/);
  });

  it("keeps OpenAI disabled even when a saved key is configured", async () => {
    const registry = createDefaultAiProviderRegistry({
      openAiApiKeyConfigured: true
    });

    expect(registry.listProviders()).toContainEqual({
      id: "openai",
      label: "OpenAI",
      configured: true,
      enabled: false
    });

    await expect(registry.generateItems({
      providerId: "openai",
      prompt: "Ideas",
      count: 5
    })).rejects.toThrow(/not available/);
  });
});
