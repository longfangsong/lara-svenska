"use client";
import { WordReview, WordReviewWithWordDetailAndMeaning } from "@/types";
import { TableCell, TableRow } from "flowbite-react";
import BlurElement from "./BlurElement";
import { PlayButton } from "./PlayButton";
import { ReviewButton } from "./ReviewButton";
import { useState } from "react";

const REVIEW_TIME_MAP: { [key: number]: number } = {
  0: 1,
  1: 24,
  2: 2 * 24,
  3: 3 * 24,
  4: 8 * 24,
  5: 15 * 24,
  6: 0
};

export default function WordRow({
  review,
}: {
  review: WordReviewWithWordDetailAndMeaning;
}) {
  const [currentReview, setCurrentReview] = useState(review);
  const [currentReviewTime, setCurrentReviewTime] = useState(review.current_review_time);
  const [nextReviewTime, setNextReviewTime] = useState<number | null>(review.next_review_time);

  const handleReview = () => {
    const newReviewCount = currentReview.review_count + 1;
    const newCurrentReviewTime = new Date().getTime();

    let hoursToAdd: number | null = null;
    if (newReviewCount in REVIEW_TIME_MAP) {
      hoursToAdd = REVIEW_TIME_MAP[newReviewCount];
    } else if (6 in REVIEW_TIME_MAP) {
      hoursToAdd = null;
    }

    const newNextReviewTime = hoursToAdd ?
      (newCurrentReviewTime + hoursToAdd * 60 * 60 * 1000) : null;

    setCurrentReview({
      ...currentReview,
      review_count: newReviewCount,
    });
    setCurrentReviewTime(newCurrentReviewTime);
    setNextReviewTime(newNextReviewTime);
  };

  return (
    <TableRow
      key={review.id}
      className="bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <TableCell className="p-2 md:p-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
        {currentReview.spell}
      </TableCell>
      <TableCell className="p-2 md:p-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
        {currentReview.query_count}
      </TableCell>
      <TableCell className="p-2 md:p-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
        {new Date(currentReviewTime).toLocaleString('sv-SE', { timeZone: 'UTC' })}
      </TableCell>
      <TableCell className="p-2 md:p-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
        {nextReviewTime ? new Date(nextReviewTime).toLocaleString('sv-SE', { timeZone: 'UTC' }) : 'You may have remembered this word'}
      </TableCell>
      <TableCell className="p-2 md:p-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
        {currentReview.review_count}
      </TableCell>
      <TableCell className="p-2 md:p-4 overflow-scroll whitespace-nowrap font-medium text-gray-900 dark:text-white">
        {currentReview.meanings.map((meaning, index) => {
          return (
            <div key={index} className="max-w-xs overflow-scroll">
              <p className="font-medium text-sm">{meaning.part_of_speech}</p>
              <BlurElement>{meaning.meaning}</BlurElement>
              {meaning.example_sentence ? (
                <>
                  <p className="text-sm text-green-400">
                    {meaning.example_sentence}
                  </p>
                  <BlurElement className="text-sm text-sky-400">
                    {meaning.example_sentence_meaning}
                  </BlurElement>
                </>
              ) : (
                <></>
              )}
            </div>
          );
        })}
      </TableCell>
      <TableCell className="p-2 md:p-4">
        <PlayButton voice={currentReview} />
      </TableCell>
      <TableCell className="p-2 md:p-4">
        <ReviewButton review={currentReview} onClick={handleReview} />
      </TableCell>
    </TableRow>
  );
}
