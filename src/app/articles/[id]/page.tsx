import { getRequestContext } from "@cloudflare/next-on-pages";
import { Article as ArticleType } from "../../../types";
import { Button } from "flowbite-react";
import Link from "next/link";
import { Player } from "@/app/_components/Player";
import { WordPopover } from "@/app/_components/WordPopover";
import React from "react";

export const runtime = "edge";

function toWordsAndPunctuations(article: string): Array<Array<string>> {
  const wordsAndPunctuations = article
    .split(/(\s+)|(\.)/)
    .filter((x) => x !== undefined && x.trim().length > 0);
  let result: Array<Array<string>> = [[]];
  for (let wordAndPunctuation of wordsAndPunctuations) {
    if (wordAndPunctuation.endsWith("...")) {
      result[result.length - 1].push(wordAndPunctuation.slice(0, -3), "...");
      result.push([]);
    } else if (
      wordAndPunctuation.startsWith('"') ||
      wordAndPunctuation.startsWith("-")
    ) {
      result.push([wordAndPunctuation[0], wordAndPunctuation.slice(1)]);
    } else if (
      wordAndPunctuation.endsWith(",") ||
      wordAndPunctuation.endsWith(";")
    ) {
      result[result.length - 1].push(
        wordAndPunctuation.slice(0, -1),
        wordAndPunctuation[wordAndPunctuation.length - 1],
      );
    } else if (
      wordAndPunctuation.endsWith(".") ||
      wordAndPunctuation.endsWith("?") ||
      wordAndPunctuation.endsWith("!") ||
      wordAndPunctuation.endsWith('"')
    ) {
      result[result.length - 1].push(
        wordAndPunctuation.slice(0, -1),
        wordAndPunctuation[wordAndPunctuation.length - 1],
      );
      result.push([]);
    } else {
      result[result.length - 1].push(wordAndPunctuation);
    }
  }
  result = result.map((it) => it.filter((it) => it.trim().length > 0));
  return result.filter((it) => it.length > 0);
}

async function Sentence({
  content,
  article_id,
}: {
  content: Array<string>;
  article_id: string;
}) {
  return (
    <div className="flex flex-wrap">
      {content.map((w, i) => {
        if (w === "." || w === "?" || w === "!" || w === '"') {
          return <span key={i}>{w}</span>;
        } else if (w === "," || w === "–" || w.match(/^\d/)) {
          return (
            <React.Fragment key={i}>
              <span>{w}</span>&nbsp;
            </React.Fragment>
          );
        } else if (
          content[i + 1] === "," ||
          content[i + 1] === "." ||
          content[i + 1] === "?" ||
          content[i + 1] === "!" ||
          content[i + 1] === '"'
        ) {
          return (
            <WordPopover key={i} article_id={article_id}>
              {w}
            </WordPopover>
          );
        } else {
          return (
            <React.Fragment key={i}>
              <WordPopover key={i} article_id={article_id}>
                {w}
              </WordPopover>
              &nbsp;
            </React.Fragment>
          );
        }
      })}
    </div>
  );
}

export default async function Article({
  params: { id },
}: {
  params: { id: string };
}) {
  const db = getRequestContext().env.DB;
  const stmt = db.prepare(
    "SELECT id, title, url, create_time, content, voice_url FROM Article WHERE id=?1;",
  );
  const article = await stmt.bind(id).first<ArticleType>();
  if (article) {
    const sentences = toWordsAndPunctuations(article.content);
    return (
      <div className="p-1 text-wrap max-w-full">
        <h1 className="text-4xl font-extrabold dark:text-white">
          {article.title}
        </h1>
        <Button
          className="w-fit my-1"
          as={Link}
          href={`https://sverigesradio.se${article.url}`}
        >
          On origin site
        </Button>
        <Player url={article.voice_url} />
        {sentences.map((sentence, i) => (
          <Sentence key={i} content={sentence} article_id={article.id} />
        ))}
      </div>
    );
  } else {
    return <></>;
  }
}
