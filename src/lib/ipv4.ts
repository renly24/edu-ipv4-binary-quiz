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

export type AddressInfo = {
  /** アドレスの種類（見出し） */
  kind: string;
  /** 種類の説明 */
  description: string;
  /** ネットワーク部の長さ（ビット）。2進数を色分けするのに使う */
  prefix: number;
  /** ネットワーク部・ホスト部の説明 */
  parts: string;
};

/** 左から1が続くサブネットマスクなら、1の個数を返す。そうでなければ null */
export function maskPrefix(octets: number[]): number | null {
  if (octets.length !== 4 || octets[0] !== 255) return null;
  const n = octets.reduce((acc, o) => acc * 256 + o, 0);
  const inverted = 0xffffffff - n;
  if ((inverted & (inverted + 1)) !== 0) return null;
  return 32 - Math.log2(inverted + 1);
}

// 例として使うサブネットマスク。家庭や学校のLANでよく使われる /24 を想定する
const ASSUMED_PREFIX = 24;

/** IPv4アドレスがどんな種類か、どこがネットワーク部・ホスト部かを説明する */
export function describeAddress(octets: number[]): AddressInfo {
  const prefix = maskPrefix(octets);
  if (prefix !== null) {
    const hostBits = 32 - prefix;
    return {
      kind: `サブネットマスク（/${prefix}）`,
      description:
        "IPアドレスと組にして使い、どこまでがネットワーク部かを表す値です。左から1が連続し、途中から0だけになります。",
      prefix,
      parts: `1が${prefix}個 → IPアドレスの左${prefix}ビットがネットワーク部、残り${hostBits}ビットがホスト部になります（つなげられる機器は最大 2^${hostBits} − 2 = ${(2 ** hostBits - 2).toLocaleString()} 台）。`,
    };
  }

  const [a, b, , d] = octets;
  let kind: string;
  let description: string;
  if (a === 10) {
    kind = "プライベートアドレス（10.0.0.0〜10.255.255.255）";
    description = "会社や学校など、大きな組織のLANの中だけで使うアドレスです。インターネット上では使われません。";
  } else if (a === 172 && b >= 16 && b <= 31) {
    kind = "プライベートアドレス（172.16.0.0〜172.31.255.255）";
    description = "組織のLANの中だけで使うアドレスです。インターネット上では使われません。";
  } else if (a === 192 && b === 168) {
    kind = "プライベートアドレス（192.168.0.0〜192.168.255.255）";
    description = "家庭のWi-Fiルータなど、小さなLANでよく使われるアドレスです。インターネット上では使われません。";
  } else if (a === 127) {
    return {
      kind: "ループバックアドレス（127.0.0.0〜127.255.255.255）",
      description: "自分自身のコンピュータを指す特別なアドレスです。",
      prefix: 8,
      parts: "最初の8ビットが 01111111（127）なら、残りの部分が何であっても自分自身を指します。",
    };
  } else if (a === 169 && b === 254) {
    kind = "リンクローカルアドレス（169.254.0.0〜169.254.255.255）";
    description = "DHCPでアドレスをもらえなかったときに、機器が自分で付けるアドレスです。";
  } else if (a >= 224 && a <= 239) {
    kind = "マルチキャストアドレス（224.0.0.0〜239.255.255.255）";
    description = "決まったグループの機器にまとめて送るための特別なアドレスです。";
  } else if (a >= 240) {
    kind = "予約済みアドレス（240.0.0.0〜255.255.255.255）";
    description = "将来のためなどに予約されていて、ふつうの機器には使われないアドレスです。";
  } else {
    kind = "グローバルアドレス";
    description = "インターネット上で使われる、世界で1つだけのアドレスです。";
  }

  const network = octets.slice(0, 3).join(".");
  let parts = `サブネットマスクが 255.255.255.0（/${ASSUMED_PREFIX}）なら、左3つ「${network}」がネットワーク部（どのネットワークか）、最後の「${d}」がホスト部（そのネットワークの中のどの機器か）です。`;
  if (d === 0) parts += " ホスト部がすべて0なので、機器ではなくネットワークそのものを表すアドレスになります。";
  if (d === 255) parts += " ホスト部がすべて1なので、ネットワーク内の全機器あての「ブロードキャストアドレス」になります。";

  return { kind, description, prefix: ASSUMED_PREFIX, parts };
}

/** 1オクテットの値が、サブネットマスクでよく出る値ならその説明を返す */
export function describeOctet(n: number): string | null {
  const ones = toBinary8(n).indexOf("0");
  if (n === 0) return "00000000 = 0 は、サブネットマスクのホスト部側でよく出る値です。";
  if (ones === -1) return "11111111 = 255 は、8ビットで表せる最大の値です。サブネットマスクでよく出ます。";
  if (/^1+0+$/.test(toBinary8(n))) return `左から1が${ones}個続く形で、サブネットマスクでよく出る値です。`;
  return null;
}
