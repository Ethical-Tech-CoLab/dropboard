// Access codes + CORS/JSON helpers for the Cloudflare backend.

const WORDS = [
  "TIGER", "MAPLE", "COMET", "RIVER", "AMBER", "PIXEL", "MANGO", "ORBIT",
  "CEDAR", "FROST", "GECKO", "HAZEL", "IVORY", "JOLLY", "KAYAK", "LOTUS",
  "MOCHA", "NOVA", "OASIS", "PEARL", "QUARTZ", "RAVEN", "SOLAR", "TULIP",
  "UMBER", "VIVID", "WILLOW", "XENON", "YODEL", "ZEBRA", "BLOOM", "CORAL",
  "DELTA", "EMBER", "FABLE", "GLADE", "HONEY", "INDIGO", "JAZZ", "KOALA",
];

function randInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

export function makeAccessCode(): string {
  return `${WORDS[randInt(WORDS.length)]}-${1000 + randInt(9000)}`;
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}
