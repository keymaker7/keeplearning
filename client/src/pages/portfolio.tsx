/**
 * client/src/pages/portfolio.tsx
 * 과목별 → 날짜별 학습 기록 포트폴리오 + 평어 표시.
 * 학생: 본인 기록 / 교사: ?studentId= 로 특정 학생 조회 + 평어 일괄 생성 버튼.
 * 라우트 예: <Route path="/portfolio/:studentId" component={PortfolioPage} />
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles } from "lucide-react";

interface PortfolioRecord {
  id: string; date: string; week: number; period: number;
  unit: string; content: string; reflection: string;
}

export default function PortfolioPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const { data } = useQuery<{ subjects: Record<string, PortfolioRecord[]>; totalRecords: number }>({
    queryKey: ["/api/portfolio", studentId],
    queryFn: () => fetch(`/api/portfolio/${studentId}`, { credentials: "include" }).then((r) => r.json()),
  });

  const { data: evals } = useQuery<Array<{ subject: string; content: string; createdAt: string }>>({
    queryKey: ["/api/evaluations", studentId],
    queryFn: () => fetch(`/api/evaluations?studentId=${studentId}`, { credentials: "include" }).then((r) => r.json()),
  });

  const generateAll = useMutation({
    mutationFn: () =>
      fetch("/api/evaluations/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId }),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (d) => {
      toast({ title: `${d.generated}개 과목 평어 생성 완료` });
      qc.invalidateQueries({ queryKey: ["/api/evaluations", studentId] });
    },
    onError: () => toast({ title: "평어 생성 실패", variant: "destructive" }),
  });

  const subjects = Object.keys(data?.subjects ?? {}).sort();
  const shown = activeSubject ?? subjects[0];
  const latestEval = (subject: string) =>
    evals?.filter((e) => e.subject === subject)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">나의 배움 기록 ({data?.totalRecords ?? 0}개)</h1>
        {user?.role === "teacher" && (
          <Button onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
            <Sparkles className="w-4 h-4 mr-1" />
            {generateAll.isPending ? "생성 중..." : "전과목 평어 생성"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <Badge key={s} variant={s === shown ? "default" : "outline"}
            className="cursor-pointer text-sm px-3 py-1"
            onClick={() => setActiveSubject(s)}>
            {s} ({data!.subjects[s].length})
          </Badge>
        ))}
      </div>

      {shown && (
        <>
          {latestEval(shown) && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm">📋 {shown} 평어</CardTitle></CardHeader>
              <CardContent className="text-sm">{latestEval(shown)!.content}</CardContent>
            </Card>
          )}
          <Accordion type="multiple" className="space-y-2">
            {data!.subjects[shown].map((r) => (
              <AccordionItem key={r.id} value={r.id} className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-muted-foreground w-24 shrink-0">{r.date} · {r.period}교시</span>
                    <span className="truncate">{r.unit || r.content.slice(0, 30)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm space-y-2">
                  {r.unit && <p className="text-xs text-muted-foreground">단원·주제: {r.unit}</p>}
                  <p><span className="font-medium">배운 내용:</span> {r.content}</p>
                  {r.reflection && <p><span className="font-medium">느낀 점:</span> {r.reflection}</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}
    </div>
  );
}
