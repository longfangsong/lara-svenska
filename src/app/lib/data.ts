import { dbSemaphore } from "@/lib";
import { WordReviewWithWordDetail } from "@/types";

export const REVIEW_HOURS_MAP: { [key: number]: number } = {
  0: 1,
  1: 24,
  2: 2 * 24,
  3: 3 * 24,
  4: 8 * 24,
  5: 15 * 24,
  6: 0,
};

export const WORDS_PER_PAGE = 10;

export async function fetchWordReviewWithDetails(
  db: D1Database,
  snapshot_time: Date,
  user_email: string,
  offset: number,
): Promise<Array<WordReviewWithWordDetail>> {
  const release = await dbSemaphore.acquire();
  const result = await db
    .prepare(
      `SELECT
    WordReview.id as id,
    WordReview.user_email as user_email,
    Word.spell as spell,
    WordReview.word_id as word_id,
    Word.pronunciation as pronunciation,
          Word.pronunciation_voice as pronunciation_voice,
          Word.pronunciation_voice_url as pronunciation_voice_url,
    WordReview.query_count as query_count,
    WordReview.review_count as review_count,
    WordReview.last_review_time as last_review_time,
    WordReview.last_last_review_time as last_last_review_time,
      WordReview.last_review_time
      + 60 * 60 * 1000 * ReviewTime.hours_after_last_review
    AS next_review_time,
    (CASE
        WHEN WordReview.last_review_time > ?4
        THEN WordReview.review_count - 1
        ELSE WordReview.review_count
    END) AS snapshot_review_count,
    (CASE
        WHEN WordReview.last_review_time > ?4
        THEN WordReview.last_last_review_time
          + 60 * 60 * 1000 * ReviewTimeSnapshot.hours_after_last_review
        ELSE WordReview.last_review_time
          + 60 * 60 * 1000 * ReviewTime.hours_after_last_review
    END) AS snapshot_next_review_time,
    ReviewTimeSnapshot.hours_after_last_review as snapshot_hours_after_last_review
FROM Word
JOIN WordReview ON WordReview.word_id = Word.id
JOIN ReviewTime ON WordReview.review_count = ReviewTime.current_review_count
LEFT JOIN ReviewTime AS ReviewTimeSnapshot ON ReviewTimeSnapshot.current_review_count = (
    CASE
        WHEN WordReview.last_review_time > ?4
        THEN WordReview.review_count - 1
        ELSE WordReview.review_count
    END)
WHERE WordReview.user_email=?1
ORDER BY snapshot_next_review_time ASC, query_count DESC, id ASC
LIMIT ?2 OFFSET ?3;`,
    )
    .bind(
      user_email,
      WORDS_PER_PAGE,
      (offset - 1) * WORDS_PER_PAGE,
      snapshot_time.getTime(),
    )
    .all<WordReviewWithWordDetail>();
  release();
  return result.results;
}

export async function fetchWordsCount(
  db: D1Database,
  user_email: string,
): Promise<number> {
  const release = await dbSemaphore.acquire();
  const result = await db
    .prepare(`SELECT COUNT(*) AS total FROM WordReview WHERE user_email=?1;`)
    .bind(user_email)
    .first<number>("total");
  release();
  return result!;
}
