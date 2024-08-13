export interface ArticleMeta {
    id: string,
    title: string,
    url: string
}

export interface WordMeaning {
    part_of_speech: string,
    meaning: string,
    example_sentence?: string,
    example_sentence_meaning?: string
}

export interface WordVoiceFetched {
    id: string,
    spell: string,
    pronunciation: string,
    meanings: Array<WordMeaning>,
    pronunciation_voice: Array<number>,
}

export interface WordVoicePending {
    id: string,
    spell: string,
    pronunciation: string,
    meanings: Array<WordMeaning>,
    pronunciation_voice_url: string,
}

export type Word = WordVoiceFetched | WordVoicePending;

export function voice_fetched(value: Word): value is WordVoiceFetched {
    const as_fetched = value as WordVoiceFetched;
    return as_fetched.pronunciation_voice === undefined && as_fetched.pronunciation_voice === null;
}

export type SingleMeaningWord = {
    id: string,
    spell: string,
    pronunciation: string,
    part_of_speech: string,
    meaning: string,
    example_sentence?: string,
    example_sentence_meaning?: string
};

export interface Article {
    id: string,
    title: string,
    content: string,
    create_time: number,
    url: string,
    voice_url: string,
}
