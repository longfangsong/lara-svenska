"use client";

import { Pagination } from "flowbite-react";
import { useSearchParams } from "next/navigation";

export function WordsPagination({
  totalPages,
  snapshot,
}: {
  totalPages: number;
  snapshot?: Date;
}) {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  return (
    <Pagination
      currentPage={currentPage}
      onPageChange={(page) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", page.toString());
        params.set("fromPage", currentPage.toString());
        params.set("snapshot", (snapshot || new Date()).getTime().toString());
        window.location.href = `?${params.toString()}`;
      }}
      totalPages={totalPages}
    />
  );
}
