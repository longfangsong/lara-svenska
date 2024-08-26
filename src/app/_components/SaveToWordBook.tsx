"use client";
import { Button } from "flowbite-react";
import { Word, WordReview } from "../../types";
import { RiStickyNoteAddLine } from "react-icons/ri";

export function SaveToWordBook({
  review,
  word,
  article_id,
}: {
  review: WordReview | null;
  word: Word | undefined;
  article_id: string;
}) {
  return (
    <Button
      className="ml-3 p-0"
      onClick={() => {
        if (review === null) {
          (async () => {
            const payload = {
              word_id: word!.id,
              in_article: article_id,
            };
            await fetch(`/api/word_review`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
          })();
        } else {
          (async () => {
            const payload = {
              query_count: review.query_count + 1,
              in_article: article_id,
            };
            const param = new URLSearchParams({ id: review.id });
            await fetch(`/api/word_review?${param}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
          })();
        }
      }}
    >
      <RiStickyNoteAddLine className="h-4 w-4" />
    </Button>
  );
}
