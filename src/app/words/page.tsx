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
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { PlayButton } from "@/app/_components/PlayButton";
import BlurElement from "../_components/BlurElement";
import { ReviewButton } from "../_components/ReviewButton";

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
    <div className="w-full">
      <Table striped className="max-w-full">
        <TableHead>
          <TableHeadCell>Word</TableHeadCell>
          <TableHeadCell>Query Count</TableHeadCell>
          <TableHeadCell>Review Count</TableHeadCell>
          <TableHeadCell>Meaning</TableHeadCell>
          <TableHeadCell>Play</TableHeadCell>
          <TableHeadCell>Review</TableHeadCell>
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
                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {review.meanings.map((meaning, index) => {
                    return (
                      <div key={index}>
                        <p className="font-medium text-sm">
                          {meaning.part_of_speech}
                        </p>
                        <BlurElement>{meaning.meaning}</BlurElement>
                        {meaning.example_sentence ? (
                          <div>
                            <p className="inline text-sm text-green-400">
                              {meaning.example_sentence}
                            </p>
                            <BlurElement className="ml-2 inline text-sm text-sky-400">
                              {meaning.example_sentence_meaning}
                            </BlurElement>
                          </div>
                        ) : (
                          <></>
                        )}
                      </div>
                    );
                  })}
                </TableCell>
                <TableCell>
                  <PlayButton voice={review} />
                </TableCell>
                <TableCell>
                  <ReviewButton review={review} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
