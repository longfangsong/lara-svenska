"use client";
import { Button } from "flowbite-react";
import { RiUserVoiceLine } from "react-icons/ri";
import { Voice } from "../../types";

export function PlayButton({ voice }: { voice: Voice }) {
  return (
    <Button
      className="ml-3 p-0"
      onClick={() => {
        if (voice.pronunciation_voice && voice.pronunciation_voice !== null) {
          const pronunciation_voice = new Uint8Array(voice.pronunciation_voice);
          const blob = new Blob([pronunciation_voice], { type: "audio/mp3" });
          new Audio(window.URL.createObjectURL(blob)).play();
        } else {
          new Audio(voice.pronunciation_voice_url!).play();
        }
      }}
    >
      <RiUserVoiceLine className="h-4 w-4" />
    </Button>
  );
}
