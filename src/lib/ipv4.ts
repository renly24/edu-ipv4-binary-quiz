export const WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1] as const;

export type Level = 1 | 2 | 3;

export type Question = {
  /** 4つのオクテット（10進数）。レベル1では1つだけ */
  octets: number[];
  level: Level;
};

export const LEVELS: { level: Level; title: string; description: string }[] = [
  {
    level: 1,
    title: "レベル1：8ビット",
    description: "8けたの2進数（1オクテット）を10進数に直す",
  },
  {
    level: 2,
    title: "レベル2：IPv4アドレス",
    description: "ドットで区切られた32ビットのIPv4アドレスを10進数に直す",
  },
  {
    level: 3,
    title: "レベル3：区切りなし",
    description: "ドットのない32けたの2進数を、8けたずつに区切ってから直す",
  },
];

export const QUESTIONS_PER_SET = 10;

export function toBinary8(n: number): string {
  return n.toString(2).padStart(8, "0");
}

export function bitsOf(n: number): number[] {
  return toBinary8(n).split("").map(Number);
}

/** 問題文として表示する2進数表記 */
export function formatQuestion(q: Question): string {
  const bins = q.octets.map(toBinary8);
  if (q.level === 3) return bins.join("");
  return bins.join(".");
}

export function formatAnswer(q: Question): string {
  return q.octets.join(".");
}

// サブネットマスクなどでよく見る値。ときどき混ぜて出題する
const COMMON_VALUES = [0, 128, 192, 224, 240, 248, 252, 254, 255, 10, 172, 168, 1];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomOctet(): number {
  return Math.random() < 0.25 ? COMMON_VALUES[randomInt(COMMON_VALUES.length)] : randomInt(256);
}

/** それらしいIPv4アドレスを作る（プライベートアドレスやサブネットマスクも混ぜる） */
function randomAddress(): number[] {
  const r = Math.random();
  if (r < 0.2) return [192, 168, randomInt(256), 1 + randomInt(254)];
  if (r < 0.3) return [10, randomInt(256), randomInt(256), 1 + randomInt(254)];
  if (r < 0.4) return [172, 16 + randomInt(16), randomInt(256), 1 + randomInt(254)];
  if (r < 0.5) {
    // サブネットマスク
    const prefix = 8 + randomInt(23);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return [24, 16, 8, 0].map((s) => (mask >>> s) & 255);
  }
  return [1 + randomInt(223), randomOctet(), randomOctet(), randomOctet()];
}

export function makeQuestions(level: Level, count = QUESTIONS_PER_SET): Question[] {
  const seen = new Set<string>();
  const list: Question[] = [];
  while (list.length < count) {
    const octets = level === 1 ? [randomOctet()] : randomAddress();
    const key = octets.join(".");
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ octets, level });
  }
  return list;
}

/** 入力欄の文字列を0〜255の整数として読む。読めなければ null */
export function parseOctet(input: string): number | null {
  const s = input.trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n <= 255 ? n : null;
}
