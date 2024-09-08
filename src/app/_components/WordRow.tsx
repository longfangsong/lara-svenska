"use client";
import { WordReviewWithWordDetailAndMeaning } from "@/types";
import { TableCell, TableRow } from "flowbite-react";
import BlurElement from "./BlurElement";
import { PlayButton } from "./PlayButton";
import { ReviewButton } from "./ReviewButton";
import { useEffect, useState } from "react";
import { sv } from "date-fns/locale/sv";
import { formatDistance } from "date-fns/formatDistance";
import { REVIEW_HOURS_MAP } from "../lib/data";

export default function WordRow({
  review,
}: {
  review: WordReviewWithWordDetailAndMeaning;
}) {
  const [currentReview, setCurrentReview] = useState(review);
  const [currentReviewTime, setCurrentReviewTime] = useState(review.current_review_time);
  const [nextReviewTime, setNextReviewTime] = useState<number | null>(review.next_review_time);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateInterval = () => {
      if (nextReviewTime === null) return;

      const timeUntilNextReview = nextReviewTime - now.getTime();

      if (timeUntilNextReview < 60 * 1000) {
        // Less than 1 minute, update every second
        intervalId = setInterval(() => setNow(new Date()), 1000);
      } else if (timeUntilNextReview < 60 * 60 * 1000) {
        // Less than 1 hour, update every minute
        intervalId = setInterval(() => setNow(new Date()), 60 * 1000);
      } else {
        // More than 1 hour, update every hour
        intervalId = setInterval(() => setNow(new Date()), 60 * 60 * 1000);
      }
    };

    updateInterval();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [nextReviewTime, now]);

  const handleReview = () => {
    const newReviewCount = currentReview.review_count + 1;
    const newCurrentReviewTime = new Date().getTime();

    let hoursToAdd: number | null = null;
    if (newReviewCount in REVIEW_HOURS_MAP) {
      hoursToAdd = REVIEW_HOURS_MAP[newReviewCount];
    } else if (6 in REVIEW_HOURS_MAP) {
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
    setNow(new Date());
  };

  const reviewCountColor = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-yellow-500', 'bg-yellow-400', 'bg-green-400', 'bg-green-500'];
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
        {nextReviewTime ?
          nextReviewTime < now.getTime() ?
            'Nu' :
            `I ${formatDistance(nextReviewTime, now, { locale: sv })}`
          : 'You may have remembered this word'}
      </TableCell>
      <TableCell className="p-2 md:p-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
        <div className="flex space-x-1">
          {[...Array(7)].map((_, index) => (
            <div
              key={index}
              className={`w-3 h-1 rounded-sm 
                ${index < currentReview.review_count
                  ? reviewCountColor[index]
                  : 'bg-gray-300'
                }`}
            ></div>
          ))}
        </div>
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
