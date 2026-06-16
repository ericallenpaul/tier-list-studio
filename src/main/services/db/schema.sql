CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  theme_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS tier_lists (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  categories_json TEXT NOT NULL DEFAULT '[]',
  board_style_json TEXT NOT NULL DEFAULT '{}',
  tier_style_json TEXT NOT NULL DEFAULT '{}',
  item_style_json TEXT NOT NULL DEFAULT '{}',
  interaction_json TEXT NOT NULL DEFAULT '{}',
  presentation_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id, slug)
) STRICT;

CREATE TABLE IF NOT EXISTS tier_rows (
  id TEXT PRIMARY KEY,
  tier_list_id TEXT NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  short_label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  fill_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  accent_color TEXT NOT NULL DEFAULT '',
  icon_text TEXT NOT NULL DEFAULT '',
  row_height INTEGER NOT NULL DEFAULT 96,
  max_items INTEGER,
  style_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tier_list_id, sort_order)
) STRICT;

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extension TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  source_path TEXT NOT NULL,
  managed_rel_path TEXT NOT NULL,
  thumb_rel_path TEXT NOT NULL DEFAULT '',
  poster_rel_path TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  tier_list_id TEXT NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('text','image','video','mixed')),
  label TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  style_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS item_positions (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  tier_list_id TEXT NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  container_type TEXT NOT NULL CHECK (container_type IN ('pool','tier')),
  tier_row_id TEXT REFERENCES tier_rows(id) ON DELETE CASCADE,
  sort_order REAL NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((container_type = 'pool' AND tier_row_id IS NULL) OR (container_type = 'tier' AND tier_row_id IS NOT NULL))
) STRICT;

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  source_tier_list_id TEXT REFERENCES tier_lists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  definition_json TEXT NOT NULL,
  built_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  tier_list_id TEXT NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  state_json TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS export_history (
  id TEXT PRIMARY KEY,
  tier_list_id TEXT NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  export_kind TEXT NOT NULL CHECK (export_kind IN ('png','jpeg','json','csv','print')),
  output_path TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lists_workspace_updated ON tier_lists(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rows_list_order ON tier_rows(tier_list_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_items_list_updated ON items(tier_list_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_row_order ON item_positions(tier_row_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_assets_sha ON media_assets(sha256);

CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entity_type,
  entity_id UNINDEXED,
  title,
  body,
  tags,
  tokenize = 'unicode61'
);
