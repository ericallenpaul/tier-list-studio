import { describe, expect, it } from "vitest";

import { normalizePersistedState } from "../../src/renderer/state/persistedState";

describe("normalizePersistedState", () => {
  it("migrates legacy renderer board items to the current editor item shape", () => {
    const state = normalizePersistedState(
      {
        screen: "board",
        board: {
          name: "Legacy Board",
          tiers: [{ id: "s", label: "S", color: "#ef4444" }],
          items: [
            { id: "legacy-1", label: "Pizza", container: "pool" },
            { id: "legacy-2", label: "Ramen", container: "s", createdAt: "not-a-date" }
          ]
        }
      },
      "2026-06-18T12:00:00.000Z"
    );

    expect(state?.board?.items).toEqual([
      {
        id: "legacy-1",
        label: "Pizza",
        kind: "text",
        container: "pool",
        metadata: {},
        style: {},
        createdAt: "2026-06-18T12:00:00.000Z",
        updatedAt: "2026-06-18T12:00:00.000Z"
      },
      {
        id: "legacy-2",
        label: "Ramen",
        kind: "text",
        container: "s",
        metadata: {},
        style: {},
        createdAt: "2026-06-18T12:00:00.000Z",
        updatedAt: "2026-06-18T12:00:00.000Z"
      }
    ]);
  });
});
