import type { AiItemProvider } from "./providerRegistry.js";

const breakfastItems = ["Pancakes", "Waffles", "Omelet", "Bagel", "Yogurt"];
const fallbackItems = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];

export const localAiItemProvider: AiItemProvider = {
  id: "local",
  label: "Local",
  configured: true,
  enabled: true,
  generateItems: async (input) => {
    const prompt = input.prompt.toLowerCase();
    const sourceItems = /\bbreakfast\b/.test(prompt) ? breakfastItems : fallbackItems;
    const count = Math.min(input.count, sourceItems.length);

    return {
      items: sourceItems.slice(0, count).map((label) => ({
        label,
        metadata: {
          source: "local-ai",
          prompt: input.prompt
        }
      }))
    };
  }
};
