export interface ArticleMeta {
  id: string;
  title: string;
}

export type Article = ArticleMeta & {
  url: string;
  content: string;
  voice_url: string;
};

export interface Voice {
  pronunciation_voice: Array<number> | null;
  pronunciation_voice_url: string | null;
}

export type Word = {
  id: string;
  spell: string;
  pronunciation: string;
} & Voice;

export interface WordMeaning {
  part_of_speech: string;
  meaning: string;
  example_sentence: string | null;
  example_sentence_meaning: string | null;
}

export interface WordWithMeanings extends Word {
  meanings: WordMeaning[];
}

export type WordWithSingleMeaning = Word & WordMeaning;

export interface WordReview {
  id: string;
  user_email: string;
  word_id: string;
  query_count: number;
  review_count: number;
  current_review_time: number;
}

export type WordReviewWithWordDetail = WordReview & Omit<Word, "id">;
export type WordReviewWithWordDetailAndMeaning = WordReviewWithWordDetail & {
  meanings: Array<WordMeaning>;
};
