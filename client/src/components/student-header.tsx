import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationBell from "@/components/notification-bell";
import { Loader2 } from "lucide-react";

interface StudentHeaderProps {
  title?: string;
  onLogout: () => void;
  logoutPending?: boolean;
}

export default function StudentHeader({
  title = "📚 주간학습 평어 시스템",
  onLogout,
  logoutPending,
}: StudentHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-primary">{title}</h1>
            <div className="hidden md:flex space-x-2">
              <Badge variant="secondary">학생</Badge>
              <span className="text-sm text-muted-foreground">{user?.name}님</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={onLogout} disabled={logoutPending}>
              {logoutPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "로그아웃"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
