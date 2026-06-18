import { useEffect, useMemo, useState } from "react";

import type { AiProvider, TierItem } from "../../shared/models/entities";

type AddItemsMode = "text" | "images" | "video" | "search" | "ai";

type AddItemsModalProps = {
  listId: string;
  onClose: () => void;
  onItemsAdded: () => Promise<void>;
};

const modes: Array<{ id: AddItemsMode; label: string }> = [
  { id: "text", label: "Text" },
  { id: "images", label: "Images" },
  { id: "video", label: "Video" },
  { id: "search", label: "Search" },
  { id: "ai", label: "AI" }
];

const mediaFilters = {
  images: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  video: [{ name: "Video", extensions: ["mp4", "mov", "webm", "m4v"] }]
};

export const AddItemsModal = ({ listId, onClose, onItemsAdded }: AddItemsModalProps) => {
  const [mode, setMode] = useState<AddItemsMode>("text");
  const [text, setText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<TierItem[]>([]);
  const [selectedSearchIds, setSelectedSearchIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("local");
  const [prompt, setPrompt] = useState("");
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [selectedGeneratedIndexes, setSelectedGeneratedIndexes] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lines = useMemo(() => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), [text]);
  const selectedSearchLabels = useMemo(
    () => searchResults.filter((item) => selectedSearchIds.has(item.id)).map((item) => item.label),
    [searchResults, selectedSearchIds]
  );
  const selectedGeneratedLabels = useMemo(
    () => generatedItems.filter((_, index) => selectedGeneratedIndexes.has(index)),
    [generatedItems, selectedGeneratedIndexes]
  );
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId),
    [providers, selectedProviderId]
  );

  useEffect(() => {
    if (mode !== "search") {
      return;
    }

    const query = searchText.trim();
    if (!query) {
      setSearchResults([]);
      setSelectedSearchIds(new Set());
      setIsSearching(false);
      return;
    }

    let canceled = false;
    setIsSearching(true);
    const timeout = window.setTimeout(() => {
      void window.tierStudio.items.search({ text: query, listId }).then((items) => {
        if (canceled) {
          return;
        }
        setSearchResults(items);
        setSelectedSearchIds(new Set(items.map((item) => item.id)));
        setError(null);
      }).catch((caught) => {
        if (!canceled) {
          setError(caught instanceof Error ? caught.message : "Could not search items.");
        }
      }).finally(() => {
        if (!canceled) {
          setIsSearching(false);
        }
      });
    }, 150);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [listId, mode, searchText]);

  useEffect(() => {
    if (mode !== "ai" || providers.length > 0) {
      return;
    }

    let canceled = false;
    void window.tierStudio.ai.getProviders().then((availableProviders) => {
      if (canceled) {
        return;
      }
      setProviders(availableProviders);
      const localProvider = availableProviders.find((provider) => provider.id === "local");
      const firstEnabledProvider = availableProviders.find((provider) => provider.enabled);
      setSelectedProviderId((localProvider?.enabled ? localProvider : firstEnabledProvider ?? availableProviders[0])?.id ?? "local");
    }).catch((caught) => {
      if (!canceled) {
        setError(caught instanceof Error ? caught.message : "Could not load AI providers.");
      }
    });

    return () => {
      canceled = true;
    };
  }, [mode, providers.length]);

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

  const addSearchItems = () => {
    if (selectedSearchLabels.length === 0) {
      setError("Select at least one search result.");
      return;
    }
    void finish(() => window.tierStudio.items.addTextBatch(listId, selectedSearchLabels));
  };

  const generateItems = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Enter a prompt.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    void window.tierStudio.ai.generateItems({
      providerId: selectedProviderId,
      prompt: trimmedPrompt,
      count: 20,
      contextListId: listId
    }).then((result) => {
      const labels = result.items.map((item) => item.label.trim()).filter(Boolean);
      setGeneratedItems(labels);
      setSelectedGeneratedIndexes(new Set(labels.map((_, index) => index)));
    }).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not generate items.");
    }).finally(() => {
      setIsGenerating(false);
    });
  };

  const addGeneratedItems = () => {
    if (selectedGeneratedLabels.length === 0) {
      setError("Select at least one generated item.");
      return;
    }
    void finish(() => window.tierStudio.items.addTextBatch(listId, selectedGeneratedLabels));
  };

  const importMedia = (mediaMode: "images" | "video") => {
    setError(null);
    setIsSubmitting(true);
    void (async () => {
      try {
        const result = await window.tierStudio.dialogs.openFiles({
          multiple: true,
          filters: mediaFilters[mediaMode]
        });
        if (result.canceled || result.filePaths.length === 0) {
          return;
        }
        await window.tierStudio.items.importAssets(listId, result.filePaths);
        await onItemsAdded();
        onClose();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not add items.");
      } finally {
        setIsSubmitting(false);
      }
    })();
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
        ) : mode === "images" || mode === "video" ? (
          <div className="modal-body" role="tabpanel">
            <div className="media-import-panel">
              <span className="panel-title">{mode === "images" ? "Image files" : "Video files"}</span>
              <button className="primary" disabled={isSubmitting} onClick={() => importMedia(mode)}>
                Choose {mode === "images" ? "Images" : "Videos"}
              </button>
            </div>
          </div>
        ) : mode === "search" ? (
          <div className="modal-body" role="tabpanel">
            <label className="field-label" htmlFor="item-library-search">
              Search
            </label>
            <input
              id="item-library-search"
              value={searchText}
              placeholder="Search library"
              onChange={(event) => setSearchText(event.target.value)}
              autoFocus
            />
            <div className="review-list" aria-label="Search results">
              {isSearching ? <p className="modal-note">Searching...</p> : null}
              {!isSearching && searchText.trim() && searchResults.length === 0 ? (
                <p className="modal-note">No matching items.</p>
              ) : null}
              {searchResults.map((item) => (
                <label className="review-row" key={item.id}>
                  <input
                    type="checkbox"
                    checked={selectedSearchIds.has(item.id)}
                    onChange={(event) => {
                      setSelectedSearchIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(item.id);
                        } else {
                          next.delete(item.id);
                        }
                        return next;
                      });
                    }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="pill-button" onClick={onClose}>
                Cancel
              </button>
              <button className="primary" disabled={isSubmitting || selectedSearchLabels.length === 0} onClick={addSearchItems}>
                Add {selectedSearchLabels.length} {selectedSearchLabels.length === 1 ? "Item" : "Items"}
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body" role="tabpanel">
            <label className="field-label" htmlFor="ai-provider">
              Provider
            </label>
            <select
              id="ai-provider"
              value={selectedProviderId}
              onChange={(event) => setSelectedProviderId(event.target.value)}
            >
              {providers.length === 0 ? <option value="local">Local</option> : null}
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id} disabled={!provider.enabled}>
                  {provider.name}{provider.enabled ? "" : provider.configured ? " (not available)" : " (not configured)"}
                </option>
              ))}
            </select>
            <label className="field-label" htmlFor="ai-prompt">
              Prompt
            </label>
            <textarea
              id="ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              autoFocus
            />
            <div className="modal-actions">
              <button className="pill-button" onClick={onClose}>
                Cancel
              </button>
              <button className="primary" disabled={isGenerating || !prompt.trim() || !selectedProvider?.enabled} onClick={generateItems}>
                {isGenerating ? "Generating" : "Generate"}
              </button>
            </div>
            <div className="review-list" data-testid="generated-items" aria-label="Generated items">
              {generatedItems.map((label, index) => (
                <label className="review-row" key={`${label}-${index}`}>
                  <input
                    type="checkbox"
                    checked={selectedGeneratedIndexes.has(index)}
                    onChange={(event) => {
                      setSelectedGeneratedIndexes((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(index);
                        } else {
                          next.delete(index);
                        }
                        return next;
                      });
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {generatedItems.length > 0 ? (
              <div className="modal-actions">
                <span className="modal-note">{selectedGeneratedLabels.length} selected</span>
                <button className="primary" disabled={isSubmitting || selectedGeneratedLabels.length === 0} onClick={addGeneratedItems}>
                  Add {selectedGeneratedLabels.length} {selectedGeneratedLabels.length === 1 ? "Item" : "Items"}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {error ? <p className="modal-error">{error}</p> : null}
      </section>
    </div>
  );
};
