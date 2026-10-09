"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Lesson from "./Lesson";
import Quiz from "./Quiz";

export default function Trainer() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2, bgcolor: "background.paper", borderRadius: 1 }}>
        <Tab label="📘 しくみ" />
        <Tab label="✏️ 練習問題" />
      </Tabs>
      {/* タブを切り替えても問題の途中経過が消えないよう、非表示にするだけにする */}
      <Box hidden={tab !== 0}>
        <Lesson />
      </Box>
      <Box hidden={tab !== 1}>
        <Quiz />
      </Box>
    </Box>
  );
}
