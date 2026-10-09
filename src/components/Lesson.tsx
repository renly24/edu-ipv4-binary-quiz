import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { HOST_COLOR, NETWORK_COLOR, SplitBits } from "./AddressNote";
import BitTable from "./BitTable";
import { toBinary8 } from "@/lib/ipv4";

const OCTET_COLORS = ["#1565c0", "#2e7d32", "#ef6c00", "#6a1b9a"];
const EXAMPLE = [192, 168, 1, 10];
const PREFIX_VALUES = [128, 192, 224, 240, 248, 252, 254, 255];
const ADDRESS_KINDS = [
  ["10.0.0.0〜10.255.255.255", "プライベートアドレス（会社・学校などのLAN内）"],
  ["172.16.0.0〜172.31.255.255", "プライベートアドレス（組織のLAN内）"],
  ["192.168.0.0〜192.168.255.255", "プライベートアドレス（家庭のWi-Fiなど）"],
  ["127.0.0.0〜127.255.255.255", "ループバックアドレス（自分自身）"],
  ["上記以外", "グローバルアドレス（インターネット上で使う）"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function Lesson() {
  return (
    <Box>
      <Section title="① IPv4アドレスは32ビット">
        <Typography variant="body2" paragraph>
          コンピュータの中では、IPv4アドレスは <strong>0と1が32個ならんだ2進数</strong> で扱われています。
          人が読みやすいように、<strong>8ビット（1オクテット）ずつ4つに区切り</strong>、それぞれを10進数に直して「.（ドット）」でつないだものが、ふだん見る
          「192.168.1.10」のような表記です。
        </Typography>
        <Box sx={{ fontFamily: "monospace", fontSize: { xs: "0.85rem", sm: "1.15rem" }, fontWeight: 700, overflowX: "auto", py: 1 }}>
          <Box>
            {EXAMPLE.map((n, i) => (
              <span key={i}>
                <span style={{ color: OCTET_COLORS[i] }}>{toBinary8(n)}</span>
                {i < 3 && "."}
              </span>
            ))}
          </Box>
          <Box sx={{ my: 0.5, color: "text.secondary" }}>↓ 8ビットずつ10進数に直す</Box>
          <Box>
            {EXAMPLE.map((n, i) => (
              <span key={i}>
                <span style={{ color: OCTET_COLORS[i] }}>{n}</span>
                {i < 3 && "."}
              </span>
            ))}
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          8ビットで表せるのは 00000000〜11111111 なので、10進数では <strong>0〜255</strong> の範囲になります。
        </Typography>
      </Section>

      <Section title="② 8ビットを10進数に直す方法">
        <Typography variant="body2" paragraph>
          2進数の各けたには「重み」があります。左から <strong>128・64・32・16・8・4・2・1</strong>。
          <strong>1が立っているけたの重みをたし算</strong>すれば10進数になります。
        </Typography>
        <BitTable value={192} label="例：11000000" />
        <BitTable value={168} label="例：10101000" />
        <BitTable value={10} label="例：00001010" />
        <Typography variant="body2" color="text.secondary">
          重みは右から 1, 2, 4, 8 … と2倍ずつ増えていきます。忘れたら右はしの「1」から倍々に数えよう。
        </Typography>
      </Section>

      <Section title="③ 覚えておくと速い値">
        <Typography variant="body2" paragraph>
          サブネットマスクでは「左から1が続く」形がよく出てきます。128から順に重みを足していった値です。
        </Typography>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ maxWidth: 360 }}>
            <TableHead>
              <TableRow>
                <TableCell>2進数</TableCell>
                <TableCell align="right">10進数</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {PREFIX_VALUES.map((v) => (
                <TableRow key={v}>
                  <TableCell sx={{ fontFamily: "monospace" }}>{toBinary8(v)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {v}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          ほかにも「11111111 = 255」から「0のけたの重みを引く」と速く計算できることがあります（例：11110111 = 255 − 8 = 247）。
        </Typography>
      </Section>

      <Section title="④ IPアドレスの各部分：ネットワーク部とホスト部">
        <Typography variant="body2" paragraph>
          IPアドレスは、前半の <strong style={{ color: NETWORK_COLOR }}>ネットワーク部</strong>（どのネットワークか＝住所の「町名」）と、後半の{" "}
          <strong style={{ color: HOST_COLOR }}>ホスト部</strong>（そのネットワークの中のどの機器か＝「番地」）に分かれています。
          どこで分かれるかは <strong>サブネットマスク</strong> で決まり、マスクの 1 の部分がネットワーク部、0 の部分がホスト部です。
        </Typography>
        <Box sx={{ overflowX: "auto", mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            IPアドレス 192.168.1.10
          </Typography>
          <SplitBits octets={EXAMPLE} prefix={24} />
          <Typography variant="caption" color="text.secondary">
            サブネットマスク 255.255.255.0（/24）
          </Typography>
          <SplitBits octets={[255, 255, 255, 0]} prefix={24} />
        </Box>
        <Typography variant="body2" paragraph>
          この例では、左24ビット「192.168.1」がネットワーク部、残り8ビット「10」がホスト部です。同じネットワークにつながる機器は、
          192.168.1.1、192.168.1.2 … のようにホスト部だけがちがいます。ホスト部がすべて0（192.168.1.0）はネットワークそのもの、
          すべて1（192.168.1.255）はネットワーク内の全機器あて（ブロードキャスト）を表すので、機器には使えません。
        </Typography>
        <Typography variant="body2" fontWeight={700} gutterBottom>
          アドレスの種類
        </Typography>
        <Box>
          {ADDRESS_KINDS.map(([range, kind]) => (
            <Box
              key={range}
              sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, py: 0.75, borderTop: 1, borderColor: "divider" }}
            >
              <Typography variant="body2" sx={{ fontFamily: "monospace", minWidth: { sm: 260 } }}>
                {range}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {kind}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          練習問題では、答え合わせのあとに「このアドレスについて」でこれらの説明が出ます。
        </Typography>
      </Section>
    </Box>
  );
}
