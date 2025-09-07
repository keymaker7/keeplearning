import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface EvaluationRequest {
  studentName: string;
  subject: string;
  learningRecords: Array<{
    week: number;
    content: string;
    reflection: string;
  }>;
}

export async function generateEvaluation(request: EvaluationRequest): Promise<string> {
  try {
    const { studentName, subject, learningRecords } = request;
    
    const recordsText = learningRecords
      .map(record => `${record.week}주차: ${record.content} | 소감: ${record.reflection}`)
      .join('\n');

    const prompt = `
다음은 초등학교 5학년 학생 "${studentName}"의 "${subject}" 과목 주간 학습 기록입니다.

학습 기록:
${recordsText}

위 학습 기록을 바탕으로 다음 조건에 맞는 평어를 작성해주세요:
1. 최대 2개 문장으로 구성
2. 학생의 구체적인 학습 내용과 성장 모습을 반영
3. 초등학교 생활기록부에 적합한 격식 있는 문체
4. 학생의 긍정적인 면과 발전 가능성을 강조
5. 한국어로 작성

JSON 형식으로 응답해주세요: { "evaluation": "평어 내용" }
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "당신은 초등학교 교사로서 학생들의 학습 기록을 바탕으로 생활기록부 평어를 작성하는 전문가입니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.evaluation || "평어 생성에 실패했습니다.";
  } catch (error) {
    console.error("OpenAI API 오류:", error);
    throw new Error("AI 평어 생성 중 오류가 발생했습니다.");
  }
}

export async function extractSubjectsFromPDF(content: string): Promise<string[]> {
  try {
    const prompt = `
다음은 초등학교 주간학습 안내 문서의 내용입니다:

${content}

이 문서에서 언급된 교과목들을 추출해주세요. 
일반적인 초등학교 교과목: 국어, 수학, 과학, 사회, 도덕, 실과, 체육, 음악, 미술, 영어

JSON 형식으로 응답해주세요: { "subjects": ["과목1", "과목2", ...] }
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "당신은 교육 문서 분석 전문가입니다. 주어진 문서에서 교과목을 정확히 추출해주세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.subjects || [];
  } catch (error) {
    console.error("과목 추출 오류:", error);
    return ["국어", "수학", "과학", "사회"]; // 기본 과목들
  }
}
