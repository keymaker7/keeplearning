/**
 * client/src/pages/daily-record.tsx
 * 학생용: 오늘의 교시별 시간표가 카드로 뜨고, 각 교시에 배운 내용을 기록.
 * wouter 라우트 예: <Route path="/daily-record" component={DailyRecordPage} />
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import StudentHeader from "@/components/student-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";

interface PeriodSlot {
  period: number;
  subject: string;
  topic: string;
  pages: string;
  time: string;
  isEvent: boolean;
  myRecord: { id: string; content: string; reflection: string } | null;
}

const SUBJECT_COLORS: Record<string, string> = {
  국어: "bg-red-100 text-red-800", 수학: "bg-blue-100 text-blue-800",
  사회: "bg-amber-100 text-amber-800", 과학: "bg-green-100 text-green-800",
  영어: "bg-purple-100 text-purple-800", 도덕: "bg-pink-100 text-pink-800",
  실과: "bg-orange-100 text-orange-800", 체육: "bg-cyan-100 text-cyan-800",
  음악: "bg-violet-100 text-violet-800", 미술: "bg-rose-100 text-rose-800",
};

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DailyRecordPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { logoutMutation } = useAuth();
  const { data, isLoading } = useQuery<{
    date: string; dayOfWeek: string; week: number; weeklyMaterialId: string; periods: PeriodSlot[];
  }>({ queryKey: ["/api/timetable/today", date], queryFn: () =>
    fetch(`/api/timetable/today?date=${date}`, { credentials: "include" }).then((r) => r.json()),
  });

  const done = data?.periods.filter((p) => !p.isEvent && p.myRecord).length ?? 0;
  const total = data?.periods.filter((p) => !p.isEvent).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader
        title="📅 오늘의 배움 기록"
        onLogout={() => logoutMutation.mutate()}
        logoutPending={logoutMutation.isPending}
      />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft /></Button>
        <div className="text-center">
          <h1 className="text-xl font-bold">{date} ({data?.dayOfWeek ?? ""})</h1>
          {total > 0 && <p className="text-sm text-muted-foreground">오늘의 기록 {done}/{total}</p>}
        </div>
        <Button variant="ghost" size="icon" disabled={date >= new Date().toISOString().slice(0, 10)}
          onClick={() => setDate(shiftDate(date, 1))}><ChevronRight /></Button>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">불러오는 중...</p>}
      {!isLoading && (!data?.periods || data.periods.length === 0) && (
        <p className="text-center text-muted-foreground py-8">이 날짜의 시간표가 없어요.</p>
      )}
      {data?.periods.map((slot) => (
        <PeriodCard key={slot.period} slot={slot} week={data.week} dayOfWeek={data.dayOfWeek}
          weeklyMaterialId={data.weeklyMaterialId} date={date} />
      ))}
      </div>
    </div>
  );
}

function PeriodCard({ slot, week, dayOfWeek, weeklyMaterialId, date }: {
  slot: PeriodSlot; week: number; dayOfWeek: string; weeklyMaterialId: string; date: string;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(slot.myRecord?.content ?? "");
  const [reflection, setReflection] = useState(slot.myRecord?.reflection ?? "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () =>
      fetch("/api/learning-records/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          weeklyMaterialId, week, dayOfWeek, period: slot.period,
          subject: slot.subject, unit: slot.topic, content, reflection, date,
        }),
      }).then((r) => { if (!r.ok) throw new Error("저장 실패"); return r.json(); }),
    onSuccess: () => {
      toast({ title: `${slot.period}교시 ${slot.subject} 기록 저장 완료!` });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["/api/timetable/today", date] });
    },
    onError: () => toast({ title: "저장에 실패했어요", variant: "destructive" }),
  });

  if (slot.isEvent) {
    return (
      <Card className="opacity-60">
        <CardContent className="py-3 flex items-center gap-3">
          <span className="text-sm font-semibold w-12">{slot.period}교시</span>
          <Badge variant="secondary">{slot.subject}</Badge>
          <span className="text-sm text-muted-foreground">{slot.topic || "행사/자율 활동"}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={slot.myRecord ? "border-green-300" : ""}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <CardTitle className="flex items-center gap-3 text-base">
          {slot.myRecord ? <CheckCircle2 className="text-green-500 w-5 h-5" /> : <Circle className="text-gray-300 w-5 h-5" />}
          <span className="w-12">{slot.period}교시</span>
          <Badge className={SUBJECT_COLORS[slot.subject] ?? "bg-gray-100 text-gray-800"}>{slot.subject}</Badge>
          <span className="text-sm font-normal text-muted-foreground truncate flex-1">{slot.topic}</span>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {slot.pages && <p className="text-xs text-muted-foreground">교과서 {slot.pages}</p>}
          <div>
            <label className="text-sm font-medium">오늘 배운 내용</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="이 시간에 무엇을 배웠나요? 새로 알게 된 것을 써 보세요." rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium">느낀 점 (선택)</label>
            <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)}
              placeholder="재미있었던 점, 어려웠던 점" rows={2} />
          </div>
          <Button onClick={() => save.mutate()} disabled={!content.trim() || save.isPending} className="w-full">
            {save.isPending ? "저장 중..." : slot.myRecord ? "수정하기" : "기록하기"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
