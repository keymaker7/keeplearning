import { useAuth } from "@/hooks/use-auth";
import TeacherDashboard from "@/components/teacher-dashboard";
import StudentDashboard from "@/components/student-dashboard";

export default function HomePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return user.role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />;
}
