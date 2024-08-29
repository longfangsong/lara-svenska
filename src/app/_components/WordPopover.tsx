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
import he from "he";

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

function trimPronunciationBrackets(str: string): string {
  while (str.startsWith("/") || str.startsWith("\\") || str.startsWith("[")) {
    str = str.slice(1);
  }
  while (str.endsWith("/") || str.endsWith("\\") || str.endsWith("]")) {
    str = str.slice(0, -1);
  }
  return str;
}

async function fetchPronunciation(spell: string): Promise<ArrayBuffer> {
  const url = `https://ttsmp3.com/makemp3_new.php`;
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  const urlencoded = new URLSearchParams();
  urlencoded.append("msg", spell);
  urlencoded.append("lang", "Astrid");
  urlencoded.append("source", "ttsmp3");
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
  };
  let response = await fetch(url, requestOptions);
  let response_json: any = await response.json();
  let pronunciation_url = response_json["URL"];
  let pronunciation_response = await fetch(pronunciation_url!!);
  return await pronunciation_response.arrayBuffer();
}

async function getFromAI(
  ai_client: Ai,
  spell: string,
): Promise<WordWithMeanings | undefined> {
  const messages = [
    {
      role: "system",
      content:
        "You are a Swedish-English dictionary. You have recorded all Swedish words for the users to check. You will respond in the format the user require and nothing else. You will try to respond with the correct information with great care.",
    },
    {
      role: "user",
      content: `Check the Swedish word "${spell}".
- If it is a noun please check its indefinite single form.
- If it is a verb please check its imperative form.
- Else just check its origin form.
Respond in json format like this, do not add anything except this json:
{"spell": <string, spell of the word, indefinite single form for noun and imperative form for verb>, "pronunciation": <string, pronunciation of the word, in IPA>, "part_of_speech": <string, part of speech of the word, eg. n, v, adj, adv, conj, pron, etc>, "meaning": <string, English meaning of the word>, "example_sentence": <string, example sentence of the word>, "example_sentence_meaning": <string, meaning of the example sentence>}`,
    },
  ];
  const pronunciation_request = fetchPronunciation(spell);
  const ai_request = ai_client.run(
    "@cf/meta/llama-3.1-8b-instruct" as BaseAiTextGenerationModels,
    { messages } as BaseAiTextGeneration["inputs"],
  ) as Promise<{ response: string }>;
  const [pronunciation_voice_response, response] = await Promise.all([
    pronunciation_request,
    ai_request,
  ]);
  const ai_response = response.response;
  const pronunciation_voice = Array.from(
    Buffer.from(pronunciation_voice_response),
  );
  try {
    const word: Omit<WordWithSingleMeaning, "pronunciation_voice"> =
      JSON.parse(ai_response);
    return {
      id: crypto.randomUUID(),
      spell: word.spell,
      pronunciation: trimPronunciationBrackets(word.pronunciation),
      pronunciation_voice: pronunciation_voice as any,
      pronunciation_voice_url: null,
      meanings: [
        {
          part_of_speech: word.part_of_speech,
          meaning: word.meaning,
          example_sentence: word.example_sentence,
          example_sentence_meaning: word.example_sentence_meaning,
        },
      ],
    };
  } catch {
    console.log("failed to parse ai_response:", ai_response);
  }
}

async function putIntoDB(
  db_client: D1Database,
  spell: string,
  word: WordWithMeanings,
) {
  const voice = new Uint8Array((word as any).pronunciation_voice!);
  try {
    await db_client
      .prepare(
        `INSERT INTO Word(id, spell, pronunciation, pronunciation_voice, source, pronunciation_voice_url)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6);`,
      )
      .bind(
        word.id,
        word.spell,
        word.pronunciation,
        Array.from(voice),
        "AI",
        null,
      )
      .run();
  } catch {
    console.log("failed to save word", word);
  }
  await Promise.all(
    word.meanings.map((meaning) => {
      try {
        db_client
          .prepare(
            `INSERT INTO
            WordMeaning(
                id,
                word_id,
                part_of_speech,
                meaning,
                example_sentence,
                example_sentence_meaning)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6);`,
          )
          .bind(
            crypto.randomUUID(),
            word.id,
            meaning.part_of_speech || null,
            he.decode(meaning.meaning),
            (meaning.example_sentence && he.decode(meaning.example_sentence)) ||
              null,
            (meaning.example_sentence_meaning &&
              he.decode(meaning.example_sentence_meaning)) ||
              null,
          )
          .run();
      } catch {
        console.log("failed to save meaning", meaning);
      }
    }),
  );
  try {
    await db_client
      .prepare(
        `INSERT INTO WordVariant(id, spell, word_id) VALUES (?1, ?2, ?3);`,
      )
      .bind(crypto.randomUUID(), spell, word.id)
      .run();
  } catch {
    console.log("failed to save WordVariant", spell);
  }
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
    const session = await auth();
    if (session) {
      const ai = getRequestContext().env.AI;
      const ai_result = await getFromAI(ai, spell);
      if (ai_result) {
        await putIntoDB(db, spell, ai_result);
        result = [ai_result];
      }
    }
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
