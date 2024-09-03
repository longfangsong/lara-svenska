-- Migration number: 0003 	 2024-09-03T06:15:55.874Z
CREATE TABLE IF NOT EXISTS ReviewTime (
    current_review_count integer PRIMARY KEY,
    hours_after_last_review integer
);

INSERT INTO ReviewTime (current_review_count, hours_after_last_review) VALUES
  (0,     1),
  (1,    24),
  (2,  2*24),
  (3,  3*24),
  (4,  8*24),
  (5, 15*24),
  (6, 0);
