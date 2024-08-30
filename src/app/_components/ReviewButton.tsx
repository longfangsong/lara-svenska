"use client";
import { WordReview } from "@/types";
import { Button } from "flowbite-react";
import { IoCheckmarkDoneOutline } from "react-icons/io5";
async function updateWordReview(review: WordReview) {
  const payload = {
    review_count: review.review_count + 1,
  };
  const param = new URLSearchParams({ id: review.id });
  await fetch(`/api/word_review?${param}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
export function ReviewButton({
  review,
}: {
  review: WordReview;
  onClick?: () => void;
}) {
  return (
    <Button
      className="ml-3 p-0"
      onClick={() => {
        updateWordReview(review);
      }}
    >
      <IoCheckmarkDoneOutline className="h-4 w-4" />
    </Button>
  );
}
