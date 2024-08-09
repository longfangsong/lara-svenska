import { NextRequest, NextResponse } from "next/server";
import { findWord } from "@/dictionary"
import { SingleMeaningWord, Word, WordMeaning, WordVoiceFetched } from "@/types";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { load } from "cheerio";
import he from 'he';

export const runtime = 'edge';

type WordWithMeaning = {
    id: string,
    spell: string,
    pronunciation: string,
    pronunciation_voice: Array<number> | null,
    pronunciation_voice_url: string | null,
} & WordMeaning;

async function getFromDB(db_client: D1Database, spell: string): Promise<Array<Word>> {
    const result = await db_client.prepare(`
        SELECT  Word.id, Word.spell, Word.pronunciation, Word.pronunciation_voice,
                Word.pronunciation_voice_url,
                WordMeaning.part_of_speech, WordMeaning.meaning, 
                WordMeaning.example_sentence, WordMeaning.example_sentence_meaning
        FROM    WordVariant, Word, WordMeaning
        WHERE   WordVariant.spell=?1 AND
                Word.id=WordVariant.word_id AND
                Word.id=WordMeaning.word_id;`)
        .bind(spell)
        .all<WordWithMeaning>();
    const groups = Object.groupBy(result.results, it => it.id);
    return Object.entries(groups).map(([id, word_with_meanings]) => {
        const meanings: Array<WordMeaning> = word_with_meanings?.map(word_with_meaning => {
            return {
                part_of_speech: word_with_meaning.part_of_speech,
                meaning: word_with_meaning.meaning,
                example_sentence: word_with_meaning.example_sentence,
                example_sentence_meaning: word_with_meaning.example_sentence_meaning
            };
        })!;
        return {
            id,
            spell: word_with_meanings![0].spell,
            pronunciation: word_with_meanings![0].pronunciation,
            pronunciation_voice: word_with_meanings![0].pronunciation_voice,
            pronunciation_voice_url: word_with_meanings![0].pronunciation_voice_url,
            meanings
        } as Word
    });
}

async function fetch_pronunciation(spell: string): Promise<ArrayBuffer> {
    const url = `https://ttsmp3.com/makemp3_new.php`;
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    const urlencoded = new URLSearchParams();
    urlencoded.append("msg", spell);
    urlencoded.append("lang", "Astrid");
    urlencoded.append("source", "ttsmp3");
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded
    };
    let response = await fetch(url, requestOptions);
    let response_json: any = await response.json();
    let pronunciation_url = response_json['URL'];
    let pronunciation_response = await fetch(pronunciation_url!!);
    return await pronunciation_response.arrayBuffer();
}

function trimPronunciationBrackets(str: string): string {
    while (str.startsWith('/') || str.startsWith('\\') || str.startsWith('[')) {
        str = str.slice(1);
    }
    while (str.endsWith('/') || str.endsWith('\\') || str.endsWith(']')) {
        str = str.slice(0, -1);
    }
    return str;
}

async function getFromAI(ai_client: Ai, spell: string): Promise<WordVoiceFetched | undefined> {
    const messages = [
        { role: "system", content: "You are a Swedish-English dictionary. You have recorded all Swedish words for the users to check. You will respond in the format the user require and nothing else. You will try to respond with the correct information with great care." },
        {
            role: "user",
            content: `Check the Swedish word "${spell}".
- If it is a noun please check its indefinite single form.
- If it is a verb please check its imperative form.
- Else just check its origin form.
Respond in json format like this, do not add anything except this json:
{"spell": <string, spell of the word, indefinite single form for noun and imperative form for verb>, "pronunciation": <string, pronunciation of the word, in IPA>, "part_of_speech": <string, part of speech of the word, eg. n, v, adj, adv, conj, pron, etc>, "meaning": <string, English meaning of the word>, "example_sentence": <string, example sentence of the word>, "example_sentence_meaning": <string, meaning of the example sentence>}`,
        },
    ];
    const pronunciation_request = fetch_pronunciation(spell);
    const ai_request = ai_client.run("@cf/meta/llama-3.1-8b-instruct" as BaseAiTextGenerationModels, { messages } as BaseAiTextGeneration["inputs"]) as Promise<{ response: string }>;
    const [pronunciation_voice_response, response] = await Promise.all([pronunciation_request, ai_request]);
    const ai_response = response.response;
    const pronunciation_voice = Array.from(Buffer.from(pronunciation_voice_response));
    try {
        const word: Omit<SingleMeaningWord, "pronunciation_voice"> = JSON.parse(ai_response);
        return {
            id: crypto.randomUUID(),
            spell: word.spell,
            pronunciation: trimPronunciationBrackets(word.pronunciation),
            pronunciation_voice: pronunciation_voice,
            meanings: [{
                part_of_speech: word.part_of_speech,
                meaning: word.meaning,
                example_sentence: word.example_sentence,
                example_sentence_meaning: word.example_sentence_meaning
            }]
        };
    } catch {
        console.log("failed to parse ai_response:", ai_response);
    }
}

async function putIntoDB(db_client: D1Database, spell: string, word: WordVoiceFetched) {
    const voice = new Uint8Array(word.pronunciation_voice);
    try {
        await db_client.prepare(`INSERT INTO Word(id, spell, pronunciation, pronunciation_voice, source, pronunciation_voice_url) 
        VALUES (?1, ?2, ?3, ?4, ?5, ?6);`)
            .bind(word.id, word.spell, word.pronunciation, Array.from(voice), "AI", null)
            .run();
    } catch {
        console.log("failed to save word", word);
    }
    await Promise.all(word.meanings.map(meaning => {
        try {
            db_client.prepare(`INSERT INTO 
            WordMeaning(
                id,
                word_id,
                part_of_speech,
                meaning,
                example_sentence,
                example_sentence_meaning)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6);`)
                .bind(
                    crypto.randomUUID(),
                    word.id,
                    meaning.part_of_speech || null,
                    he.decode(meaning.meaning),
                    meaning.example_sentence && he.decode(meaning.example_sentence) || null,
                    meaning.example_sentence_meaning && he.decode(meaning.example_sentence_meaning) || null)
                .run();
        } catch {
            console.log("failed to save meaning", meaning);
        }
    }));
    try {
        await db_client.prepare(`INSERT INTO WordVariant(id, spell, word_id) VALUES (?1, ?2, ?3);`)
            .bind(crypto.randomUUID(), spell, word.id)
            .run();
    } catch {
        console.log("failed to save WordVariant", spell);
    }
}

export async function GET(request: NextRequest) {
    const spell = request.nextUrl.searchParams.get("spell")!;
    try {
        const db = getRequestContext().env.DB;
        const db_result = await getFromDB(db, spell);
        if (db_result.length !== 0) {
            return NextResponse.json(db_result);
        }
        const ai_client = getRequestContext().env.AI;
        const ai_result = await getFromAI(ai_client, spell);
        if (ai_result !== undefined) {
            await putIntoDB(db, spell, ai_result);
            return NextResponse.json([ai_result]);
        } else {
            return NextResponse.json([], { status: 404 });
        }
    } catch (e) {
        console.log("unknown", e);
    }
}
