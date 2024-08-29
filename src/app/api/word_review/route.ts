import { auth } from "@/app/auth";
import { WordReview } from "@/types";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";
type PatchPayload = {
  query_count: number | undefined;
  review_count: number | undefined;
  current_review_time: number | undefined;
  in_article: string | undefined;
};

function generateSQL(payload: PatchPayload): string {
  let result = "UPDATE WordReview SET";
  let current_index = 2;
  if (payload.query_count) {
    result += ` query_count=?${current_index}\n`;
    current_index++;
  }
  if (payload.review_count) {
    result += ` review_count=?${current_index}\n`;
    current_index++;
  }
  if (payload.current_review_time) {
    result += ` current_review_time=?${current_index}\n`;
  }
  result += "WHERE id=?1;";
  return result;
}

export const PATCH = auth(async function PATCH(request: NextRequest) {
  const req = request as NextRequest & { auth: Session };
  if (!req.auth.user?.email) {
    return new NextResponse(null, { status: 401 });
  }
  const db = getRequestContext().env.DB;
  const id = request.nextUrl.searchParams.get("id");
  const payload = await request.json<PatchPayload>();
  const update_sql = generateSQL(payload);
  const param = [
    id,
    payload.query_count,
    payload.review_count,
    payload.current_review_time,
  ].filter((it) => it !== undefined);
  await db
    .prepare(update_sql)
    .bind(...param)
    .run();
  if (payload.in_article) {
    await db
      .prepare(
        `INSERT INTO WordReviewInArticle (article_id, review_id)
            VALUES (?1, ?2);`,
      )
      .bind(payload.in_article, id)
      .run();
  }
  return NextResponse.json(null);
});

export const POST = auth(async function POST(request: NextRequest) {
  const req = request as NextRequest & { auth: Session };
  if (!req.auth.user?.email) {
    return new NextResponse(null, { status: 401 });
  }
  const payload = await request.json<{
    word_id: string;
    in_article: string | undefined;
  }>();
  const db = getRequestContext().env.DB;
  const existing = await db
    .prepare(
      `SELECT id, user_email,
        word_id, query_count, review_count,
        current_review_time
    FROM WordReview
    WHERE word_id = ?1 AND user_email = ?2;`,
    )
    .bind(payload.word_id, req.auth.user.email)
    .first<WordReview>();
  if (existing) {
    return NextResponse.json(existing, {
      status: 409,
    });
  }
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO WordReview (id, user_email, word_id, query_count, review_count, current_review_time)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6);`,
    )
    .bind(id, req.auth.user.email, payload.word_id, 1, 0, null)
    .run();
  if (payload.in_article) {
    await db
      .prepare(
        `INSERT INTO WordReviewInArticle (article_id, review_id)
              VALUES (?1, ?2);`,
      )
      .bind(payload.in_article, id)
      .run();
  }
  return NextResponse.json(id);
});
