/**
 * server/hwpxParser.ts
 * 주간학습안내 .hwpx 파일을 파싱하여 교시별 시간표(timetable JSONB)를 생성합니다.
 *
 * 의존성: npm install jszip fast-xml-parser
 *
 * 출력 형식 (weekly_materials.timetable 컬럼에 그대로 저장):
 * {
 *   "월": { "1": { subject, topic, pages, time, date }, "2": {...} },
 *   "화": { ... }, ...
 * }
 */
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export interface TimetableSlot {
  subject: string;   // 과목명 (예: "수학")
  topic: string;     // 학습 내용 (예: "(자연수)÷(자연수)의 몫을 분수로...")
  pages: string;     // 교과서 쪽수 (예: "10-11(6-7)쪽")
  time: string;      // "09:00~09:40"
  date: string;      // "2026-03-04" (ISO)
  isEvent: boolean;  // 행사/자율 여부 (◆시업식 등 — 학생 기록 불필요 항목)
}

export interface ParsedWeeklyPlan {
  title: string;                 // "3월 3일 - 3월 6일(1주)"
  week: number;                  // 1
  startDate: string;             // "2026-03-03"
  endDate: string;               // "2026-03-06"
  classRoom: string;             // "6학년 7반"
  subjects: string[];            // 이번 주 등장 과목 목록
  timetable: Record<string, Record<string, TimetableSlot>>; // 요일 → 교시 → 슬롯
  notices: string[];             // 가정통신/행사
}

const DAY_NAMES = ["월", "화", "수", "목", "금"];
const EXCLUDED_SUBJECTS = new Set(["자율", "자 율", "행사"]);

interface Cell { row: number; col: number; colSpan: number; rowSpan: number; text: string }

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** hp:tc 셀 내부의 문단들을 줄바꿈으로 합칩니다. */
function cellText(tc: any): string {
  const paras = asArray(tc?.["hp:subList"]?.["hp:p"]);
  const lines: string[] = [];
  for (const p of paras) {
    const runs = asArray(p?.["hp:run"]);
    let line = "";
    for (const run of runs) {
      for (const t of asArray(run?.["hp:t"])) {
        if (typeof t === "string") line += t;
        else if (t && typeof t === "object" && "#text" in t) line += t["#text"];
      }
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join("\n");
}

/** 테이블을 (row,col) 그리드로 변환합니다. */
function tableToGrid(tbl: any): Cell[] {
  const cells: Cell[] = [];
  for (const tr of asArray(tbl?.["hp:tr"])) {
    for (const tc of asArray(tr?.["hp:tc"])) {
      const addr = tc?.["hp:cellAddr"] ?? {};
      const span = tc?.["hp:cellSpan"] ?? {};
      cells.push({
        row: Number(addr["@_rowAddr"] ?? 0),
        col: Number(addr["@_colAddr"] ?? 0),
        colSpan: Number(span["@_colSpan"] ?? 1),
        rowSpan: Number(span["@_rowSpan"] ?? 1),
        text: cellText(tc),
      });
    }
  }
  return cells;
}

function findCell(cells: Cell[], row: number, col: number): Cell | undefined {
  return cells.find((c) => c.row === row && c.col === col);
}

/** "3월 3일 - 3월 6일(1주)" → { week, startDate, endDate } */
function parseTitle(title: string, year: number) {
  const week = Number(title.match(/\((\d+)주\)/)?.[1] ?? 0);
  const dates = Array.from(title.matchAll(/(\d+)월\s*(\d+)일/g)).map(
    (m) => `${year}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`
  );
  return { week, startDate: dates[0] ?? "", endDate: dates[1] ?? dates[0] ?? "" };
}

/** "월 (2일)" 헤더에서 날짜(일) 추출. 시작일 기준으로 월 경계 보정. */
function resolveDate(startDate: string, dayLabel: string): string {
  const m = dayLabel.match(/\((\d+)일\)/);
  if (!m || !startDate) return "";
  const day = Number(m[1]);
  const start = new Date(startDate + "T00:00:00");
  const d = new Date(start);
  d.setDate(day);
  if (d < start) d.setMonth(d.getMonth() + 1); // 3월30일~4월3일처럼 월이 넘어가는 주
  return d.toISOString().slice(0, 10);
}

/**
 * hwpx 버퍼를 파싱합니다.
 * @param buffer  multer 등으로 받은 파일 버퍼
 * @param year    시간표 연도 (기본: 현재 연도)
 */
export async function parseHwpxTimetable(buffer: Buffer, year = new Date().getFullYear()): Promise<ParsedWeeklyPlan> {
  const zip = await JSZip.loadAsync(buffer);
  const sectionFile = zip.file("Contents/section0.xml");
  if (!sectionFile) throw new Error("hwpx 형식이 아닙니다 (Contents/section0.xml 없음)");
  const xml = await sectionFile.async("string");

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);

  // 문서 내 모든 hp:tbl 수집 (중첩 포함)
  const tables: any[] = [];
  (function walk(node: any) {
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (k === "hp:tbl") asArray(v).forEach((t) => { tables.push(t); walk(t); });
      else asArray(v).forEach(walk);
    }
  })(doc);

  // 시간표 테이블 선택: "교시" 텍스트가 있고 행 수가 가장 큰 테이블
  let grid: Cell[] | null = null;
  let best = -1;
  for (const tbl of tables) {
    const cells = tableToGrid(tbl);
    const rows = Math.max(...cells.map((c) => c.row), 0) + 1;
    const hasPeriod = cells.some((c) => c.text.includes("교시"));
    if (hasPeriod && rows > best) { best = rows; grid = cells; }
  }
  if (!grid) throw new Error("시간표 테이블을 찾을 수 없습니다");

  // row0: 제목 / row1: 요일 헤더 / row2: 행사 / row3+: 교시별 3행 묶음(과목·내용·쪽수)
  const title = findCell(grid, 0, 0)?.text ?? "";
  const { week, startDate, endDate } = parseTitle(title, year);
  const classRoom = (findCell(grid, 0, 5)?.text ?? "").replace(/^.*학교\s*/, "");

  // 요일 헤더 → 컬럼 매핑 (colSpan 가변 대응: 요일 셀의 col 위치가 곧 데이터 컬럼)
  const dayCols: { day: string; col: number; date: string }[] = [];
  for (const c of grid.filter((c) => c.row === 1 && c.text)) {
    const day = DAY_NAMES.find((d) => c.text.startsWith(d));
    if (day) dayCols.push({ day, col: c.col, date: resolveDate(startDate, c.text) });
  }

  // "대체공휴일" 등 세로 병합된 휴일 컬럼 감지 (row2에서 rowSpan이 큰 셀)
  const holidayCols = new Set(
    grid.filter((c) => c.row === 2 && c.rowSpan > 5).map((c) => c.col)
  );

  // 교시 행 찾기: col0 텍스트가 "N교시"인 행
  const periodRows = grid
    .filter((c) => c.col === 0 && /(\d+)교시/.test(c.text))
    .map((c) => ({
      period: Number(c.text.match(/(\d+)교시/)![1]),
      time: c.text.match(/\((\d{2}:\d{2}~\d{2}:\d{2})\)/)?.[1] ?? "",
      row: c.row,
    }));

  const timetable: Record<string, Record<string, TimetableSlot>> = {};
  const subjectSet = new Set<string>();

  for (const { day, col, date } of dayCols) {
    if (holidayCols.has(col)) continue; // 공휴일 컬럼 스킵
    timetable[day] = {};
    for (const { period, time, row } of periodRows) {
      const subjectRaw = findCell(grid, row, col)?.text ?? "";
      const subject = subjectRaw.replace(/\s+/g, "");
      if (!subject) continue;
      const topic = (findCell(grid, row + 1, col)?.text ?? "").trim();
      const pagesRaw = (findCell(grid, row + 2, col)?.text ?? "").trim();
      const isEvent = EXCLUDED_SUBJECTS.has(subject) || topic.startsWith("◆");
      timetable[day][String(period)] = {
        subject, topic,
        pages: pagesRaw === "***" ? "" : pagesRaw,
        time, date, isEvent,
      };
      if (!isEvent) subjectSet.add(subject);
    }
  }

  // 가정통신/행사 공지
  const notices = grid
    .filter((c) => c.row >= 2 && c.col >= 1 && c.text.startsWith("♠"))
    .map((c) => c.text);
  const eventRow = grid.find((c) => c.row === 2 && c.col === 0 && c.text === "행사");
  if (eventRow) {
    for (const { col } of dayCols) {
      const t = findCell(grid, 2, col)?.text;
      if (t && t.length > 1 && !t.includes("\n대\n")) notices.push(t);
    }
  }

  return {
    title, week, startDate, endDate, classRoom,
    subjects: Array.from(subjectSet).sort(),
    timetable, notices,
  };
}
