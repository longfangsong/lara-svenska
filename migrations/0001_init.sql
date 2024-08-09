-- Migration number: 0001 	 2024-07-31T00:19:45.404Z
CREATE TABLE IF NOT EXISTS Article (
    id text PRIMARY KEY,
    title text,
    content text,
    create_time integer,
    url text
);

CREATE TABLE IF NOT EXISTS Word (
    id text PRIMARY KEY,
    spell text,
    pronunciation text,
    pronunciation_voice blob,
    pronunciation_voice_url text,
    source text
);

-- CREATE INDEX IF NOT EXISTS idx_Word_spell ON Word(spell);

CREATE TABLE IF NOT EXISTS WordMeaning (
    id text PRIMARY KEY,
    word_id text,
    part_of_speech text,
    meaning text,
    example_sentence text,
    example_sentence_meaning text --,
    -- FOREIGN KEY(word_id) REFERENCES Word(id)
);
-- CREATE INDEX IF NOT EXISTS idx_WordMeaning_word_id ON WordMeaning(word_id);

CREATE TABLE IF NOT EXISTS WordVariant (
    id text PRIMARY KEY,
    spell text,
    word_id text --,
    -- FOREIGN KEY(word_id) REFERENCES Word(id)
);
-- CREATE INDEX IF NOT EXISTS idx_WordVariant_spell ON WordVariant(spell);
-- CREATE INDEX IF NOT EXISTS idx_WordVariant_word_id ON WordVariant(word_id);