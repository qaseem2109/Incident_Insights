import { NextResponse } from "next/server";
import { ApiError } from "./incidents";

export function handle<T>(fn: () => T | Promise<T>) {
  return Promise.resolve()
    .then(fn)
    .then((data) => (data instanceof Response ? data : NextResponse.json(data)))
    .catch((e: unknown) => {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message, fields: e.fields }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    });
}

export const parseId = (s: string): number => {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, "Invalid id");
  return n;
};
