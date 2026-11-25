CREATE TABLE kw_site (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sha TEXT NOT NULL CHECK (length(sha) = 64),
  document TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE kw_login_limits (
  slot INTEGER PRIMARY KEY CHECK (slot BETWEEN 0 AND 65535),
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS kw_photos (
  hash TEXT NOT NULL PRIMARY KEY CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes BLOB NOT NULL CHECK (length(bytes) BETWEEN 1 AND 150000)
) STRICT;
