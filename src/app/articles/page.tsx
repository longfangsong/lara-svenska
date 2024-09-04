import { getRequestContext } from "@cloudflare/next-on-pages";
import { ListGroup, ListGroupItem } from "flowbite-react";
import { ArticleMeta } from "../../types";
import { dbSemaphore } from "@/lib";

export const runtime = "edge";

export default async function Articles() {
  const db = getRequestContext().env.DB;
  const stmt = db.prepare(
    "SELECT id, title FROM Article ORDER BY create_time DESC LIMIT 10;",
  );
  const release = await dbSemaphore.acquire();
  const { results: articles } = await stmt.all<ArticleMeta>();
  release();
  return (
    <div className="w-full flex justify-center my-4">
      <ListGroup className="w-full">
        {articles.map((article) => (
          <ListGroupItem href={`/articles/${article.id}`} key={article.id}>
            {article.title}
          </ListGroupItem>
        ))}
      </ListGroup>
    </div>
  );
}
