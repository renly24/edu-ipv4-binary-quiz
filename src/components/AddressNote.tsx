import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { describeAddress, describeOctet, toBinary8 } from "@/lib/ipv4";

export const NETWORK_COLOR = "#1565c0";
export const HOST_COLOR = "#ef6c00";

/** 32ビットを、ネットワーク部とホスト部で色分けして表示する */
export function SplitBits({ octets, prefix }: { octets: number[]; prefix: number }) {
  const bits = octets.map(toBinary8).join("");
  return (
    <Box sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: { xs: "0.8rem", sm: "1rem" }, wordBreak: "break-all" }}>
      {bits.split("").map((bit, i) => (
        <span key={i}>
          <span style={{ color: i < prefix ? NETWORK_COLOR : HOST_COLOR }}>{bit}</span>
          {i % 8 === 7 && i < 31 && "."}
        </span>
      ))}
    </Box>
  );
}

/** 答え合わせ後に、そのアドレス（または値）がどんなものかを説明する */
export default function AddressNote({ octets }: { octets: number[] }) {
  if (octets.length === 1) {
    const note = describeOctet(octets[0]);
    if (!note) return null;
    return (
      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "#fff8e1", mb: 1.5 }}>
        <Typography variant="body2">💡 {note}</Typography>
      </Box>
    );
  }

  const info = describeAddress(octets);
  return (
    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "#fff8e1", mb: 1.5 }}>
      <Typography variant="body2" fontWeight={700} gutterBottom>
        💡 このアドレスについて
      </Typography>
      <Chip label={info.kind} size="small" color="secondary" sx={{ mb: 1, height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.25 } }} />
      <Typography variant="body2" paragraph>
        {info.description}
      </Typography>
      <SplitBits octets={octets} prefix={info.prefix} />
      <Box sx={{ display: "flex", gap: 2, my: 0.5 }}>
        <Typography variant="caption" sx={{ color: NETWORK_COLOR, fontWeight: 700 }}>
          ■ ネットワーク部
        </Typography>
        <Typography variant="caption" sx={{ color: HOST_COLOR, fontWeight: 700 }}>
          ■ ホスト部
        </Typography>
      </Box>
      <Typography variant="body2">{info.parts}</Typography>
    </Box>
  );
}
