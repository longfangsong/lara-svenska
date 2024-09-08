import { dbSemaphore } from "@/lib";
import { WordReviewWithWordDetailAndMeaning, WordMeaning } from "@/types";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { TableHead, TableHeadCell, TableBody, Table } from "flowbite-react";
import WordRow from "../_components/WordRow";
import { auth } from "../auth";
import { fetchWords } from "../lib/data";

export default async function WordTable({page}:{page: number}) {
    const db = getRequestContext().env.DB;
    const session = await auth();
    const query_result = await fetchWords(db, session?.user?.email!, page);
    const result: Array<WordReviewWithWordDetailAndMeaning> = await Promise.all(
        query_result.map(async (it) => {
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
                        return <WordRow key={page+'-'+review.id} review={review} />;
                    })}
                </TableBody>
            </Table>
        </div>
    );
}