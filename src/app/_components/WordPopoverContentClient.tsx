"use client";

import { WordWithMeanings, WordMeaning, WordReview } from "@/types";
import React, { useEffect } from "react";
import { PlayButton } from "./PlayButton";
import { SaveToWordBook } from "./SaveToWordBook";
import { Spinner } from "flowbite-react";

function SingleWordClient({
  word,
  article_id,
}: {
  word: WordWithMeanings;
  article_id: string;
}) {
  const [review, setReview] = React.useState<WordReview | null>(null);
  useEffect(() => {
    async () => {
      const response = await fetch(`/api/word_review?word_id=${word.id}`);
      if (response.status === 200) {
        const result: WordReview = await response.json();
        setReview(result);
      }
    };
  }, [word]);
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

export function WordPopoverContentClient({
  spell,
  article_id,
}: {
  spell: string;
  article_id: string;
}) {
  const [aiResult, setAIResult] = React.useState<Array<WordWithMeanings>>([]);
  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/word?spell=${spell}`);
      if (response.status === 200) {
        const result: Array<WordWithMeanings> = await response.json();
        setAIResult(result);
      }
    })();
  }, [spell]);
  return (
    <>
      {aiResult.length === 0 ? (
        <Spinner />
      ) : (
        <div className="max-h-72 overflow-scroll">
          {aiResult.map((w, i) => {
            return (
              <React.Fragment key={i}>
                <SingleWordClient word={w} article_id={article_id} />
                {i < aiResult.length - 1 ? <hr /> : <></>}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </>
  );
}
