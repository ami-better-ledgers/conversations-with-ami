-- Brand kit acceptances (Cloudflare D1, bound to the Pages project as "DB")
CREATE TABLE IF NOT EXISTS brand_kit_acceptances (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  accepted_at   TEXT NOT NULL,
  user_agent    TEXT
);
CREATE INDEX IF NOT EXISTS idx_brand_kit_email ON brand_kit_acceptances (email);
