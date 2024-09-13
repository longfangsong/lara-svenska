-- Migration number: 0005 	 2024-09-13T06:30:53.053Z
CREATE TABLE WordReviewNew(
    id text PRIMARY KEY,
    user_email text,
    word_id text,
    query_count integer,
    review_count integer,
    last_last_review_time integer,
    last_review_time integer,
    FOREIGN KEY(word_id) REFERENCES Word(id)
);

INSERT INTO WordReviewNew(id, user_email, word_id, query_count, review_count, last_last_review_time, last_review_time)
SELECT id, user_email, word_id, query_count, review_count, last_review_time, current_review_time
FROM WordReview;

DELETE FROM WordReviewInArticle;

DROP TABLE WordReview;

ALTER TABLE WordReviewNew RENAME TO WordReview;