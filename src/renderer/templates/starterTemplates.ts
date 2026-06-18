export type StarterTemplateDefinition = {
  rows: Array<{
    label: string;
    fillColor: string;
    textColor: string;
    style?: Record<string, unknown>;
  }>;
  items?: Array<{
    label: string;
    sourceType: "text" | "image" | "video" | "mixed";
    container: "pool" | "tier";
    rowIndex: number | null;
    sortOrder: number;
    metadata?: Record<string, unknown>;
    style?: Record<string, unknown>;
  }>;
  style: Record<string, unknown>;
};

export type StarterTemplateSeed = {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: StarterTemplateDefinition;
};

const placedText = (labelsByRow: string[][]) =>
  labelsByRow.flatMap((labels, rowIndex) =>
    labels.map((label, sortOrder) => ({
      label,
      sourceType: "text" as const,
      container: "tier" as const,
      rowIndex,
      sortOrder
    }))
  );

export const starterTemplates: StarterTemplateSeed[] = [
  {
    id: "template-launch-week",
    name: "Launch Week",
    description: "S through D launch board with sample creator gear.",
    category: "General",
    definition: {
      rows: [
        { label: "S", fillColor: "#ef4444", textColor: "#ffffff" },
        { label: "A", fillColor: "#f97316", textColor: "#111827" },
        { label: "B", fillColor: "#eab308", textColor: "#111827" },
        { label: "C", fillColor: "#22c55e", textColor: "#111827" },
        { label: "D", fillColor: "#3b82f6", textColor: "#ffffff" }
      ],
      items: [
        { label: "Ramen", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 0 },
        { label: "Coffee", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 1 },
        { label: "Camera", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 2 },
        { label: "Headphones", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 3 },
        { label: "Notebook", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 4 },
        { label: "Desk Lamp", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 5 },
        { label: "Microphone", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 6 },
        { label: "Mouse", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 7 }
      ],
      style: {}
    }
  },
  {
    id: "template-midnight-neon",
    name: "Midnight Neon",
    description: "A high-contrast creator board tuned for screen capture and video overlays.",
    category: "Presentation",
    definition: {
      rows: [
        { label: "Instant Classic", fillColor: "#ff2e63", textColor: "#ffffff" },
        { label: "Main Stage", fillColor: "#08d9d6", textColor: "#06111f" },
        { label: "Solid Rotation", fillColor: "#f9c74f", textColor: "#151515" },
        { label: "Deep Cut", fillColor: "#52b788", textColor: "#06111f" }
      ],
      items: placedText([
        ["Cold Open", "Final Reveal", "Logo Sting"],
        ["Hero Shot", "Beat Drop", "Title Card", "Spotlight"],
        ["Reaction", "Montage", "Lower Third", "Texture"],
        ["Alt Take", "Cutaway", "Outro"]
      ]),
      style: {
        background: "linear-gradient(145deg, #070a12 0%, #111827 44%, #151017 100%)",
        surfaceBackground: "rgba(2, 6, 23, 0.66)",
        rowBackground: "rgba(8, 13, 28, 0.86)",
        rowBorderColor: "rgba(8, 217, 214, 0.32)",
        labelWidth: 176,
        itemSize: 88,
        rowMinHeight: 118,
        itemBackground: "rgba(15, 23, 42, 0.94)",
        itemBorderColor: "rgba(255, 46, 99, 0.38)",
        itemTextColor: "#f8fafc",
        boardMaxWidth: 1180,
        effects: {
          glow: true,
          vignette: true
        }
      }
    }
  },
  {
    id: "template-tournament-board",
    name: "Tournament Board",
    description: "Bracket-friendly rank groups with bold warm labels and dense item spacing.",
    category: "Competition",
    definition: {
      rows: [
        { label: "Champion", fillColor: "#f97316", textColor: "#111827" },
        { label: "Finalists", fillColor: "#facc15", textColor: "#111827" },
        { label: "Contenders", fillColor: "#22c55e", textColor: "#052e16" },
        { label: "Wild Cards", fillColor: "#64748b", textColor: "#ffffff" },
        { label: "Eliminated", fillColor: "#991b1b", textColor: "#ffffff" }
      ],
      items: placedText([
        ["North Star", "Ace"],
        ["Comet", "Vanguard", "Rush"],
        ["Orbit", "Blitz", "Pulse", "Anchor"],
        ["Wildcard A", "Wildcard B", "Upset Pick"],
        ["Long Shot", "Bench", "Scratch"]
      ]),
      style: {
        background: "linear-gradient(145deg, #16110b 0%, #242018 45%, #10151c 100%)",
        surfaceBackground: "rgba(24, 20, 14, 0.72)",
        rowBackground: "rgba(29, 24, 18, 0.9)",
        rowBorderColor: "rgba(250, 204, 21, 0.28)",
        labelWidth: 158,
        itemSize: 82,
        rowMinHeight: 104,
        itemBackground: "#17202a",
        itemBorderColor: "rgba(249, 115, 22, 0.34)",
        itemTextColor: "#fff7ed",
        boardMaxWidth: 1140,
        effects: {
          glow: false,
          vignette: true
        }
      }
    }
  },
  {
    id: "template-clean-studio",
    name: "Clean Studio",
    description: "Bright neutral presentation board for workshops, reviews, and product planning.",
    category: "Planning",
    definition: {
      rows: [
        { label: "Feature", fillColor: "#2563eb", textColor: "#ffffff" },
        { label: "Ready", fillColor: "#14b8a6", textColor: "#042f2e" },
        { label: "Needs Work", fillColor: "#f59e0b", textColor: "#111827" },
        { label: "Later", fillColor: "#94a3b8", textColor: "#111827" }
      ],
      items: placedText([
        ["Hero Layout", "Export UX", "Template Menu"],
        ["Keyboard Flow", "PNG Output", "CSV Export"],
        ["Asset Names", "Row Colors", "Dock Density"],
        ["Importer", "Cloud Sync", "Print View"]
      ]),
      style: {
        background: "linear-gradient(145deg, #f8fafc 0%, #e5edf4 56%, #dce7ef 100%)",
        surfaceBackground: "rgba(255, 255, 255, 0.7)",
        rowBackground: "rgba(255, 255, 255, 0.86)",
        rowBorderColor: "rgba(51, 65, 85, 0.2)",
        labelWidth: 154,
        itemSize: 80,
        rowMinHeight: 106,
        itemBackground: "#ffffff",
        itemBorderColor: "rgba(37, 99, 235, 0.2)",
        itemTextColor: "#0f172a",
        boardMaxWidth: 1100,
        effects: {
          glow: false,
          vignette: false
        }
      }
    }
  },
  {
    id: "template-classic-ranking",
    name: "Classic Ranking",
    description: "S through D rows for general rankings.",
    category: "General",
    definition: {
      rows: [
        { label: "S", fillColor: "#ef4444", textColor: "#ffffff" },
        { label: "A", fillColor: "#f97316", textColor: "#111827" },
        { label: "B", fillColor: "#eab308", textColor: "#111827" },
        { label: "C", fillColor: "#22c55e", textColor: "#111827" },
        { label: "D", fillColor: "#3b82f6", textColor: "#ffffff" }
      ],
      style: {}
    }
  },
  {
    id: "template-simple-priority",
    name: "Simple Priority",
    description: "High, medium, low, and backlog rows.",
    category: "Planning",
    definition: {
      rows: [
        { label: "High", fillColor: "#dc2626", textColor: "#ffffff" },
        { label: "Medium", fillColor: "#f59e0b", textColor: "#111827" },
        { label: "Low", fillColor: "#16a34a", textColor: "#ffffff" },
        { label: "Backlog", fillColor: "#64748b", textColor: "#ffffff" }
      ],
      style: {}
    }
  }
];
