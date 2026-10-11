"use client";
import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddressNote, { HOST_COLOR, NETWORK_COLOR, SplitBits } from "./AddressNote";
import BitTable from "./BitTable";
import {
  LEVELS,
  QUESTIONS_PER_SET,
  type Level,
  type Question,
  formatAnswer,
  formatQuestion,
  makeQuestions,
  parseBinary8,
  parseBitCount,
  parseOctet,
  prefixOfMask,
  toBinary8,
} from "@/lib/ipv4";

/** 入力欄1つぶんの決まり */
type Field = {
  label: string;
  placeholder: string;
  maxLength: number;
  /** 入力できる文字 */
  allowed: RegExp;
  parse: (s: string) => number | null;
  expected: number;
  /** 入力欄の前に置く文字（「.」など） */
  before?: string;
  width: { xs: number; sm: number };
};

const DECIMAL_WIDTH = { xs: 68, sm: 90 };
const BINARY_WIDTH = { xs: 128, sm: 130 };
const COUNT_WIDTH = { xs: 64, sm: 72 };

function fieldsFor(q: Question): Field[] {
  if (q.level === 4) {
    const prefix = prefixOfMask(q.octets);
    const binaries: Field[] = q.octets.map((n, i) => ({
      label: `第${i + 1}オクテット（2進数）`,
      placeholder: "8けた",
      maxLength: 8,
      allowed: /[^01]/g,
      parse: parseBinary8,
      expected: n,
      width: BINARY_WIDTH,
    }));
    return [
      ...binaries,
      { label: "ネットワーク部のけた数", placeholder: "", maxLength: 2, allowed: /\D/g, parse: parseBitCount, expected: prefix, width: COUNT_WIDTH },
      { label: "ホスト部のけた数", placeholder: "", maxLength: 2, allowed: /\D/g, parse: parseBitCount, expected: 32 - prefix, width: COUNT_WIDTH },
    ];
  }
  const multi = q.octets.length > 1;
  return q.octets.map((n, i) => ({
    label: multi ? `第${i + 1}オクテット` : "答え",
    placeholder: "0〜255",
    maxLength: 3,
    allowed: /\D/g,
    parse: parseOctet,
    expected: n,
    before: i > 0 ? "." : undefined,
    width: DECIMAL_WIDTH,
  }));
}

/** 解答として記録した入力を、結果画面用の文字列にする */
function formatUserAnswer(q: Question, answer: string[]): string {
  if (q.level === 4) {
    return `${answer.slice(0, 4).join(".")}（${answer[4]} けた／${answer[5]} けた）`;
  }
  return answer.join(".");
}

type AnswerRecord = {
  question: Question;
  answer: string[];
  /** 入力欄ごとの正誤 */
  fieldOk: boolean[];
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
  const [confirmQuit, setConfirmQuit] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const question = questions[index];
  const current = records[index]; // 回答済みならある
  const fields = question ? fieldsFor(question) : [];

  function start(lv: Level) {
    const qs = makeQuestions(lv);
    setLevel(lv);
    setQuestions(qs);
    setIndex(0);
    setInputs(fieldsFor(qs[0]).map(() => ""));
    setRecords([]);
    setHint(false);
    setError("");
    setPhase("quiz");
  }

  function submit() {
    if (!question || current) return;
    const parsed = fields.map((f, i) => f.parse(inputs[i]));
    const bad = parsed.findIndex((a) => a === null);
    if (bad !== -1) {
      const f = fields[bad];
      setError(
        f.parse === parseBinary8
          ? `「${f.label}」は 0 と 1 を8けたで入力してください`
          : f.parse === parseBitCount
            ? `「${f.label}」は 0〜32 の数で入力してください`
            : "0〜255の整数を入力してください",
      );
      inputRefs.current[bad]?.focus();
      return;
    }
    setError("");
    const fieldOk = parsed.map((a, i) => a === fields[i].expected);
    const answer = inputs.map((s) => s.trim());
    setRecords([...records, { question, answer, fieldOk, correct: fieldOk.every(Boolean), usedHint: hint }]);
  }

  function finish() {
    setFinishedAt(new Date());
    setConfirmQuit(false);
    setPhase("result");
  }

  // window.confirm はブラウザや学校の環境によってはブロックされて何も起きないので、画面内のダイアログで確認する
  function quit() {
    setConfirmQuit(false);
    finish();
  }

  function next() {
    if (index + 1 >= questions.length) {
      finish();
      return;
    }
    const i = index + 1;
    setIndex(i);
    setInputs(fieldsFor(questions[i]).map(() => ""));
    setHint(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }

  function handleChange(i: number, value: string) {
    const f = fields[i];
    // 「.」を打ったら次の欄へ移る
    if (value.endsWith(".")) {
      inputRefs.current[i + 1]?.focus();
      value = value.slice(0, -1);
    }
    const v = value.replace(f.allowed, "").slice(0, f.maxLength);
    setInputs(inputs.map((s, j) => (j === i ? v : s)));
    // 10進数・2進数の欄は、けたがそろったら次の欄へ
    if (v.length === f.maxLength && f.parse !== parseBitCount && i < inputs.length - 1) inputRefs.current[i + 1]?.focus();
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
          レベルを選んでスタート。1セット {QUESTIONS_PER_SET} 問です（「やめる」を押すと、そこまでの正解率が出ます）。
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
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
    const rate = records.length === 0 ? 0 : Math.round((score / records.length) * 100);
    const quitEarly = records.length < questions.length;
    const levelInfo = LEVELS.find((l) => l.level === level)!;
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" fontWeight={700}>
          結果：{levelInfo.title}
        </Typography>
        {quitEarly && (
          <Chip label={`途中で終了（${questions.length}問中 ${records.length}問まで解答）`} color="warning" size="small" sx={{ mt: 1 }} />
        )}
        <Typography variant="h3" fontWeight={700} color="primary" sx={{ mt: 1 }}>
          正解率 {rate}%
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          {records.length === 0 ? "まだ答えた問題がありません" : `${records.length} 問中 ${score} 問正解`}
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
              <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                → <strong>{formatAnswer(r.question)}</strong>
                {!r.correct && (
                  <Box component="span" sx={{ color: "error.main", ml: 1 }}>
                    （あなたの答え：{formatUserAnswer(r.question, r.answer)}）
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
  const isMask = question.level === 4;
  const fieldBox = (i: number) => {
    const f = fields[i];
    return (
      <Box key={i} sx={{ display: "flex", alignItems: "flex-end", gap: 0.5 }}>
        {f.before && (
          <Typography fontWeight={700} fontSize="1.5rem">
            {f.before}
          </Typography>
        )}
        <TextField
          value={inputs[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={(el) => {
            inputRefs.current[i] = el;
          }}
          autoFocus={i === 0}
          placeholder={f.placeholder}
          size="small"
          error={!!current && !current.fieldOk[i]}
          slotProps={{
            htmlInput: {
              inputMode: "numeric",
              readOnly: !!current,
              "aria-label": f.label,
              style: { textAlign: "center", fontFamily: "monospace", fontSize: "1.2rem" },
            },
          }}
          sx={{ width: f.width }}
        />
      </Box>
    );
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {LEVELS.find((l) => l.level === level)!.title}　第 {index + 1} 問 / {questions.length}
        </Typography>
        <Button size="small" variant="outlined" color="warning" onClick={() => setConfirmQuit(true)} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
          やめる
        </Button>
        <Dialog open={confirmQuit} onClose={() => setConfirmQuit(false)}>
          <DialogTitle>ここでやめますか？</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              {records.length === 0
                ? "まだ1問も答えていません。このまま終わると正解率は 0% になります。"
                : `ここまでの ${records.length} 問の結果（${records.filter((r) => r.correct).length} 問正解）で正解率を表示します。`}
              {!current && records.length > 0 && " いま解いている問題は数えません。"}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmQuit(false)}>続ける</Button>
            <Button variant="contained" color="warning" onClick={quit}>
              やめて結果を見る
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
      <LinearProgress variant="determinate" value={(records.length / questions.length) * 100} sx={{ mb: 1, borderRadius: 1 }} />
      {records.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          ここまで {records.length} 問中 {records.filter((r) => r.correct).length} 問正解
        </Typography>
      )}

      <Typography variant="body1" fontWeight={700}>
        {isMask
          ? "次のサブネットマスクを2進数に直し、ネットワーク部とホスト部がそれぞれ何けたか答えよう"
          : `次の2進数を10進数に直そう${multi ? "（IPv4アドレス表記）" : ""}`}
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

      {isMask ? (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" fontWeight={700} gutterBottom>
            2進数（左から第1〜第4オクテット、8けたずつ）
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, auto)", sm: "repeat(4, auto)" },
              justifyContent: "center",
              gap: 1,
              mb: 2,
            }}
          >
            {[0, 1, 2, 3].map(fieldBox)}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" fontWeight={700} sx={{ color: NETWORK_COLOR }}>
                ネットワーク部
              </Typography>
              {fieldBox(4)}
              <Typography variant="body2">けた</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" fontWeight={700} sx={{ color: HOST_COLOR }}>
                ホスト部
              </Typography>
              {fieldBox(5)}
              <Typography variant="body2">けた</Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 0.5, mb: 1 }}>
          {fields.map((_, i) => fieldBox(i))}
        </Box>
      )}
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
          <Alert severity={current.correct ? "success" : "error"} sx={{ mb: 2, wordBreak: "break-all" }}>
            {current.correct ? "正解！" : `ざんねん… 正解は ${formatAnswer(question)} です。`}
          </Alert>
        </Box>
      )}

      {isMask && hint && !current && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={700} gutterBottom>
            ヒント
          </Typography>
          <Typography variant="body2" paragraph>
            8けたの重みは左から <strong>128・64・32・16・8・4・2・1</strong>。10進数から、大きい重みを順に引けるなら「1」、引けないなら「0」にしよう。
            255 は 11111111、0 は 00000000 です。
          </Typography>
          <Typography variant="body2">
            サブネットマスクは左から1が続きます。<strong>1の個数がネットワーク部</strong>、<strong>0の個数がホスト部</strong>のけた数で、合わせて32けたです。
          </Typography>
        </Box>
      )}

      {((hint && !isMask) || current) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={700} gutterBottom>
            {current ? "解説" : "ヒント"}
            {question.level === 3 && "：まず8けたずつに区切ると…"}
          </Typography>
          {question.level === 3 && (
            <Typography sx={{ fontFamily: "monospace", mb: 1, wordBreak: "break-all" }}>{question.octets.map(toBinary8).join(" . ")}</Typography>
          )}
          {isMask && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" gutterBottom>
                各オクテットを2進数にすると…
              </Typography>
              <SplitBits octets={question.octets} prefix={prefixOfMask(question.octets)} />
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                1 が <strong style={{ color: NETWORK_COLOR }}>{prefixOfMask(question.octets)} 個</strong> → ネットワーク部{" "}
                {prefixOfMask(question.octets)} けた、0 が <strong style={{ color: HOST_COLOR }}>{32 - prefixOfMask(question.octets)} 個</strong> →
                ホスト部 {32 - prefixOfMask(question.octets)} けた
              </Typography>
            </Box>
          )}
          {question.octets.map((n, i) => (
            <BitTable
              key={i}
              value={n}
              showSum={!!current}
              label={isMask ? `第${i + 1}オクテット：${n}` : multi ? `第${i + 1}オクテット：${toBinary8(n)}` : toBinary8(n)}
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
