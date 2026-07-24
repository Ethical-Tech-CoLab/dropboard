// Human-readable access codes: WORD-NNNN (e.g. TIGER-4821).
// ~40 words x 9000 numbers ≈ 360k combinations; brute force is blunted by join rate limits
// (docs/PRODUCT_DESIGN.md §4.7). For a larger space, extend the word list or append letters.

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
  const word = WORDS[randInt(WORDS.length)];
  const num = 1000 + randInt(9000); // 1000..9999
  return `${word}-${num}`;
}
