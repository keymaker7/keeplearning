/**
 * client/src/components/notification-bell.tsx
 * 학생 헤더용: 종 아이콘 + 미읽음 배지 + 드롭다운("확인했어요" 버튼, 선생님께 메시지 보내기).
 * 헤더에 <NotificationBell /> 추가.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Bell, Check } from "lucide-react";

interface Msg { id: string; content: string; isRead: boolean; acknowledgedAt: string | null; createdAt: string }

export default function NotificationBell() {
  const [compose, setCompose] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: msgs } = useQuery<Msg[]>({
    queryKey: ["/api/messages/mine"],
    queryFn: () => fetch("/api/messages/mine", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 30000,
  });
  const unread = msgs?.filter((m) => !m.isRead).length ?? 0;

  const ack = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/messages/${id}/ack`, { method: "POST", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/messages/mine"] }),
  });

  const send = useMutation({
    mutationFn: () =>
      fetch("/api/messages/to-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: compose }),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { setCompose(""); toast({ title: "선생님께 전송했어요" }); },
    onError: () => toast({ title: "전송 실패", variant: "destructive" }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <Badge variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs">{unread}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <p className="font-semibold text-sm">선생님 메시지</p>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {(!msgs || msgs.length === 0) && (
            <p className="text-sm text-muted-foreground">받은 메시지가 없어요.</p>
          )}
          {msgs?.map((m) => (
            <div key={m.id} className={`p-2 rounded text-sm ${m.isRead ? "bg-gray-50" : "bg-amber-50"}`}>
              <p>{m.content}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{m.createdAt.slice(0, 10)}</span>
                {m.acknowledgedAt ? (
                  <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />확인함</span>
                ) : (
                  <Button size="sm" variant="outline" className="h-6 text-xs"
                    onClick={() => ack.mutate(m.id)}>확인했어요</Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-2 space-y-2">
          <Textarea value={compose} onChange={(e) => setCompose(e.target.value)}
            placeholder="선생님께 메시지 보내기" rows={2} />
          <Button size="sm" className="w-full" disabled={!compose.trim() || send.isPending}
            onClick={() => send.mutate()}>보내기</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
