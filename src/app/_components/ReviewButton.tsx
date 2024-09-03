"use client";
import { WordReview } from "@/types";
import { Button } from "flowbite-react";
import { useEffect, useState } from "react";
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
  onClick,
}: {
  review: WordReview;
  onClick?: () => void;
}) {
  const [clicked, setClicked] = useState(false);
  const [isReviewable, setIsReviewable] = useState(false);

  useEffect(() => {
    const timeUntilReview = review.next_review_time - Date.now();
    if (timeUntilReview <= 0) {
      setIsReviewable(true);
    } else {
      const timerId = setTimeout(() => {
        setIsReviewable(true);
      }, timeUntilReview);
      return () => clearTimeout(timerId);
    }
  }, [review.next_review_time]);

  return (
    <Button
      className="ml-3 p-0"
      onClick={async () => {
        await updateWordReview(review);
        onClick && onClick();
        setClicked(true);
      }}
      disabled={clicked || !isReviewable}
    >
      <IoCheckmarkDoneOutline className="h-4 w-4" />
    </Button>
  );
}
