import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { WEIGHTS, bitsOf } from "@/lib/ipv4";

type Props = {
  value: number;
  /** true のとき、1 の位の重みと合計を表示する */
  showSum?: boolean;
  label?: string;
};

/** 1オクテットを「重み」と「ビット」の表で表す */
export default function BitTable({ value, showSum = true, label }: Props) {
  const bits = bitsOf(value);
  const used = WEIGHTS.filter((_, i) => bits[i] === 1);

  return (
    <Box sx={{ mb: 1.5 }}>
      {label && (
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {label}
        </Typography>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gap: 0.5,
          maxWidth: 440,
        }}
      >
        {WEIGHTS.map((w, i) => {
          const on = bits[i] === 1;
          return (
            <Box
              key={w}
              sx={{
                textAlign: "center",
                borderRadius: 1,
                border: 1,
                borderColor: on ? "primary.main" : "divider",
                bgcolor: on ? "#e3f2fd" : "background.paper",
                py: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
                {w}
              </Typography>
              <Typography fontFamily="monospace" fontWeight={700} color={on ? "primary.main" : "text.disabled"}>
                {bits[i]}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {showSum && (
        <Typography variant="body2" sx={{ mt: 0.5, fontFamily: "monospace" }}>
          {used.length === 0 ? "0" : used.join(" + ")} = <strong>{value}</strong>
        </Typography>
      )}
    </Box>
  );
}
