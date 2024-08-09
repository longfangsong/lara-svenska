import { Cheerio, CheerioAPI } from "cheerio";
import { Word } from "./types"

function matchInflection(spell: string, $word: Cheerio<any>): boolean {
    let found = false;
    $word.find("paradigm>inflection")
        .each((_, $infl) => {
            found ||= $infl.attribs["value"] === spell;
        });
    return found;
}

function mergeWords(word1: Omit<Word, "pronunciation_voice">, word2: Omit<Word, "pronunciation_voice">): Omit<Word, "pronunciation_voice"> | undefined {
    if (word1.spell === word2.spell) {
        return {
            id: word1.id,
            spell: word1.spell,
            pronunciation: word1.pronunciation,
            meanings: [...word1.meanings, ...word2.meanings]
        }
    } else {
        console.error("Can not merge two different words");
    }
}

async function fillVoice(word: Omit<Word, "pronunciation_voice">, $xdxf: CheerioAPI): Promise<Word> {
    const ars = $xdxf("ar");
    let word_href = null;
    ars.each((_, ar) => {
        if ($xdxf(ar).find("k").text() === word.spell) {
            word_href = $xdxf(ar).find("def>iref").attr("href")
        }
    });
    const before_fetch_voice = new Date();
    const response = await fetch(word_href!);
    const voice = await response.arrayBuffer();
    const after_fetch_voice = new Date();
    return { ...word, pronunciation_voice: Array.from(Buffer.from(voice)) };
}

export function extractWord($word: Cheerio<any>): Omit<Word, "pronunciation_voice"> {
    let translations: Array<string> = [];
    const translation_elements = $word.find("word>translation");
    translation_elements.each((_, element) => {
        translations.push(element.attribs["value"]);
    });
    return {
        id: crypto.randomUUID(),
        spell: $word.attr("value")!,
        pronunciation: $word.find("phonetic").first().attr("value")!,
        meanings: [{
            part_of_speech: $word.attr("class")!,
            meaning: translations.join(", "),
            example_sentence: $word.find("example").attr("value"),
            example_sentence_meaning: $word.find("example>translation").attr("value"),
        }]
    }
}

export async function findWord($xml: CheerioAPI, $xdxf: CheerioAPI, spell: string): Promise<Array<Word>> {
    const xml_words = $xml("word");
    const direct_match: Array<Omit<Word, "pronunciation_voice">> = [];
    xml_words.each((_, element) => {
        let $elem = $xml(element);
        if ($elem.attr("value") === spell) {
            direct_match.push(extractWord($elem));
        }
    });
    let result = [];
    if (direct_match.length > 0) {
        const direct_match_word = direct_match.reduce((acc, current) => mergeWords(acc, current)!);
        result.push(await fillVoice(direct_match_word, $xdxf));
    }

    const inflection_match: Array<Omit<Word, "pronunciation_voice">> = [];
    xml_words.each((_, element) => {
        let $elem = $xml(element);
        if (matchInflection(spell, $elem)) {
            inflection_match.push(extractWord($elem));
        }
    });
    const inflection_match_groups = Object.groupBy(inflection_match, it => it.spell);
    const inflection_result: Array<Omit<Word, "pronunciation_voice">> = [];
    for (let group_id in inflection_match_groups) {
        let group = inflection_match_groups[group_id]!;
        const inflection_match_word = group.reduce((acc, current) => mergeWords(acc, current)!);
        inflection_result.push(inflection_match_word);
    }
    const inflection_result_filled = await Promise.all(inflection_result.map(it => fillVoice(it, $xdxf)));
    result = [...result, ...inflection_result_filled];
    return result;
}