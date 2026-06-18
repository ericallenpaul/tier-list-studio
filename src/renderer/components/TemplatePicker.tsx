import { useState } from "react";

import type { TierTemplate } from "../../shared/models/entities";

type TemplatePickerProps = {
  templates: TierTemplate[];
  canSaveTemplate: boolean;
  showSaveTemplate?: boolean;
  onSaveTemplate: (name: string) => Promise<void>;
  onUseTemplate: (templateId: string) => Promise<void>;
};

export const TemplatePicker = ({
  templates,
  canSaveTemplate,
  showSaveTemplate = true,
  onSaveTemplate,
  onUseTemplate
}: TemplatePickerProps) => {
  const [isUseOpen, setIsUseOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      setError("Enter a template name.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSaveTemplate(name);
      setTemplateName("");
      setIsSaveOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const useTemplate = async (templateId: string) => {
    setError(null);
    setUsingTemplateId(templateId);
    try {
      await onUseTemplate(templateId);
      setIsUseOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not use template.");
    } finally {
      setUsingTemplateId(null);
    }
  };

  const renderTemplateButton = (template: TierTemplate) => (
    <button
      key={template.id}
      className="template-card"
      style={{ ["--accent" as string]: template.rows[0]?.color ?? "#38bdf8" }}
      disabled={Boolean(usingTemplateId)}
      onClick={() => void useTemplate(template.id)}
    >
      <span className="template-name">{template.name}</span>
      {usingTemplateId === template.id ? <span className="template-status">Using...</span> : null}
      <span className="template-bar" />
    </button>
  );

  return (
    <section className="panel templates-panel">
      <div className="panel-head">
        <span className="panel-title">Templates</span>
        <div className="panel-actions">
          <button className="primary" onClick={() => setIsUseOpen(true)} disabled={templates.length === 0}>
            Use Template
          </button>
          {showSaveTemplate ? (
            <button className="primary" onClick={() => setIsSaveOpen(true)} disabled={!canSaveTemplate}>
              Save as Template
            </button>
          ) : null}
        </div>
      </div>
      {!isUseOpen ? <div className="template-list">{templates.map(renderTemplateButton)}</div> : null}
      {error && !isSaveOpen ? <p className="modal-error">{error}</p> : null}

      {isUseOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-label="Use template">
            <div className="modal-head">
              <div>
                <div className="eyebrow">Template</div>
                <h2>Use Template</h2>
              </div>
              <button className="icon-button" aria-label="Close" onClick={() => setIsUseOpen(false)}>
                x
              </button>
            </div>
            <div className="template-list modal-template-list">
              {templates.map(renderTemplateButton)}
            </div>
            {error ? <p className="modal-error">{error}</p> : null}
          </section>
        </div>
      ) : null}

      {isSaveOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-label="Save template">
            <div className="modal-head">
              <div>
                <div className="eyebrow">Template</div>
                <h2>Save Template</h2>
              </div>
              <button className="icon-button" aria-label="Close" onClick={() => setIsSaveOpen(false)}>
                x
              </button>
            </div>
            <div className="modal-body">
              <label className="field-label" htmlFor="template-name">
                Template name
              </label>
              <input
                id="template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button className="pill-button" onClick={() => setIsSaveOpen(false)}>
                  Cancel
                </button>
                <button className="primary" disabled={isSubmitting || !templateName.trim()} onClick={saveTemplate}>
                  Save Template
                </button>
              </div>
            </div>
            {error ? <p className="modal-error">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </section>
  );
};
