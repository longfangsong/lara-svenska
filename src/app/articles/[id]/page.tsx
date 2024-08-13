import React, { useEffect, useState } from "react";
import { Article as ArticleType, Word } from "@/types";
import { Button, Popover, Spinner } from "flowbite-react";
import Link from "next/link";
import { toWordsAndPunctuations } from "@/article";
import { WordPopover } from "./WordPopover";
import { Player } from "./Player";

export const runtime = 'edge';

function Sentence({ content }: { content: Array<string> }) {
    return <div className="flex flex-wrap">
        {content.map((w, i) => {
            if (content[i + 1] === "," || content[i + 1] === "." || content[i + 1] === "?" || content[i + 1] === "!" || content[i + 1] === "\"") {
                return <WordPopover key={i} word={w}></WordPopover>
            } else if (w === "," || w === "-") {
                return <React.Fragment key={i}><span>{w}</span>&nbsp;</React.Fragment>
            } else if (w === "." || w === "?" || w === "!" || w === "\"") {
                return <span key={i}>{w}</span>
            } else {
                return <React.Fragment key={i}><WordPopover key={i} word={w}></WordPopover>&nbsp;</React.Fragment>
            }
        })}
    </div>
}

export default async function Article({ params }: { params: { id: string } }) {
    const param = new URLSearchParams(params);
    const article_request = await fetch(process.env.CF_PAGES_URL + `/api/articles?${param}`, {
        next: { revalidate: 60 * 60 * 2 },
    } as any);
    const article: ArticleType = await article_request.json();
    const sentences = toWordsAndPunctuations(article.content);
    return <div className="p-1 text-wrap max-w-full">
        <h1 className="text-4xl font-extrabold dark:text-white">{article.title}</h1>
        <Button className="w-fit my-1" as={Link} href={`https://sverigesradio.se${article.url}`}>
            On origin site
        </Button>
        <Player url={article.voice_url}></Player>
        {sentences.map(sentence => <Sentence key={sentence.join('-')} content={sentence}></Sentence>)}
    </div>
}