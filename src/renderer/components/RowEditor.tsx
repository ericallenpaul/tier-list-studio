import { useState, type FormEvent } from "react";

import type { EditorTier } from "../domain/editorTypes";

type RowEditorProps = {
  row: EditorTier;
  onClose: () => void;
  onSave: (rowId: string, patch: { label: string; color: string }) => Promise<void> | void;
};

export const RowEditor = ({ row, onClose, onSave }: RowEditorProps) => {
  const [label, setLabel] = useState(row.label);
  const [color, setColor] = useState(row.color);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveRow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      setError("Row label is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(row.id, { label: cleanLabel, color });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save row.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal-panel row-editor" role="dialog" aria-modal="true" aria-label={`Edit row ${row.label}`} onSubmit={saveRow}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Tier row</div>
            <h2>Edit row</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close row editor" onClick={onClose}>
            x
          </button>
        </div>

        <div className="modal-body">
          <label className="field-label" htmlFor="row-label">Row label</label>
          <input
            id="row-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />

          <label className="field-label" htmlFor="row-color">Row color</label>
          <input
            id="row-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </div>

        {error ? <p className="modal-error">{error}</p> : null}

        <div className="modal-actions">
          <button className="pill-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={isSaving}>Save row</button>
        </div>
      </form>
    </div>
  );
};
