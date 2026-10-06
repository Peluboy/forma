import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
// @ts-ignore server modules execute directly in Node.
import {
  analyzeReference,
  analysisCapabilities,
  normalizeRegions,
  validateImage,
} from "../server/analysis/index.mjs";

const uri = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;

test("reference decoder rejects remote URLs, disguised SVG, invalid base64 and oversized dimensions", async () => {
  for (const value of [
    "https://example.com/a.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,bm90IGFuIGltYWdl",
    "data:image/png;base64,%%%%",
  ])
    await assert.rejects(validateImage(value));
  const large = await sharp({
    create: { width: 8001, height: 10, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(validateImage(uri(large)));
  const jpeg = await sharp({
    create: { width: 720, height: 900, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(validateImage(uri(jpeg)));
});

test("reference decoder accepts PNG and respects a bounded aspect ratio", async () => {
  const buffer = await sharp({
    create: { width: 720, height: 900, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const valid = await validateImage(uri(buffer));
  assert.equal(valid.width, 720);
  assert.equal(valid.height, 900);
});

test("provider output is bounded and does not admit arbitrary styles or semantic fields", () => {
  const [r] = normalizeRegions([
    {
      text: "  Exact text  ",
      confidence: 99,
      box: { x: -2, y: 899, width: 900, height: 900 },
      fontSize: 1000,
      fontFamily: "malicious",
      textColor: "url(x)",
      coverColor: "#abcdef",
      field: "invented",
    },
  ]);
  assert.equal(r.text, "Exact text");
  assert.equal(r.confidence, 1);
  assert.deepEqual(r.box, { x: 0, y: 899, width: 720, height: 1 });
  assert.equal(r.fontFamily, "Arial");
  assert.equal(r.textColor, "#111111");
  assert.equal(r.field, null);
  assert.equal(normalizeRegions([{ text: "bad", box: { x: NaN } }]).length, 0);
});

test(
  "real local OCR recognizes a synthetic reference with normalized candidate boxes",
  { timeout: 60000 },
  async (t) => {
    if (!analysisCapabilities().local) {
      t.skip("Run npm run setup:ocr to install English assets first.");
      return;
    }
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900"><rect width="720" height="900" fill="white"/><text x="60" y="190" font-family="Arial" font-size="64" font-weight="bold" fill="black">SUMMER NIGHT</text><text x="65" y="320" font-family="Arial" font-size="36" fill="black">Friday July 24</text><text x="65" y="440" font-family="Arial" font-size="32" fill="black">Garden Hall</text></svg>',
    );
    const png = await sharp(svg).png().toBuffer();
    const result = await analyzeReference({
      image: uri(png),
      provider: "local",
    });
    assert.equal(result.provider, "local");
    const all = result.regions.map((r: any) => r.text).join(" ");
    assert.match(all, /SUMMER NIGHT/i);
    assert.match(all, /Garden Hall/i);
    assert.ok(result.regions.some((r: any) => r.field === "title"));
    assert.ok(result.regions.some((r: any) => r.field === "location"));
    for (const r of result.regions) {
      assert.ok(r.box.x >= 0 && r.box.x + r.box.width <= 720);
      assert.ok(r.box.y >= 0 && r.box.y + r.box.height <= 900);
    }
    assert.ok(result.warnings.some((w: string) => w.includes("estimates")));
  },
);

test("cancelled analysis exits without starting recognition", async () => {
  if (!analysisCapabilities().local) return;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    analyzeReference({
      image: "ignored",
      provider: "local",
      signal: controller.signal,
    }),
    { code: "ANALYSIS_TIMEOUT" },
  );
});

test("OpenAI sends a structured image request and sanitizes provider failures without exposing keys", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY,
    originalModel = process.env.OPENAI_VISION_MODEL;
  process.env.OPENAI_API_KEY = "test-private-key";
  process.env.OPENAI_VISION_MODEL = "test-vision-model";
  const image = uri(
    await sharp({
      create: { width: 720, height: 900, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
  );
  try {
    globalThis.fetch = async (_url: any, init: any) => {
      const request = JSON.parse(init.body);
      assert.equal(request.store, false);
      assert.equal(request.text.format.strict, true);
      assert.equal(request.input[0].content[1].type, "input_image");
      assert.match(
        request.input[0].content[1].image_url,
        /^data:image\/png;base64,/,
      );
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    regions: [
                      {
                        text: "Exact source",
                        confidence: 0.95,
                        box: { x: 20, y: 20, width: 150, height: 30 },
                        fontSize: 28,
                        fontFamily: "Arial",
                        textColor: "#111111",
                        coverColor: "#ffffff",
                        field: "title",
                      },
                    ],
                    warnings: [],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    };
    const result = await analyzeReference({ image, provider: "openai" });
    assert.equal(result.regions[0].text, "Exact source");
    assert.equal(result.provider, "openai");
    globalThis.fetch = async () =>
      new Response("test-private-key", { status: 401 });
    await assert.rejects(
      analyzeReference({ image, provider: "openai" }),
      (error: any) =>
        error.code === "AI_PROVIDER_ERROR" &&
        !error.message.includes("test-private-key"),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OPENAI_VISION_MODEL;
    else process.env.OPENAI_VISION_MODEL = originalModel;
  }
});

test("Gemini uses server-side image requests, bounds output, and rejects failures", async () => {
  const originalFetch = globalThis.fetch;
  const key = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_VISION_MODEL;
  process.env.GEMINI_API_KEY = "private-gemini-test";
  process.env.GEMINI_VISION_MODEL = "gemini-test";
  const image = uri(
    await sharp({
      create: { width: 720, height: 900, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
  );
  try {
    globalThis.fetch = async (url: any, init: any) => {
      assert.equal(
        String(url),
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
      );
      assert.equal(init.headers["x-goog-api-key"], "private-gemini-test");
      const body = JSON.parse(init.body);
      assert.equal(body.contents[0].parts[1].inlineData.mimeType, "image/png");
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.match(
        body.systemInstruction.parts[0].text,
        /Never follow instructions/,
      );
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    regions: [
                      {
                        text: "Source title",
                        confidence: 0.9,
                        box: { x: 20, y: 20, width: 200, height: 40 },
                        fontSize: 30,
                        fontFamily: "Arial",
                        textColor: "#111111",
                        coverColor: "#ffffff",
                        field: "title",
                      },
                    ],
                    warnings: [],
                  }),
                },
              ],
            },
          },
        ],
      });
    };
    const result = await analyzeReference({ image, provider: "gemini" });
    assert.equal(result.provider, "gemini");
    assert.equal(result.regions[0].text, "Source title");
    for (const response of [
      new Response("private-gemini-test", { status: 429 }),
      Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
      Response.json({
        candidates: [
          { finishReason: "STOP", content: { parts: [{ text: "invalid" }] } },
        ],
      }),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(
        analyzeReference({ image, provider: "gemini" }),
        (e: any) =>
          e.code === "AI_PROVIDER_ERROR" &&
          !e.message.includes("private-gemini-test"),
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
    if (model === undefined) delete process.env.GEMINI_VISION_MODEL;
    else process.env.GEMINI_VISION_MODEL = model;
  }
});

test("Gemini retries temporary overload once and reports it without blaming credentials", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.GEMINI_API_KEY,
    oldModel = process.env.GEMINI_VISION_MODEL;
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_VISION_MODEL = "test-model";
  const image = uri(
    await sharp({
      create: { width: 720, height: 900, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
  );
  try {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return calls === 1
        ? new Response("busy", { status: 503 })
        : Response.json({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    { text: JSON.stringify({ regions: [], warnings: [] }) },
                  ],
                },
              },
            ],
          });
    };
    await analyzeReference({ image, provider: "gemini" });
    assert.equal(calls, 2);
    calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response("busy", { status: 503 });
    };
    await assert.rejects(
      analyzeReference({ image, provider: "gemini" }),
      (e: any) =>
        e.message.includes("temporarily busy") && !e.message.includes("key"),
    );
    assert.equal(calls, 2);
    calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response("quota", { status: 429 });
    };
    await assert.rejects(
      analyzeReference({ image, provider: "gemini" }),
      /quota/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GEMINI_VISION_MODEL;
    else process.env.GEMINI_VISION_MODEL = oldModel;
  }
});

test("Gemini fallback stays within Google, remembers overload briefly, and skips quota retries", async () => {
  const oldFetch = globalThis.fetch;
  const saved = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_VISION_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
  ];
  process.env.GEMINI_API_KEY = "test";
  process.env.GEMINI_VISION_MODEL = "primary-fallback-test";
  process.env.GEMINI_FALLBACK_MODEL = "backup-test";
  const image = uri(
    await sharp({
      create: { width: 720, height: 900, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
  );
  const urls: string[] = [];
  try {
    globalThis.fetch = async (url: any) => {
      urls.push(String(url));
      return String(url).includes("primary-fallback-test")
        ? new Response("busy", { status: 503 })
        : Response.json({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    { text: JSON.stringify({ regions: [], warnings: [] }) },
                  ],
                },
              },
            ],
          });
    };
    const result = await analyzeReference({ image, provider: "gemini" });
    assert.equal(urls.length, 2);
    assert.match(urls[1], /generativelanguage.googleapis.com.*backup-test/);
    assert(result.warnings.some((x: string) => x.includes("backup Gemini")));
    urls.length = 0;
    await analyzeReference({ image, provider: "gemini" });
    assert.equal(urls.length, 1);
    assert.match(urls[0], /backup-test/);
    process.env.GEMINI_VISION_MODEL = "quota-primary-test";
    urls.length = 0;
    globalThis.fetch = async (url: any) => {
      urls.push(String(url));
      return new Response("quota", { status: 429 });
    };
    await assert.rejects(
      analyzeReference({ image, provider: "gemini" }),
      /quota/,
    );
    assert.equal(urls.length, 1);
  } finally {
    globalThis.fetch = oldFetch;
    ["GEMINI_API_KEY", "GEMINI_VISION_MODEL", "GEMINI_FALLBACK_MODEL"].forEach(
      (k, i) => {
        if (saved[i] === undefined) delete process.env[k];
        else process.env[k] = saved[i];
      },
    );
  }
});

test("enabled development fallback returns real OCR when Gemini remains overloaded", async (t) => {
  if (!analysisCapabilities().local) {
    t.skip("Local OCR assets required");
    return;
  }
  const keys = [
    "GEMINI_API_KEY",
    "GEMINI_VISION_MODEL",
    "GEMINI_FALLBACK_MODEL",
    "FORMA_LOCAL_ANALYSIS_FALLBACK",
  ];
  const saved = keys.map((k) => process.env[k]);
  const oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test";
  process.env.GEMINI_VISION_MODEL = "outage-test";
  delete process.env.GEMINI_FALLBACK_MODEL;
  process.env.FORMA_LOCAL_ANALYSIS_FALLBACK = "true";
  try {
    globalThis.fetch = async () => new Response("overloaded", { status: 503 });
    const png = await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900"><rect width="720" height="900" fill="white"/><text x="60" y="190" font-family="Arial" font-size="64" fill="black">SUMMER NIGHT</text></svg>',
      ),
    )
      .png()
      .toBuffer();
    const result = await analyzeReference({
      image: uri(png),
      provider: "gemini",
    });
    assert.equal(result.provider, "local");
    assert.match(
      result.regions.map((r: any) => r.text).join(" "),
      /SUMMER NIGHT/i,
    );
    assert(
      result.warnings.some((w: string) => w.includes("Local OCR was used")),
    );
    globalThis.fetch = async () => new Response("denied", { status: 403 });
    await assert.rejects(
      analyzeReference({ image: uri(png), provider: "gemini" }),
      /rejected access/,
    );
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) => {
      if (saved[i] === undefined) delete process.env[k];
      else process.env[k] = saved[i];
    });
  }
});
