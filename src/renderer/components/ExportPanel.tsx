import { useState } from "react";

import type { ExportArtifact } from "../../shared/models/entities";

export type ImageExportFormat = "png" | "jpg";

type ExportPanelProps = {
  canExportSavedArtifacts: boolean;
  onExportImage: (format: ImageExportFormat) => Promise<ExportArtifact>;
  onExportCsv: () => Promise<ExportArtifact>;
  onExportPackage: () => Promise<ExportArtifact>;
};

export const ExportPanel = ({
  canExportSavedArtifacts,
  onExportImage,
  onExportCsv,
  onExportPackage
}: ExportPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<ExportArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExport = async (label: string, action: () => Promise<ExportArtifact>) => {
    setBusyLabel(label);
    setError(null);
    try {
      const exported = await action();
      setArtifact(exported);
      window.dispatchEvent(new CustomEvent("tier-studio:export-complete", { detail: exported }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Could not export ${label}.`);
    } finally {
      setBusyLabel(null);
    }
  };

  const isBusy = busyLabel !== null;

  return (
    <div className="export-menu">
      <button className="primary" type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        Export
      </button>
      {isOpen ? (
        <section className="export-panel" aria-label="Export options">
          <div className="export-actions">
            <button type="button" className="pill-button" disabled={isBusy} onClick={() => void runExport("PNG", () => onExportImage("png"))}>
              {busyLabel === "PNG" ? "Exporting" : "PNG"}
            </button>
            <button type="button" className="pill-button" disabled={isBusy} onClick={() => void runExport("JPEG", () => onExportImage("jpg"))}>
              {busyLabel === "JPEG" ? "Exporting" : "JPEG"}
            </button>
            <button type="button" className="pill-button" disabled={isBusy || !canExportSavedArtifacts} onClick={() => void runExport("CSV", onExportCsv)}>
              {busyLabel === "CSV" ? "Exporting" : "CSV"}
            </button>
            <button
              type="button"
              className="pill-button"
              disabled={isBusy || !canExportSavedArtifacts}
              onClick={() => void runExport("Package", onExportPackage)}
            >
              {busyLabel === "Package" ? "Exporting" : "Package"}
            </button>
          </div>
          {!canExportSavedArtifacts ? <p className="export-status">Save the board before CSV or package export.</p> : null}
          {artifact ? <p className="export-status" role="status">{artifact.filePath}</p> : null}
          {error ? <p className="export-error" role="alert">{error}</p> : null}
        </section>
      ) : null}
    </div>
  );
};
