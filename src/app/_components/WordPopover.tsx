import { Popover } from "flowbite-react";
import {
  Word,
  WordMeaning,
  WordReview,
  WordWithMeanings,
  WordWithSingleMeaning,
} from "../../types";
import { getRequestContext } from "@cloudflare/next-on-pages";
import React from "react";
import { PlayButton } from "./PlayButton";
import { SaveToWordBook } from "./SaveToWordBook";
import { auth } from "@/app/auth";
export const runtime = "edge";

function processQueryResults(
  rawResults: WordWithSingleMeaning[],
): Array<WordWithMeanings> {
  const wordMap = new Map<string, WordWithMeanings>();
  rawResults.forEach((row) => {
    if (!wordMap.has(row.id)) {
      wordMap.set(row.id, {
        ...row,
        meanings: [],
      });
    }
    wordMap.get(row.id)!.meanings.push({
      part_of_speech: row.part_of_speech,
      meaning: row.meaning,
      example_sentence: row.example_sentence,
      example_sentence_meaning: row.example_sentence_meaning,
    });
  });

  return Array.from(wordMap.values());
}

async function getFromDB(
  db_client: D1Database,
  spell: string,
): Promise<Array<WordWithMeanings> | null> {
  const sql = `
    SELECT  Word.id, Word.spell, Word.pronunciation, Word.pronunciation_voice,
            Word.pronunciation_voice_url,
            WordMeaning.part_of_speech, WordMeaning.meaning,
            WordMeaning.example_sentence, WordMeaning.example_sentence_meaning
    FROM    WordVariant, Word, WordMeaning
    WHERE   WordVariant.spell=?1 AND
            Word.id=WordVariant.word_id AND
            Word.id=WordMeaning.word_id;`;
  try {
    const rawResults = await db_client
      .prepare(sql)
      .bind(spell)
      .all<WordWithSingleMeaning>();
    if (!rawResults.results) {
      return [];
    }
    return processQueryResults(rawResults.results);
  } catch (e) {
    return null;
  }
}

async function getReview(
  db_client: D1Database,
  word: WordWithMeanings,
): Promise<WordReview | null> {
  const session = await auth();
  const sql = `SELECT id, user_email,
      word_id, query_count, review_count,
      current_review_time
  FROM WordReview
  WHERE word_id = ?1 AND user_email = ?2;`;
  try {
    const rawResults = await db_client
      .prepare(sql)
      .bind(word.id, session?.user?.email)
      .first<WordReview>();
    return rawResults;
  } catch (e) {
    return null;
  }
}

async function SingleWord({
  word,
  article_id,
}: {
  word: WordWithMeanings;
  article_id: string;
}) {
  const db = getRequestContext().env.DB;
  const review = await getReview(db, word);
  return (
    <>
      {word.meanings?.map((meaning: WordMeaning, meaning_index: number) => {
        return (
          <React.Fragment key={meaning_index}>
            <div className="hover:bg-sky-200 dark:hover:bg-slate-700 p-2">
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">{word.spell}</h2>
                <div className="flex">
                  <SaveToWordBook
                    review={review}
                    word={word}
                    article_id={article_id}
                  />
                  <PlayButton voice={word} />
                </div>
              </div>
              <p className="font-medium text-sm">{meaning.part_of_speech}</p>
              <p>{meaning.meaning}</p>
              {meaning.example_sentence ? (
                <div>
                  <p className="inline text-sm text-green-400">
                    {meaning.example_sentence}
                  </p>
                  <p className="ml-2 inline text-sm text-sky-400">
                    {meaning.example_sentence_meaning}
                  </p>
                </div>
              ) : (
                <></>
              )}
            </div>
            {meaning_index < word.meanings.length - 1 ? <hr /> : <></>}
          </React.Fragment>
        );
      })}
    </>
  );
}

async function WordPopoverContent({
  children: spell,
  article_id,
}: {
  children: string;
  article_id: string;
}) {
  const db = getRequestContext().env.DB;
  let result: Array<WordWithMeanings> = [];
  const dbResult = await getFromDB(db, spell);
  if (dbResult === null) {
    return <></>;
  }
  if (dbResult.length !== 0) {
    result = dbResult;
  } else {
    const response = await fetch(
      `${process.env.CF_PAGES_URL}/api/word?spell=${spell}`,
    );
    const words = await response.json<Array<WordWithMeanings> | null>();
    if (words) result = words;
  }
  return (
    <>
      <div className="max-h-72 overflow-scroll">
        {result.map((w, i) => {
          return (
            <React.Fragment key={i}>
              <SingleWord word={w} article_id={article_id} />
              {i < dbResult.length - 1 ? <hr /> : <></>}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

export function WordPopover({
  children,
  article_id,
}: {
  children: string;
  article_id: string;
}) {
  return (
    <div className="flex gap-2">
      <Popover
        content={
          <WordPopoverContent article_id={article_id}>
            {children.toLocaleLowerCase()}
          </WordPopoverContent>
        }
        trigger="click"
      >
        <a className="hover:bg-sky-300 dark:hover:bg-sky-700 cursor-pointer">
          {children}
        </a>
      </Popover>
    </div>
  );
}
