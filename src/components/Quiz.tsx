"use client";
import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddressNote from "./AddressNote";
import BitTable from "./BitTable";
import {
  LEVELS,
  QUESTIONS_PER_SET,
  type Level,
  type Question,
  formatAnswer,
  formatQuestion,
  makeQuestions,
  parseOctet,
  toBinary8,
} from "@/lib/ipv4";

type AnswerRecord = {
  question: Question;
  answer: (number | null)[];
  correct: boolean;
  usedHint: boolean;
};

type Phase = "menu" | "quiz" | "result";

export default function Quiz() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [level, setLevel] = useState<Level>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [inputs, setInputs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const question = questions[index];
  const current = records[index]; // 回答済みならある

  function start(lv: Level) {
    const qs = makeQuestions(lv);
    setLevel(lv);
    setQuestions(qs);
    setIndex(0);
    setInputs(qs[0].octets.map(() => ""));
    setRecords([]);
    setHint(false);
    setError("");
    setPhase("quiz");
  }

  function submit() {
    if (!question || current) return;
    const answer = inputs.map(parseOctet);
    const bad = answer.findIndex((a) => a === null);
    if (bad !== -1) {
      setError("0〜255の整数を入力してください");
      inputRefs.current[bad]?.focus();
      return;
    }
    setError("");
    const correct = answer.every((a, i) => a === question.octets[i]);
    setRecords([...records, { question, answer, correct, usedHint: hint }]);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinishedAt(new Date());
      setPhase("result");
      return;
    }
    const i = index + 1;
    setIndex(i);
    setInputs(questions[i].octets.map(() => ""));
    setHint(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }

  function handleChange(i: number, value: string) {
    // 「.」を打ったら次の欄へ移る
    if (value.endsWith(".")) {
      inputRefs.current[i + 1]?.focus();
      value = value.slice(0, -1);
    }
    const v = value.replace(/\D/g, "").slice(0, 3);
    setInputs(inputs.map((s, j) => (j === i ? v : s)));
    if (v.length === 3 && i < inputs.length - 1) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (current) next();
    else submit();
  }

  if (phase === "menu") {
    return (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          レベルを選んでスタート。1セット {QUESTIONS_PER_SET} 問です。
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
          {LEVELS.map((l) => (
            <Card key={l.level}>
              <CardActionArea onClick={() => start(l.level)} sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {l.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {l.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  if (phase === "result") {
    const score = records.filter((r) => r.correct).length;
    const levelInfo = LEVELS.find((l) => l.level === level)!;
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" fontWeight={700}>
          結果：{levelInfo.title}
        </Typography>
        <Typography variant="h3" fontWeight={700} color="primary" sx={{ my: 1 }}>
          {score} / {records.length} 問正解
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          ヒント使用：{records.filter((r) => r.usedHint).length} 問　／　{finishedAt?.toLocaleString("ja-JP")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          この画面をスクリーンショットして提出してください（結果はどこにも保存されません）。
        </Typography>
        <Box sx={{ overflowX: "auto" }}>
          {records.map((r, i) => (
            <Box
              key={i}
              sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75, borderTop: 1, borderColor: "divider", minWidth: 0, flexWrap: "wrap" }}
            >
              <Chip size="small" label={r.correct ? "○" : "×"} color={r.correct ? "success" : "error"} />
              <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", flex: "1 1 260px" }}>
                {formatQuestion(r.question)}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                → <strong>{formatAnswer(r.question)}</strong>
                {!r.correct && (
                  <Box component="span" sx={{ color: "error.main", ml: 1 }}>
                    （あなたの答え：{r.answer.join(".")}）
                  </Box>
                )}
                {r.usedHint && (
                  <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>
                    ヒント
                  </Box>
                )}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
          <Button variant="contained" onClick={() => start(level)}>
            同じレベルでもう一度
          </Button>
          <Button variant="outlined" onClick={() => setPhase("menu")}>
            レベル選択にもどる
          </Button>
        </Box>
      </Paper>
    );
  }

  const multi = question.octets.length > 1;
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {LEVELS.find((l) => l.level === level)!.title}　第 {index + 1} 問 / {questions.length}
        </Typography>
        <Button size="small" onClick={() => setPhase("menu")}>
          やめる
        </Button>
      </Box>
      <LinearProgress variant="determinate" value={(records.length / questions.length) * 100} sx={{ mb: 2, borderRadius: 1 }} />

      <Typography variant="body1" fontWeight={700}>
        次の2進数を10進数に直そう{multi && "（IPv4アドレス表記）"}
      </Typography>
      <Box
        sx={{
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: question.level === 3 ? { xs: "0.95rem", sm: "1.5rem" } : { xs: "1.1rem", sm: "1.8rem" },
          letterSpacing: { xs: 0, sm: "0.05em" },
          my: 2,
          p: 1.5,
          borderRadius: 1,
          bgcolor: "#f5f5f5",
          textAlign: "center",
          wordBreak: "break-all",
        }}
      >
        {formatQuestion(question)}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 0.5, mb: 1 }}>
        {inputs.map((v, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "flex-end", gap: 0.5 }}>
            <TextField
              value={v}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={handleKeyDown}
              inputRef={(el) => {
                inputRefs.current[i] = el;
              }}
              autoFocus={i === 0}
              disabled={!!current}
              placeholder="0〜255"
              size="small"
              error={!!current && current.answer[i] !== question.octets[i]}
              slotProps={{
                htmlInput: {
                  inputMode: "numeric",
                  "aria-label": multi ? `第${i + 1}オクテット` : "答え",
                  style: { textAlign: "center", fontFamily: "monospace", fontSize: "1.2rem" },
                },
              }}
              sx={{ width: { xs: 68, sm: 90 } }}
            />
            {i < inputs.length - 1 && (
              <Typography fontWeight={700} fontSize="1.5rem">
                .
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {!current ? (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
          <Button variant="outlined" onClick={() => setHint(true)} disabled={hint}>
            ヒント
          </Button>
          <Button variant="contained" onClick={submit}>
            答え合わせ
          </Button>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Alert severity={current.correct ? "success" : "error"} sx={{ mb: 2 }}>
            {current.correct ? "正解！" : `ざんねん… 正解は ${formatAnswer(question)} です。`}
          </Alert>
        </Box>
      )}

      {(hint || current) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={700} gutterBottom>
            {current ? "解説" : "ヒント"}
            {question.level === 3 && "：まず8けたずつに区切ると…"}
          </Typography>
          {question.level === 3 && (
            <Typography sx={{ fontFamily: "monospace", mb: 1, wordBreak: "break-all" }}>{question.octets.map(toBinary8).join(" . ")}</Typography>
          )}
          {question.octets.map((n, i) => (
            <BitTable
              key={i}
              value={n}
              showSum={!!current}
              label={multi ? `第${i + 1}オクテット：${toBinary8(n)}` : toBinary8(n)}
            />
          ))}
          {!current && (
            <Typography variant="body2" color="text.secondary">
              1 が立っているけたの重みをたし算しよう。
            </Typography>
          )}
          {current && <AddressNote octets={question.octets} />}
        </Box>
      )}

      {current && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Button variant="contained" onClick={next} autoFocus>
            {index + 1 >= questions.length ? "結果を見る" : "次の問題"}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
