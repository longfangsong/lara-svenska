"use client";
import { Button } from "flowbite-react";
import { Word, WordReview } from "@/types";
import { RiStickyNoteAddLine } from "react-icons/ri";
import { useState } from "react";
import { apiSemaphore } from "@/lib";

export function SaveToWordBook({
  review,
  word,
  article_id,
}: {
  review: WordReview | null;
  word: Word | undefined;
  article_id: string;
}) {
  const [clicked, setClicked] = useState(false);
  return (
    <Button
      className="ml-3 p-0"
      onClick={() => {
        if (review === null) {
          createWordReview(word, article_id);
        } else {
          updateWordReview(review, article_id);
        }
        setClicked(true);
      }}
      disabled={clicked}
    >
      <RiStickyNoteAddLine className="h-4 w-4" />
    </Button>
  );
}
async function createWordReview(word: Word | undefined, article_id: string) {
  const payload = {
    word_id: word!.id,
    in_article: article_id,
  };
  const release = await apiSemaphore.acquire();
  const response = await fetch(`/api/word_review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  await release();
  if (response.status === 409) {
    const existingReview: WordReview = await response.json();
    updateWordReview(existingReview, article_id);
  }
}

async function updateWordReview(review: WordReview, article_id: string) {
  const payload = {
    query_count: review.query_count + 1,
    in_article: article_id,
  };
  const param = new URLSearchParams({ id: review.id });
  const release = await apiSemaphore.acquire();
  await fetch(`/api/word_review?${param}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  await release();
}
