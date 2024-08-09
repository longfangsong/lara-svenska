import PromisePool from "@supercharge/promise-pool";
import { Word, WordVoicePending } from "../src/types";
import { load } from "cheerio";
import { decode } from "he";

type XMLWordEntry = Omit<WordVoicePending, "pronunciation_voice_url"> & {
    inflections: Array<string>
};

type XMLWordEntryWithVoiceURL = WordVoicePending & { inflections: Array<string> };

function extractWord($word: any): XMLWordEntry {
    let translations: Array<string> = [];
    const translation_elements = $word.find("word>translation");
    translation_elements.each((_: any, element: any) => {
        translations.push(element.attribs["value"]);
    });
    const inflections: Array<string> = [];
    $word.find("paradigm>inflection")
        .each((_: any, $infl: any) => {
            inflections.push($infl.attribs["value"]);
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
        }],
        inflections
    }
}

function voicesMap($xdxf: any): Map<string, string> {
    let result = new Map();
    const ars = $xdxf("ar");
    ars.each((_: any, ar: any) => {
        result.set($xdxf(ar).find("k").text(), $xdxf(ar).find("def>iref").attr("href"));
    });
    return result;
}

function fillVoice(voices: Map<string, string>, xml_entry: XMLWordEntry): XMLWordEntryWithVoiceURL {
    return { ...xml_entry, pronunciation_voice_url: voices.get(xml_entry.spell)! };
}

function mergeWords(word1: XMLWordEntry, word2: XMLWordEntry): XMLWordEntry | undefined {
    if (word1.spell === word2.spell) {
        return {
            id: word1.id,
            spell: word1.spell,
            pronunciation: word1.pronunciation,
            inflections: [...word1.inflections, ...word2.inflections],
            meanings: [...word1.meanings, ...word2.meanings]
        }
    } else {
        console.error("Can not merge two different words");
    }
}

async function dumpDictionary(): Promise<[Array<WordVoicePending>, Array<[string, string]>]> {
    const xdxf_request = fetch("http://folkets-lexikon.csc.kth.se/folkets/folkets_sv_en_public.xdxf");
    const xml_request = fetch("http://folkets-lexikon.csc.kth.se/folkets/folkets_sv_en_public.xml");
    const [xdxf_file, xml_file] = await Promise.all([xdxf_request, xml_request]);
    const [xdxf_content, xml_content] = await Promise.all([xdxf_file.text(), xml_file.text()]);
    const $xdxf = load(xdxf_content, { xmlMode: true });
    const $xml = load(xml_content, { xmlMode: true });
    const word_elements = $xml("word");
    const xml_word_entries: Array<XMLWordEntry> = [];
    for (const w of word_elements) {
        const $w = $xml(w);
        xml_word_entries.push(extractWord($w));
    }
    const groups = Object.groupBy(xml_word_entries, it => it.spell);
    const merged_word_entries: Array<XMLWordEntry> = [];
    console.log("merging...");
    for (let group_id in groups) {
        let group = groups[group_id]!;
        merged_word_entries.push(group.reduce((acc, current) => mergeWords(acc, current)!));
    }
    console.log("fetch voices...");
    const voiceMap = voicesMap($xdxf);
    const xml_word_entries_with_voice = merged_word_entries.map(it => fillVoice(voiceMap, it));
    console.log("fetched");
    const spell_word_pairs: Array<[string, string]> = [];
    for (const xml_word_entry_with_voice of xml_word_entries_with_voice) {
        spell_word_pairs.push([xml_word_entry_with_voice.spell, xml_word_entry_with_voice.id]);
        for (const inflection of xml_word_entry_with_voice.inflections) {
            spell_word_pairs.push([inflection, xml_word_entry_with_voice.id]);
        }
    }
    return [xml_word_entries_with_voice, spell_word_pairs];
}

async function generate_sqls() {
    const fs = require('fs');
    const [words, spell_word_pairs] = await dumpDictionary();
    let buffer = '  ';
    words.forEach((word, index) => {
        if (index % 100 === 0) {
            buffer = buffer.slice(0, -2) + ';\n'
            buffer += 'INSERT INTO Word(id, spell, pronunciation, pronunciation_voice, pronunciation_voice_url, source) VALUES\n'
        }
        buffer += `    ('${word.id}', '${word.spell}', ${word.pronunciation ? `'${word.pronunciation}'` : null}, null, ${word.pronunciation_voice_url ? `'${word.pronunciation_voice_url}'` : null}, 'dictionary'),\n`
    });
    buffer = buffer.slice(2, -2) + ';\n'
    fs.writeFileSync("./0002_words.sql", buffer);
    buffer = '  ';
    spell_word_pairs.forEach(([spell, word_id], index) => {
        if (index % 100 === 0) {
            buffer = buffer.slice(0, -2) + ';\n';
            buffer += 'INSERT INTO WordVariant(id, spell, word_id) VALUES\n';
        }
        buffer += `    ('${crypto.randomUUID()}', '${spell}', '${word_id}'),\n`
    })
    buffer = buffer.slice(2, -2) + ';\n'
    fs.writeFileSync("./0003_word_variant.sql", buffer);
    buffer = '  ';
    let index = 0;
    for (const word of words) {
        for (const meaning of word.meanings) {
            if (index % 100 === 0) {
                buffer = buffer.slice(0, -2) + ';\n';
                buffer += 'INSERT INTO WordMeaning(id, word_id, part_of_speech, meaning, example_sentence, example_sentence_meaning) VALUES\n';
            }
            buffer += ` ('${crypto.randomUUID()}', '${word.id}', ${meaning.part_of_speech && `'${meaning.part_of_speech}'` || null}, '${decode(meaning.meaning).replaceAll("\'", "\'\'")}', ${meaning.example_sentence &&
                `'${decode(meaning.example_sentence).replaceAll("\'", "\'\'")}'` || null}, ${meaning.example_sentence_meaning &&
                `'${decode(meaning.example_sentence_meaning).replaceAll("\'", "\'\'")}'` || null}),\n`
            ++index;
        }
    }
    buffer = buffer.slice(2, -2) + ';\n'
    fs.writeFileSync("./0004_word_meaning.sql", buffer);
}

generate_sqls();