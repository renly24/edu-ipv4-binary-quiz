import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Trainer from "@/components/Trainer";

export default function Home() {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default", py: { xs: 1.5, sm: 2 } }}>
      <Container maxWidth="md">
        <Box textAlign="center" mb={1.5}>
          <Typography variant="h5" component="h1" fontWeight={700} sx={{ fontSize: { xs: "1.3rem", sm: "1.6rem" } }}>
            🔢 IPv4アドレス 2進数 → 10進数 変換ドリル
          </Typography>
          <Typography variant="body2" color="text.secondary">
            コンピュータが扱う32ビットの2進数を、ふだん見る「192.168.1.1」の形に直す練習をしよう
          </Typography>
        </Box>
        <Trainer />
      </Container>
    </Box>
  );
}
