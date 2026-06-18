import type { EditorTier } from "../domain/editorTypes";

type Template = {
  name: string;
  accent: string;
  tiers: EditorTier[];
  items: string[];
};

type Theme = {
  name: string;
  accent: string;
  background: string;
};

type Effects = {
  glow: boolean;
  shake: boolean;
  confetti: boolean;
};

type BottomRailProps = {
  templates: Template[];
  themes: Theme[];
  activeThemeIndex: number;
  activeTheme: Theme;
  effects: Effects;
  onCreateTemplate: () => void;
  onResetBoard: (template: Template) => void;
  onSetActiveThemeIndex: (index: number) => void;
  onToggleEffect: (key: keyof Effects) => void;
};

export const BottomRail = ({
  templates,
  themes,
  activeThemeIndex,
  activeTheme,
  effects,
  onCreateTemplate,
  onResetBoard,
  onSetActiveThemeIndex,
  onToggleEffect
}: BottomRailProps) => (
  <section className="bottom-rail" data-testid="bottom-rail">
    <section className="panel templates-panel">
      <div className="panel-head">
        <span className="panel-title">Templates</span>
        <button className="icon-button" aria-label="New template" onClick={onCreateTemplate}>
          +
        </button>
      </div>
      <div className="template-list">
        {templates.map((template) => (
          <button
            key={template.name}
            className="template-card"
            style={{ ["--accent" as string]: template.accent }}
            onClick={() => onResetBoard(template)}
          >
            <span className="template-name">{template.name}</span>
            <span className="template-bar" />
          </button>
        ))}
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Theme</span>
        <span className="panel-chip">{activeTheme.name}</span>
      </div>
      <div className="swatch-row">
        {themes.map((theme, index) => (
          <button
            key={theme.name}
            className={`swatch ${index === activeThemeIndex ? "active" : ""}`}
            style={{ backgroundColor: theme.accent }}
            aria-label={theme.name}
            onClick={() => onSetActiveThemeIndex(index)}
          />
        ))}
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Effects</span>
        <span className="panel-chip">Active</span>
      </div>
      <div className="toggle-grid">
        <div className="toggle-row">
          <span>Glow</span>
          <button className={`switch ${effects.glow ? "active" : ""}`} onClick={() => onToggleEffect("glow")} aria-label="Glow" />
        </div>
        <div className="toggle-row">
          <span>Shake</span>
          <button className={`switch ${effects.shake ? "active" : ""}`} onClick={() => onToggleEffect("shake")} aria-label="Shake" />
        </div>
        <div className="toggle-row">
          <span>Confetti</span>
          <button
            className={`switch ${effects.confetti ? "active" : ""}`}
            onClick={() => onToggleEffect("confetti")}
            aria-label="Confetti"
          />
        </div>
      </div>
    </section>
  </section>
);
