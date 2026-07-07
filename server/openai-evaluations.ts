/**
 * server/openai-evaluations.ts
 * 학생 학습 기록 → NEIS 교과별 평어 생성.
 * 기존 openai.ts의 generateEvaluation을 대체/보완합니다.
 */
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SubjectEvaluationRequest {
  studentName: string;
  subject: string;
  records: Array<{ week: number; unit: string; content: string; reflection: string }>;
}

const SYSTEM_PROMPT = `당신은 초등학교 6학년 담임교사입니다. 학생의 실제 학습 기록을 근거로 NEIS 생활기록부 '교과학습발달상황' 평어를 작성합니다.

작성 원칙:
1. 반드시 학습 기록에 나타난 구체적 단원/활동/개념을 근거로 작성 (일반론 금지)
2. '~함', '~임', '~보임' 등 개조식 종결어미 사용 (NEIS 표준)
3. 2~3문장, 공백 포함 200자 이내
4. 학생 이름을 평어 본문에 쓰지 않음 (NEIS 규정)
5. 성취 수준 + 태도/성장 가능성을 균형 있게 서술
6. 부정 표현 대신 발전 방향으로 서술`;

export async function generateSubjectEvaluation(req: SubjectEvaluationRequest): Promise<string> {
  const { studentName, subject, records } = req;

  // 기록을 단원별로 그룹핑해 프롬프트 압축
  const byUnit: Record<string, string[]> = {};
  for (const r of records) {
    const key = r.unit || `${r.week}주차`;
    const line = r.reflection ? `${r.content} (소감: ${r.reflection})` : r.content;
    (byUnit[key] ??= []).push(line);
  }
  const recordsText = Object.entries(byUnit)
    .map(([unit, lines]) => `[${unit}]\n- ${lines.join("\n- ")}`)
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `과목: ${subject}\n학생: ${studentName} (본문에는 이름 미기재)\n\n학습 기록:\n${recordsText}\n\nJSON으로 응답: { "evaluation": "평어" }`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 500,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  if (!result.evaluation) throw new Error("평어 생성 실패");
  return result.evaluation;
}
