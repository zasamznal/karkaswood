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
