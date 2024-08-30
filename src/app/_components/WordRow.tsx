"use client";
import { WordReview, WordReviewWithWordDetailAndMeaning } from "@/types";
import { TableCell, TableRow } from "flowbite-react";
import BlurElement from "./BlurElement";
import { PlayButton } from "./PlayButton";
import { ReviewButton } from "./ReviewButton";
import { useState } from "react";

export default function WordRow({
  review,
}: {
  review: WordReviewWithWordDetailAndMeaning;
}) {
  const [currentReview, setCurrentReview] = useState(review);
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
        <ReviewButton review={currentReview} onClick={() => {
          setCurrentReview({
            ...currentReview,
            review_count: currentReview.review_count + 1,
          });
        }} />
      </TableCell>
    </TableRow>
  );
}
