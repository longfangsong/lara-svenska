import { ListGroup, ListGroupItem } from "flowbite-react";
import React from "react";

export const runtime = 'edge';

export default async function Articles() {
    const articles_request = await fetch(process.env.CF_PAGES_URL + `/api/articles`, {
        next: { revalidate: 60 * 60 * 2 },
    } as any);
    const articles: Array<{ id: string, title: string }> = await articles_request.json();
    return <div className="w-full flex justify-center my-4">
        <ListGroup className="w-full">
            {articles.map(article =>
                <ListGroupItem href={`/articles/${article.id}`} key={article.id}>{article.title}</ListGroupItem>
            )}
        </ListGroup>
    </div>
}