/**
 * client/src/pages/student-detail.tsx
 * 교사: 학생 개별 페이지. 한 화면 스크롤 — ①미확인 메시지+인라인 답장 ②통계 1줄 ③최근 기록 ④포트폴리오.
 * 라우트: <Route path="/dashboard/:studentId" component={StudentDetail} />
 */
import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Check, Eye } from "lucide-react";
import PortfolioPage from "./portfolio"; // 기존 포트폴리오 재사용

interface Msg {
  id: string; fromUserId: string; toStudentId: string | null;
  content: string; isRead: boolean; acknowledgedAt: string | null; createdAt: string;
}

export default function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const [reply, setReply] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: thread } = useQuery<Msg[]>({
    queryKey: ["/api/messages/thread", studentId],
    queryFn: () => fetch(`/api/messages/thread/${studentId}`, { credentials: "include" }).then((r) => r.json()),
  });
  const { data: summary } = useQuery<any[]>({
    queryKey: ["/api/dashboard/students"],
    queryFn: () => fetch("/api/dashboard/students", { credentials: "include" }).then((r) => r.json()),
  });
  const me = summary?.find((s) => s.id === studentId);

  const unreadFromStudent = thread?.filter((m) => m.toStudentId === null && !m.isRead) ?? [];

  const send = useMutation({
    mutationFn: () =>
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toStudentId: studentId, content: reply }),
      }).then((r) => r.json()),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["/api/messages/thread", studentId] });
      toast({ title: "전송 완료" });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/messages/${id}/read`, { method: "POST", credentials: "include" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messages/thread", studentId] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/students"] });
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* ① 미확인 메시지 (있을 때만) + 인라인 답장 */}
      {unreadFromStudent.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">💬 새 메시지 {unreadFromStudent.length}건</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unreadFromStudent.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-2 bg-white rounded p-2 text-sm">
                <span>{m.content}</span>
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(m.id)}>읽음</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Textarea value={reply} onChange={(e) => setReply(e.target.value)}
          placeholder={`${me?.name ?? "학생"}에게 메시지 보내기`} rows={2} className="flex-1" />
        <Button onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending}>보내기</Button>
      </div>

      {/* ② 통계 요약 1줄 */}
      {me && (
        <p className="text-sm text-muted-foreground">
          기록 <b>{me.totalRecords}</b>개 · 지각 <b>{me.lateRecords}</b>개 ({me.lateRate}%) ·
          마지막 기록 {me.lastRecordAt?.slice(0, 10) ?? "없음"}
        </p>
      )}

      {/* ③ 메시지 히스토리 (접힌 최근 5개) */}
      {thread && thread.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">지난 메시지 {thread.length}건</summary>
          <div className="mt-2 space-y-1">
            {thread.slice(-5).map((m) => (
              <div key={m.id} className={`p-2 rounded ${m.toStudentId ? "bg-blue-50" : "bg-gray-50"}`}>
                <span className="text-xs text-muted-foreground mr-2">
                  {m.toStudentId ? "나 →" : "학생 →"} {m.createdAt.slice(0, 10)}
                </span>
                {m.content}
                {m.toStudentId && (
                  <span className="ml-2 text-xs">
                    {m.acknowledgedAt ? <Badge variant="outline" className="text-green-600"><Check className="w-3 h-3" />확인함</Badge>
                      : m.isRead ? <Eye className="w-3 h-3 inline text-gray-400" /> : null}
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ④ 포트폴리오 + 평어 (기존 컴포넌트 재사용, 내부에 평어 생성 버튼 포함) */}
      <PortfolioPage />
    </div>
  );
}
