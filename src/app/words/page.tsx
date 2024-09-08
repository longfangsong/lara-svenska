import { getRequestContext } from "@cloudflare/next-on-pages";
import { WordsPagination } from "./pagination";
import WordTable from "./table";
import { auth } from "../auth";
import { fetchWordsCount, WORDS_PER_PAGE } from "../lib/data";

export const runtime = "edge";

export default async function Words({ searchParams }: {
  searchParams?: {page?: string;};
}) {
  const db = getRequestContext().env.DB;
  const session = await auth();
  const words_count = await fetchWordsCount(db, session?.user?.email!);
  const currentPage = Number(searchParams?.page) || 0;
  return <>
    <WordTable page={currentPage} />
    <div className="flex flex-row justify-center w-full">
      <WordsPagination totalPages={Math.ceil(words_count / WORDS_PER_PAGE)} />
    </div>
  </>;
}


