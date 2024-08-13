"use client";
import { Word } from "@/types";
import { Button, Popover, Spinner } from "flowbite-react";
import { useState } from "react";
import { RiUserVoiceLine } from "react-icons/ri";

export function WordPopover({ word }: { word: string }) {
    const [wordInfo, setWordInfo] = useState(null as Array<Word> | null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    return <Popover
        open={open}
        onOpenChange={(newOpen) => {
            if (newOpen) {
                (async () => {
                    const param = new URLSearchParams({ spell: word });
                    const request = await fetch(`/api/words?${param}`, {
                        next: { revalidate: 60 * 60 },
                    } as any);
                    setWordInfo(await request.json());
                    setLoading(false);
                })();
            }
            setOpen(newOpen);
        }}
        aria-labelledby="default-popover"
        content={
            loading ?
                <Spinner aria-label="Default status example" size="xl" /> :
                <div className="text-black p-1 max-h-72 overflow-scroll">
                    {wordInfo?.map((w, i) => {
                        return <><div className="hover:bg-sky-100">
                            <div className="flex justify-between ...">
                                <h2 className="text-xl font-semibold">{w.spell}</h2>
                                <Button className="ml-3 p-0" onClick={() => {
                                    let word = w as any;
                                    if (word.pronunciation_voice && word.pronunciation_voice !== null) {
                                        const pronunciation_voice = new Uint8Array(word.pronunciation_voice);
                                        const blob = new Blob([pronunciation_voice], { type: "audio/mp3" });
                                        new Audio(window.URL.createObjectURL(blob)).play();
                                    } else {
                                        new Audio(word.pronunciation_voice_url).play();
                                    }
                                }}>
                                    <RiUserVoiceLine className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="italic">/{w.pronunciation}/</p>
                            {w.meanings.map((meaning, ii) => {
                                return <><div className="hover:bg-sky-200">
                                    <p className="font-medium">{meaning.part_of_speech}</p>
                                    <p>{meaning.meaning}</p>
                                    {meaning.example_sentence ?
                                        <div>
                                            <p className="inline text-sm text-green-400">{meaning.example_sentence}</p>
                                            <p className="ml-2 inline text-sm text-sky-400">{meaning.example_sentence_meaning}</p>
                                        </div>
                                        : <></>}
                                </div>
                                    {ii < w.meanings.length - 1 ? <hr /> : <></>}
                                </>
                            })}
                        </div >
                            {i < wordInfo.length - 1 ? <hr /> : <></>}
                        </>
                    })}
                </div >
        }
    >
        <a className="hover:bg-sky-700 cursor-pointer">{word}</a>
    </Popover >
}