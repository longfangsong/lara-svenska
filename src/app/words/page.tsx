import { auth } from "@/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";
import {
  WordMeaning,
  WordReviewWithWordDetail,
  WordReviewWithWordDetailAndMeaning,
} from "../../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { PlayButton } from "@/_components/PlayButton";

export const runtime = "edge";

export default async function Words() {
  const db = getRequestContext().env.DB;
  const session = await auth();
  const query_result = await db
    .prepare(
      `SELECT WordReview.id, WordReview.user_email,
        WordReview.word_id, WordReview.query_count, WordReview.review_count,
        WordReview.current_review_time, Word.spell, Word.pronunciation,
        Word.pronunciation_voice, Word.pronunciation_voice_url
        FROM WordReview, Word
        WHERE WordReview.word_id=Word.id AND WordReview.user_email=?1
        ORDER BY query_count DESC;`,
    )
    .bind(session?.user?.email)
    .all<WordReviewWithWordDetail>();
  const result: Array<WordReviewWithWordDetailAndMeaning> = await Promise.all(
    query_result.results.map(async (it) => {
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
      const meaning_filled = { ...it, meanings: meaning_result.results };
      // fill in articles
      const in_articles_result = await db
        .prepare(
          `SELECT article_id FROM WordReviewInArticle WHERE review_id=?1;`,
        )
        .bind(it.id)
        .all<string>();
      return { ...meaning_filled, in_articles: in_articles_result.results };
    }),
  );
  return (
    <div className="w-full overflow-x-auto">
      <Table striped>
        <TableHead>
          <TableHeadCell>Word</TableHeadCell>
          <TableHeadCell>Query Count</TableHeadCell>
          <TableHeadCell>Review Count</TableHeadCell>
          <TableHeadCell>Play</TableHeadCell>
        </TableHead>
        <TableBody className="divide-y">
          {result.map((review) => {
            return (
              <TableRow
                key={review.id}
                className="bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {review.spell}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {review.query_count}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {review.review_count}
                </TableCell>
                <TableCell>
                  <PlayButton voice={review}></PlayButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

//
