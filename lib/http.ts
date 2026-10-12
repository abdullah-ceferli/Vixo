import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpAuthError } from "@/lib/auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (error instanceof HttpAuthError || error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function parseJson<T>(request: Request, schema: { parse(value: unknown): T }) {
  return schema.parse(await request.json());
}
