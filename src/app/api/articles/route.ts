import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from '@cloudflare/next-on-pages';
import { load } from "cheerio";

export const runtime = 'edge';

async function fetch_single_article(title: string, url: string, db: D1Database) {
  const response = await fetch(`https://sverigesradio.se${url}`);
  const $ = load(await response?.text());
  let content = $(".publication-preamble").text();
  const details = $(".article-details__section p")
    .map((_, it) => $(it).text())
    .toArray();
  details.pop();
  content += details.join("");
  const create_time = new Date($("time.publication-metadata__item").attr('datetime') || '');
  const id = crypto.randomUUID();
  const stmt = db.prepare('INSERT INTO Article (id, title, content, create_time, url) VALUES (?1, ?2, ?3, ?4, ?5);');
  await stmt.bind(id, title, content, create_time.getTime(), url).run();
}

async function title_exists(title: string, db: D1Database): Promise<boolean> {
  let query_title_result = await db.prepare("select id from Article where title = ?1;").bind(title).first();
  return query_title_result !== null;
}

async function fetch_all_titles(): Promise<Array<{ title: string, url: string }>> {
  const latt_svenska_page = await fetch("https://sverigesradio.se/radioswedenpalattsvenska");
  const html = await latt_svenska_page.text();
  const $ = load(html);
  const elements = $("h2.heading.heading-link.h2>a.heading");
  let all_titles = elements.map((_, element) => {
    return {
      title: $(element).text()!,
      url: $(element).attr("href")!
    };
  }).toArray();
  return all_titles;
}

export async function GET(request: NextRequest) {
  const db = getRequestContext().env.DB;
  const id = request.nextUrl.searchParams.get("id");
  if (id !== null) {
    const stmt = db.prepare("SELECT id, title, url, create_time, content FROM Article WHERE id=?1;");
    const result = await stmt.bind(id).first();
    return NextResponse.json(result);
  } else {
    let all_titles = await fetch_all_titles();
    let exists = await Promise.all(all_titles.map(({ title }) => title_exists(title, db)));
    let new_titles = all_titles.filter((_, index) => !exists[index]);
    await Promise.all(new_titles.map(({ title, url }) => fetch_single_article(title, url, db)));
    const stmt = db.prepare("SELECT id, title FROM Article ORDER BY create_time DESC LIMIT 10;");
    const result = await stmt.all();
    return NextResponse.json(result.results);
  }
}
