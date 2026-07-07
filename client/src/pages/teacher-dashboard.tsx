/**
 * client/src/pages/teacher-dashboard.tsx
 * 교사: 24명 카드 그리드. 미확인 메시지 배지 우선 정렬. PC 기준 4열.
 * 라우트: <Route path="/dashboard" component={TeacherDashboard} />
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StudentSummary {
  id: string; name: string; studentNumber: string;
  unreadMessages: number; totalRecords: number;
  lateRecords: number; lateRate: number; lastRecordAt: string | null;
}

export default function TeacherDashboard() {
  const [, navigate] = useLocation();
  const { data: list } = useQuery<StudentSummary[]>({
    queryKey: ["/api/dashboard/students"],
    queryFn: () => fetch("/api/dashboard/students", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 30000,
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">우리 반 배움 대시보드</h1>
      <div className="grid grid-cols-4 gap-3">
        {list?.map((s) => (
          <Card key={s.id}
            className={`cursor-pointer hover:shadow-md transition ${s.unreadMessages > 0 ? "border-red-300 bg-red-50" : ""}`}
            onClick={() => navigate(`/dashboard/${s.id}`)}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.studentNumber}번 {s.name}</span>
                {s.unreadMessages > 0 && (
                  <Badge variant="destructive">💬 {s.unreadMessages}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                기록 {s.totalRecords}개 · 지각률 {s.lateRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                마지막: {s.lastRecordAt ? s.lastRecordAt.slice(0, 10) : "없음"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
