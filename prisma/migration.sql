-- Tabela de perfis do Instagram para prospecção de parceiros
-- Executar no Supabase SQL Editor do projeto ckkeqpebciwrjvnjeaaq

CREATE TABLE IF NOT EXISTS ig_profiles (
  id           SERIAL PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  full_name    TEXT,
  bio          TEXT,
  followers    INT,
  following    INT,
  posts_count  INT,
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  profile_url  TEXT,
  avatar_url   TEXT,
  uf           TEXT,
  cidade       TEXT,
  nicho        TEXT,
  status       TEXT NOT NULL DEFAULT 'sem_status',
  responsavel  TEXT,
  notas        TEXT,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS ig_profiles_status_idx    ON ig_profiles (status);
CREATE INDEX IF NOT EXISTS ig_profiles_uf_idx        ON ig_profiles (uf);
CREATE INDEX IF NOT EXISTS ig_profiles_followers_idx ON ig_profiles (followers DESC);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ig_profiles_updated_at ON ig_profiles;
CREATE TRIGGER ig_profiles_updated_at
  BEFORE UPDATE ON ig_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
