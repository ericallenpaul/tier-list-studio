import { useMemo, useState } from "react";

type AddItemsMode = "text" | "images" | "video";

type AddItemsModalProps = {
  listId: string;
  onClose: () => void;
  onItemsAdded: () => Promise<void>;
};

const modes: Array<{ id: AddItemsMode; label: string }> = [
  { id: "text", label: "Text" },
  { id: "images", label: "Images" },
  { id: "video", label: "Video" }
];

const mediaFilters = {
  images: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  video: [{ name: "Video", extensions: ["mp4", "mov", "webm", "m4v"] }]
};

export const AddItemsModal = ({ listId, onClose, onItemsAdded }: AddItemsModalProps) => {
  const [mode, setMode] = useState<AddItemsMode>("text");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lines = useMemo(() => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), [text]);

  const finish = async (action: () => Promise<unknown>) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await action();
      await onItemsAdded();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add items.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTextItems = () => {
    if (lines.length === 0) {
      setError("Enter at least one item.");
      return;
    }
    void finish(() => window.tierStudio.items.addTextBatch(listId, lines));
  };

  const importMedia = (mediaMode: "images" | "video") => {
    void finish(async () => {
      const result = await window.tierStudio.dialogs.openFiles({
        multiple: true,
        filters: mediaFilters[mediaMode]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return;
      }
      await window.tierStudio.items.importAssets(listId, result.filePaths);
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label="Add content">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Items</div>
            <h2 id="add-items-title">Add Items</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="Add item modes">
          {modes.map((candidate) => (
            <button
              key={candidate.id}
              role="tab"
              aria-selected={mode === candidate.id}
              className={`menu-button ${mode === candidate.id ? "active" : ""}`}
              onClick={() => {
                setError(null);
                setMode(candidate.id);
              }}
            >
              {candidate.label}
            </button>
          ))}
        </div>

        {mode === "text" ? (
          <div className="modal-body" role="tabpanel">
            <label className="field-label" htmlFor="add-items-textarea">
              Items
            </label>
            <textarea
              id="add-items-textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              autoFocus
            />
            <div className="modal-actions">
              <button className="pill-button" onClick={onClose}>
                Cancel
              </button>
              <button className="primary" disabled={isSubmitting || lines.length === 0} onClick={addTextItems}>
                Add {lines.length} {lines.length === 1 ? "Item" : "Items"}
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body" role="tabpanel">
            <div className="media-import-panel">
              <span className="panel-title">{mode === "images" ? "Image files" : "Video files"}</span>
              <button className="primary" disabled={isSubmitting} onClick={() => importMedia(mode)}>
                Choose {mode === "images" ? "Images" : "Videos"}
              </button>
            </div>
          </div>
        )}

        {error ? <p className="modal-error">{error}</p> : null}
      </section>
    </div>
  );
};
