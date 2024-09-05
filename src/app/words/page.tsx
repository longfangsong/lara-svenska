import { auth } from "@/app/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import {
  WordMeaning,
  WordReviewWithWordDetail,
  WordReviewWithWordDetailAndMeaning,
} from "@/types";
import {
  Table,
  TableBody,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import WordRow from "../_components/WordRow";
import { dbSemaphore } from "@/lib";

export const runtime = "edge";

export default async function Words() {
  const db = getRequestContext().env.DB;
  const session = await auth();
  const release = await dbSemaphore.acquire();
  const query_result = await db
    .prepare(
      `SELECT
          WordReview.id as id,
          WordReview.user_email as user_email,
          WordReview.word_id as word_id,
          WordReview.query_count as query_count,
          WordReview.review_count as review_count,
          WordReview.current_review_time as current_review_time,
          Word.spell as spell,
          Word.pronunciation as pronunciation,
          Word.pronunciation_voice as pronunciation_voice,
          Word.pronunciation_voice_url as pronunciation_voice_url,
          WordReview.current_review_time +
            60 * 60 * 1000 * ReviewTime.hours_after_last_review
          AS next_review_time
        FROM WordReview, Word, ReviewTime
        WHERE WordReview.word_id=Word.id
          AND WordReview.review_count=ReviewTime.current_review_count
          AND WordReview.user_email=?1
        ORDER BY next_review_time ASC, query_count DESC;`,
    )
    .bind(session?.user?.email)
    .all<WordReviewWithWordDetail>();
  release();
  const result: Array<WordReviewWithWordDetailAndMeaning> = await Promise.all(
    query_result.results.map(async (it) => {
      const release = await dbSemaphore.acquire();
      // fill meanings
      const meaning_result = await db
        .prepare(
          `SELECT WordMeaning.part_of_speech, WordMeaning.meaning,
                    WordMeaning.example_sentence, WordMeaning.example_sentence_meaning
            FROM    Word, WordMeaning
            WHERE   WordMeaning.word_id=Word.id AND Word.id=?1;`,
        )
        .bind(it.word_id)
        .all<WordMeaning>();
      release();
      const meaning_filled = { ...it, meanings: meaning_result.results };
      // fill in articles
      const release2 = await dbSemaphore.acquire();
      const in_articles_result = await db
        .prepare(
          `SELECT article_id FROM WordReviewInArticle WHERE review_id=?1;`,
        )
        .bind(it.id)
        .all<string>();
      release2();
      return { ...meaning_filled, in_articles: in_articles_result.results };
    }),
  );
  return (
    <div className="max-w-full overflow-scroll">
      <Table striped className="overflow-x-scroll">
        <TableHead>
          <TableHeadCell>Word</TableHeadCell>
          <TableHeadCell>Query</TableHeadCell>
          <TableHeadCell>Next Review Time</TableHeadCell>
          <TableHeadCell>Review</TableHeadCell>
          <TableHeadCell>Meaning</TableHeadCell>
          <TableHeadCell>Play</TableHeadCell>
          <TableHeadCell>Review</TableHeadCell>
        </TableHead>
        <TableBody>
          {result.map((review) => {
            return <WordRow key={review.id} review={review} />;
          })}
        </TableBody>
      </Table>
    </div>
  );
}
