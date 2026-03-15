import { NextResponse } from "next/server";
import { AMENITY_OPTIONS } from "@/lib/listings/resortCatalog";
import {
  AI_PREFILL_FIELD_LABELS,
  AI_PREFILL_MAX_FILE_BYTES,
  AI_PREFILL_MAX_FILES,
  normalizeAiListingPrefillResult,
  type AiPrefillFieldName,
} from "@/lib/listings/aiPrefill";

export const runtime = "nodejs";

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

const AI_PREFILL_FIELDS = Object.keys(AI_PREFILL_FIELD_LABELS) as AiPrefillFieldName[];

const LISTING_PREFILL_SCHEMA = {
  name: "listing_screenshot_prefill",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
      reviewRequired: {
        type: "array",
        items: {
          type: "string",
          enum: AI_PREFILL_FIELDS,
        },
      },
      extracted: {
        type: "object",
        additionalProperties: false,
        properties: {
          resortName: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          portalBrand: { type: ["string", "null"] },
          resortPortalName: { type: ["string", "null"] },
          resortBookingUrl: { type: ["string", "null"] },
          ownershipType: {
            type: ["string", "null"],
            enum: ["fixed_week", "floating_week", "points", null],
          },
          availabilityMode: {
            type: ["string", "null"],
            enum: ["exact", "flex", null],
          },
          season: { type: ["string", "null"] },
          homeWeek: { type: ["string", "null"] },
          pointsPower: { type: ["integer", "null"] },
          inventoryNotes: { type: ["string", "null"] },
          checkInDate: { type: ["string", "null"] },
          checkOutDate: { type: ["string", "null"] },
          availableStartDate: { type: ["string", "null"] },
          availableEndDate: { type: ["string", "null"] },
          minimumNights: { type: ["integer", "null"] },
          maximumNights: { type: ["integer", "null"] },
          unitType: { type: ["string", "null"] },
          amenities: {
            type: "array",
            items: {
              type: "string",
              enum: [...AMENITY_OPTIONS],
            },
          },
        },
        required: [
          "resortName",
          "city",
          "country",
          "portalBrand",
          "resortPortalName",
          "resortBookingUrl",
          "ownershipType",
          "availabilityMode",
          "season",
          "homeWeek",
          "pointsPower",
          "inventoryNotes",
          "checkInDate",
          "checkOutDate",
          "availableStartDate",
          "availableEndDate",
          "minimumNights",
          "maximumNights",
          "unitType",
          "amenities",
        ],
      },
    },
    required: ["summary", "warnings", "reviewRequired", "extracted"],
  },
} as const;

function buildDataUrl(file: File, bytes: Buffer) {
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI is not configured for AI listing prefill." }, { status: 503 });
    }

    const formData = await request.formData();
    const files = formData
      .getAll("screenshots")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "Upload at least one screenshot." }, { status: 400 });
    }

    if (files.length > AI_PREFILL_MAX_FILES) {
      return NextResponse.json(
        { error: `Upload up to ${AI_PREFILL_MAX_FILES} screenshots at a time.` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `${file.name} is not an image.` }, { status: 400 });
      }
      if (file.size > AI_PREFILL_MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `${file.name} is larger than ${AI_PREFILL_MAX_FILE_BYTES / (1024 * 1024)} MB.` },
          { status: 400 }
        );
      }
    }

    const imageParts = await Promise.all(
      files.map(async (file) => {
        const bytes = Buffer.from(await file.arrayBuffer());
        return {
          type: "image_url" as const,
          image_url: {
            url: buildDataUrl(file, bytes),
            detail: "high" as const,
          },
        };
      })
    );

    const model = process.env.OPENAI_LISTING_PREFILL_MODEL || "gpt-5-mini";

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You extract listing facts from owner portal screenshots for a timeshare listing form. Return only facts directly visible in the screenshots or strongly implied by structured UI labels. Never guess hidden values. Use null when not visible. Exact dates must be YYYY-MM-DD. Use availabilityMode 'exact' only when both check-in and check-out are visible. Use availabilityMode 'flex' only when the screenshots show a larger booking window or nights range instead of a fixed stay. Use ownershipType 'fixed_week', 'floating_week', or 'points' only if the screenshots support it. Do not invent pricing, descriptions, or amenities not explicitly shown.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Analyze these screenshots and produce a safe draft for the listing form. Include concise warnings for ambiguities, and add every uncertain populated field to reviewRequired.",
              },
              ...imageParts,
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: LISTING_PREFILL_SCHEMA,
        },
      }),
      cache: "no-store",
    });

    const payload = (await openAiResponse.json()) as OpenAiChatCompletionResponse;
    if (!openAiResponse.ok) {
      return NextResponse.json(
        { error: payload.error?.message || "OpenAI request failed." },
        { status: 502 }
      );
    }

    const choice = payload.choices?.[0]?.message;
    if (choice?.refusal) {
      return NextResponse.json({ error: choice.refusal }, { status: 422 });
    }

    if (!choice?.content) {
      return NextResponse.json({ error: "OpenAI returned no structured output." }, { status: 502 });
    }

    const parsed = JSON.parse(choice.content) as unknown;
    const normalized = normalizeAiListingPrefillResult(parsed, AMENITY_OPTIONS);

    return NextResponse.json({ data: normalized });
  } catch {
    return NextResponse.json(
      { error: "Unable to analyze screenshots right now." },
      { status: 500 }
    );
  }
}
