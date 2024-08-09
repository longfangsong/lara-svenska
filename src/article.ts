export function toWordsAndPunctuations(article: string): Array<Array<string>> {
    const wordsAndPunctuations = article.split(/(\s+)|(\.)/).filter(x => x !== undefined && x.trim().length > 0);
    let result: Array<Array<string>> = [[]];
    for (let wordAndPunctuation of wordsAndPunctuations) {
        if (wordAndPunctuation.endsWith("...")) {
            result[result.length - 1].push(wordAndPunctuation.slice(0, -3), "...");
            result.push([]);
        } else if (wordAndPunctuation.startsWith("\"") || wordAndPunctuation.startsWith("-")) {
            result.push([wordAndPunctuation[0], wordAndPunctuation.slice(1)]);
        } else if (wordAndPunctuation.endsWith(",") || wordAndPunctuation.endsWith(";")) {
            result[result.length - 1].push(wordAndPunctuation.slice(0, -1), wordAndPunctuation[wordAndPunctuation.length - 1]);
        } else if (wordAndPunctuation.endsWith(".") ||
            wordAndPunctuation.endsWith("?") ||
            wordAndPunctuation.endsWith("!") ||
            wordAndPunctuation.endsWith("\"")) {
            result[result.length - 1].push(wordAndPunctuation.slice(0, -1), wordAndPunctuation[wordAndPunctuation.length - 1]);
            result.push([]);
        } else {
            result[result.length - 1].push(wordAndPunctuation);
        }
    }
    result = result.map(it => it.filter(it => it.trim().length > 0));
    return result.filter(it => it.length > 0);
}
