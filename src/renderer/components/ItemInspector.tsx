import { useEffect, useState, type FormEvent } from "react";

import type { JsonRecord } from "../../shared/models/entities";
import type { EditorBoardItem } from "../domain/editorTypes";

type ItemInspectorProps = {
  item: EditorBoardItem | null;
  onSave: (itemId: string, patch: { label: string; metadata: JsonRecord }) => Promise<void> | void;
};

const formatMetadata = (metadata: JsonRecord) => JSON.stringify(metadata, null, 2);

export const ItemInspector = ({ item, onSave }: ItemInspectorProps) => {
  const [label, setLabel] = useState(item?.label ?? "");
  const [metadata, setMetadata] = useState(formatMetadata(item?.metadata ?? {}));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLabel(item?.label ?? "");
    setMetadata(formatMetadata(item?.metadata ?? {}));
    setError(null);
  }, [item]);

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) {
      return;
    }

    const cleanLabel = label.trim();
    if (!cleanLabel) {
      setError("Item label is required.");
      return;
    }

    let parsedMetadata: JsonRecord;
    try {
      const parsed = JSON.parse(metadata || "{}") as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Metadata must be a JSON object.");
      }
      parsedMetadata = parsed as JsonRecord;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Metadata must be valid JSON.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(item.id, { label: cleanLabel, metadata: parsedMetadata });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel item-inspector" aria-label="Item inspector">
      <div className="panel-head">
        <span className="panel-title">Inspector</span>
        <span className="panel-chip">{item ? item.kind : "None"}</span>
      </div>

      {item ? (
        <form className="inspector-form" onSubmit={saveItem}>
          <label className="field-label" htmlFor="item-label">Item label</label>
          <input
            id="item-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />

          <label className="field-label" htmlFor="item-metadata">Metadata</label>
          <textarea
            id="item-metadata"
            value={metadata}
            onChange={(event) => setMetadata(event.target.value)}
            rows={5}
          />

          <div className="inspector-facts">
            <span>Kind</span>
            <strong>{item.kind}</strong>
            <span>Created</span>
            <strong>{new Date(item.createdAt).toLocaleDateString()}</strong>
          </div>

          {error ? <p className="modal-error">{error}</p> : null}

          <div className="modal-actions">
            <button className="primary" type="submit" disabled={isSaving}>Save item</button>
          </div>
        </form>
      ) : (
        <div className="empty-inspector">Select an item to edit it.</div>
      )}
    </section>
  );
};
