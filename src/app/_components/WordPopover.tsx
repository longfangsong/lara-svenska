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
import { WordPopoverContent } from "./WordPopoverContent";
import { dbSemaphore } from "@/lib";

export const runtime = "edge";


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
          <WordPopoverContent spell={children} article_id={article_id} />
        }
        trigger="click"
      >
        <a className="hover:bg-sky-300 dark:hover:bg-sky-700 cursor-pointer">
          {children}
        </a>
      </Popover>
    </div >
  );
}
