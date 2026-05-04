CREATE TEMP TABLE IF NOT EXISTS tmp_prompts_import (
  act TEXT,
  prompt TEXT,
  for_devs TEXT,
  type TEXT,
  contributor TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'le-dawg'
  ) THEN
    INSERT INTO users (
      id, email, username, name, role, locale,
      "createdAt", "updatedAt"
    ) VALUES (
      'usr_le_dawg_import',
      'le-dawg@prompts.chat',
      'le-dawg',
      'le-dawg',
      'USER'::"UserRole",
      'en',
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO NOTHING
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS tmp_import_normalized;
CREATE TEMP TABLE tmp_import_normalized AS
SELECT
  TRIM(act) AS act,
  prompt,
  CASE WHEN UPPER(TRIM(COALESCE(for_devs, 'FALSE'))) = 'TRUE' THEN TRUE ELSE FALSE END AS for_devs,
  UPPER(TRIM(COALESCE(type, 'TEXT'))) AS csv_type,
  COALESCE(TRIM(contributor), '') AS contributor
FROM tmp_prompts_import
WHERE TRIM(COALESCE(act, '')) <> ''
  AND COALESCE(prompt, '') <> '';

INSERT INTO categories (
  id, name, slug, description, icon, "order", pinned
)
SELECT
  'imp_category_coding',
  'Coding',
  'coding',
  'Programming and development prompts',
  '💻',
  0,
  FALSE
WHERE EXISTS (SELECT 1 FROM tmp_import_normalized WHERE for_devs = TRUE)
ON CONFLICT (slug) DO NOTHING;

DROP TABLE IF EXISTS tmp_prompt_author;
CREATE TEMP TABLE tmp_prompt_author AS
SELECT
  n.act,
  (SELECT id FROM users WHERE username = 'le-dawg' LIMIT 1) AS author_id
FROM tmp_import_normalized n;

INSERT INTO prompts (
  id, title, content, type, "structuredFormat", "isPrivate",
  "authorId", "categoryId", "createdAt", "updatedAt"
)
SELECT
  'imp_prompt_' || SUBSTRING(md5(n.act) FROM 1 FOR 22),
  n.act,
  n.prompt,
  CASE
    WHEN n.csv_type IN ('JSON', 'YAML', 'STRUCTURED') THEN 'STRUCTURED'::"PromptType"
    WHEN n.csv_type = 'IMAGE' THEN 'IMAGE'::"PromptType"
    WHEN n.csv_type = 'VIDEO' THEN 'VIDEO'::"PromptType"
    WHEN n.csv_type = 'AUDIO' THEN 'AUDIO'::"PromptType"
    ELSE 'TEXT'::"PromptType"
  END AS prompt_type,
  CASE
    WHEN n.csv_type = 'JSON' THEN 'JSON'::"StructuredFormat"
    WHEN n.csv_type = 'YAML' THEN 'YAML'::"StructuredFormat"
    WHEN n.csv_type = 'STRUCTURED' THEN 'JSON'::"StructuredFormat"
    ELSE NULL
  END AS structured_format,
  FALSE,
  a.author_id,
  CASE WHEN n.for_devs THEN (SELECT id FROM categories WHERE slug = 'coding' LIMIT 1) ELSE NULL END,
  NOW(),
  NOW()
FROM tmp_import_normalized n
JOIN tmp_prompt_author a ON a.act = n.act
WHERE NOT EXISTS (
  SELECT 1 FROM prompts p WHERE p.title = n.act
);

UPDATE prompts p
SET
  content = n.prompt,
  type = CASE
    WHEN n.csv_type IN ('JSON', 'YAML', 'STRUCTURED') THEN 'STRUCTURED'::"PromptType"
    WHEN n.csv_type = 'IMAGE' THEN 'IMAGE'::"PromptType"
    WHEN n.csv_type = 'VIDEO' THEN 'VIDEO'::"PromptType"
    WHEN n.csv_type = 'AUDIO' THEN 'AUDIO'::"PromptType"
    ELSE 'TEXT'::"PromptType"
  END,
  "structuredFormat" = CASE
    WHEN n.csv_type = 'JSON' THEN 'JSON'::"StructuredFormat"
    WHEN n.csv_type = 'YAML' THEN 'YAML'::"StructuredFormat"
    WHEN n.csv_type = 'STRUCTURED' THEN 'JSON'::"StructuredFormat"
    ELSE NULL
  END,
  "authorId" = a.author_id,
  "categoryId" = CASE WHEN n.for_devs THEN (SELECT id FROM categories WHERE slug = 'coding' LIMIT 1) ELSE NULL END,
  "updatedAt" = NOW()
FROM tmp_import_normalized n
JOIN tmp_prompt_author a ON a.act = n.act
WHERE p.title = n.act
  AND (
    p.content IS DISTINCT FROM n.prompt
    OR p.type IS DISTINCT FROM CASE
      WHEN n.csv_type IN ('JSON', 'YAML', 'STRUCTURED') THEN 'STRUCTURED'::"PromptType"
      WHEN n.csv_type = 'IMAGE' THEN 'IMAGE'::"PromptType"
      WHEN n.csv_type = 'VIDEO' THEN 'VIDEO'::"PromptType"
      WHEN n.csv_type = 'AUDIO' THEN 'AUDIO'::"PromptType"
      ELSE 'TEXT'::"PromptType"
    END
    OR p."structuredFormat" IS DISTINCT FROM CASE
      WHEN n.csv_type = 'JSON' THEN 'JSON'::"StructuredFormat"
      WHEN n.csv_type = 'YAML' THEN 'YAML'::"StructuredFormat"
      WHEN n.csv_type = 'STRUCTURED' THEN 'JSON'::"StructuredFormat"
      ELSE NULL
    END
    OR p."categoryId" IS DISTINCT FROM CASE WHEN n.for_devs THEN (SELECT id FROM categories WHERE slug = 'coding' LIMIT 1) ELSE NULL END
    OR p."authorId" IS DISTINCT FROM a.author_id
  );

INSERT INTO prompt_versions (
  id, version, content, "changeNote", "createdAt", "promptId", "createdBy"
)
SELECT
  'imp_ver_' || SUBSTRING(md5(p.id || ':1') FROM 1 FOR 25),
  1,
  p.content,
  'Imported from prompts.csv',
  NOW(),
  p.id,
  p."authorId"
FROM prompts p
JOIN tmp_import_normalized n ON n.act = p.title
WHERE NOT EXISTS (
  SELECT 1
  FROM prompt_versions v
  WHERE v."promptId" = p.id
    AND v.version = 1
);

WITH latest AS (
  SELECT DISTINCT ON (v."promptId")
    v."promptId",
    v.version,
    v.content
  FROM prompt_versions v
  ORDER BY v."promptId", v.version DESC
)
INSERT INTO prompt_versions (
  id, version, content, "changeNote", "createdAt", "promptId", "createdBy"
)
SELECT
  'imp_ver_' || SUBSTRING(md5(p.id || ':' || (l.version + 1)::text || ':' || md5(p.content)) FROM 1 FOR 25),
  l.version + 1,
  p.content,
  'Updated from upstream prompts.csv',
  NOW(),
  p.id,
  p."authorId"
FROM prompts p
JOIN tmp_import_normalized n ON n.act = p.title
JOIN latest l ON l."promptId" = p.id
WHERE l.content IS DISTINCT FROM p.content;
