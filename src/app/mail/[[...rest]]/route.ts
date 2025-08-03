import { NextRequest, NextResponse } from "next/server";

const handler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");
  console.log("userId", userId);
  console.log("status", status);
};

export async function GET(request: NextRequest) {
  await handler(request);
  return NextResponse.redirect("https://qbe.sh", 302);
}

export async function POST(request: NextRequest) {
  await handler(request);
  return NextResponse.json({ ok: true }, { status: 200 });
}
