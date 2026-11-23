import { NextRequest, NextResponse } from "next/server";
import { ExplanationRequestSchema } from "@/lib/gemini/schemas";
import { getVerifiedExplanation } from "@/lib/gemini/service";
import { extractClientIp } from "@/lib/gemini/rate-limiter";
import { NonRetryableError } from "@/lib/gemini/resilience";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const validation = ExplanationRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Request validation failed.",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(request.headers);
    const result = await getVerifiedExplanation(validation.data, clientIp);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof NonRetryableError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    const message = err instanceof Error ? err.message : "Internal assistant error.";
    return NextResponse.json(
      { error: "Failed to generate verified explanation.", details: message },
      { status: 500 }
    );
  }
}
