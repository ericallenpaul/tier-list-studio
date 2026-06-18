import { useEffect, useState } from "react";

import type { UserSettings } from "../../shared/models/entities";

type Theme = {
  name: string;
  accent: string;
  background: string;
};

type SettingsPageProps = {
  activeTheme: Theme;
  settings: UserSettings | null;
  onSaveSettings: (openAiApiKey?: string) => Promise<void>;
  onOpenPresentation: () => void;
};

export const SettingsPage = ({ activeTheme, settings, onSaveSettings, onOpenPresentation }: SettingsPageProps) => {
  const [openAiApiKey, setOpenAiApiKey] = useState(settings?.ai.openAiApiKey ?? "");
  const [hasEditedApiKey, setHasEditedApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOpenAiApiKey(settings?.ai.openAiApiKey ?? "");
    setHasEditedApiKey(false);
  }, [settings?.ai.openAiApiKey, settings?.ai.openAiApiKeyConfigured]);

  const saveSettings = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onSaveSettings(hasEditedApiKey ? openAiApiKey : undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="settings-page">
      <section className="panel">
        <div className="panel-head">
          <span className="panel-title">General</span>
          <span className="panel-chip">Settings</span>
        </div>
        <div className="settings-grid">
          <div className="setting-row">
            <span>Theme</span>
            <button className="pill-button">{activeTheme.name}</button>
          </div>
          <div className="setting-row">
            <span>Presentation</span>
            <button className="pill-button" onClick={onOpenPresentation}>
              Enabled
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <span className="panel-title">Providers</span>
          <span className="panel-chip">Settings</span>
        </div>
        <div className="provider-list">
          <div className="provider-card">
            <div>
              <div className="provider-name">OpenAI</div>
              <div className="provider-state">{openAiApiKey.trim() || settings?.ai.openAiApiKeyConfigured ? "Configured" : "Not configured"}</div>
            </div>
            <label className="settings-field" htmlFor="openai-api-key">
              <span>OpenAI API key</span>
              <input
                id="openai-api-key"
                type="password"
                value={openAiApiKey}
                placeholder={settings?.ai.openAiApiKeyConfigured ? "Saved key hidden" : undefined}
                onChange={(event) => {
                  setOpenAiApiKey(event.target.value);
                  setHasEditedApiKey(true);
                }}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="settings-actions">
            <button className="primary" disabled={isSaving} onClick={saveSettings}>
              Save Settings
            </button>
          </div>
          {error ? <p className="modal-error">{error}</p> : null}
        </div>
      </section>
    </section>
  );
};
