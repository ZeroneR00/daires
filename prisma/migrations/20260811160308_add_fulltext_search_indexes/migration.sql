-- CreateIndex
CREATE INDEX post_text_fts_idx ON "post"
  USING GIN (to_tsvector('russian', "text"));

-- CreateIndex
CREATE INDEX track_fts_idx ON "track"
  USING GIN (to_tsvector('simple', "title" || ' ' || "artist"));

-- CreateIndex
CREATE INDEX user_fts_idx ON "user"
  USING GIN (to_tsvector('simple', "username" || ' ' || "name"));
