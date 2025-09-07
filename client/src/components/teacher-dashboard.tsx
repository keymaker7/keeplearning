import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Upload, Users, FileText, PenTool, Settings, Plus, Download, Eye, Trash2, KeyRound, UserPlus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@shared/schema";

export default function TeacherDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bulkStudents, setBulkStudents] = useState("");

  // Fetch data
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: weeklyMaterials = [] } = useQuery<any[]>({
    queryKey: ["/api/weekly-materials"],
  });

  const { data: stats } = useQuery<{ totalStudents: number; submittedThisWeek: number; currentWeek: number; evaluationsGenerated: number }>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Mutations
  const generateEvaluationMutation = useMutation({
    mutationFn: async (data: { studentId: string; subject: string }) => {
      const res = await apiRequest("POST", "/api/evaluations/generate", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "평어 생성 완료",
        description: "AI 평어가 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "평어 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkCreateStudentsMutation = useMutation({
    mutationFn: async (students: Array<{ name: string; studentNumber: string; username: string; password: string }>) => {
      const res = await apiRequest("POST", "/api/students/bulk", { students });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "학생 일괄 생성 완료",
        description: "학생 계정들이 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setShowBulkDialog(false);
      setBulkStudents("");
    },
    onError: (error: Error) => {
      toast({
        title: "학생 일괄 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { studentId: string; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/students/${data.studentId}/reset-password`, {
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "비밀번호 초기화 완료",
        description: "학생의 비밀번호가 성공적으로 초기화되었습니다.",
      });
      setShowPasswordDialog(false);
      setSelectedStudent(null);
    },
    onError: (error: Error) => {
      toast({
        title: "비밀번호 초기화 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const res = await apiRequest("DELETE", `/api/students/${studentId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "학생 삭제 완료",
        description: "학생이 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: Error) => {
      toast({
        title: "학생 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const subjects = ["국어", "수학", "과학", "사회", "도덕", "실과", "체육", "음악", "미술", "영어"];

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      "국어": "bg-red-50 border-red-200 text-red-800",
      "수학": "bg-blue-50 border-blue-200 text-blue-800",
      "과학": "bg-purple-50 border-purple-200 text-purple-800",
      "사회": "bg-green-50 border-green-200 text-green-800",
      "영어": "bg-yellow-50 border-yellow-200 text-yellow-800",
      "음악": "bg-indigo-50 border-indigo-200 text-indigo-800",
      "미술": "bg-pink-50 border-pink-200 text-pink-800",
      "체육": "bg-orange-50 border-orange-200 text-orange-800",
    };
    return colors[subject] || "bg-gray-50 border-gray-200 text-gray-800";
  };

  const handleBulkCreate = () => {
    if (!bulkStudents.trim()) {
      toast({
        title: "입력 오류",
        description: "학생 정보를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const lines = bulkStudents.trim().split('\n');
      const students = lines.map(line => {
        const [name, studentNumber, username, password] = line.split(',').map(s => s.trim());
        if (!name || !studentNumber || !username || !password) {
          throw new Error(`잘못된 형식: ${line}`);
        }
        return { name, studentNumber, username, password };
      });

      bulkCreateStudentsMutation.mutate(students);
    } catch (error: any) {
      toast({
        title: "형식 오류",
        description: error.message || "CSV 형식을 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = (password: string) => {
    if (!selectedStudent) return;
    resetPasswordMutation.mutate({
      studentId: selectedStudent.id,
      newPassword: password,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary">📚 주간학습 평어 시스템</h1>
              <div className="hidden md:flex space-x-2">
                <Badge variant="default">교사</Badge>
                <span className="text-sm text-muted-foreground">{user?.name}님</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                {logoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "로그아웃"
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-card border-r border-border min-h-screen">
          <nav className="p-4 space-y-2">
            {[
              { id: "dashboard", icon: "📊", label: "대시보드" },
              { id: "students", icon: "👥", label: "학생 관리" },
              { id: "materials", icon: "📄", label: "주간학습 자료" },
              { id: "evaluations", icon: "✏️", label: "평어 관리" },
            ].map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Dashboard View */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">대시보드</h2>
                <p className="text-muted-foreground">5학년 7반 주간학습 현황</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">전체 학생</p>
                        <p className="text-2xl font-bold">{students.length}명</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">이번주 제출</p>
                        <p className="text-2xl font-bold">{stats?.submittedThisWeek || 0}명</p>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">업로드된 자료</p>
                        <p className="text-2xl font-bold">{weeklyMaterials.length}개</p>
                      </div>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">진행 주차</p>
                        <p className="text-2xl font-bold">{stats?.currentWeek || 1}주차</p>
                      </div>
                      <PenTool className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>최근 업로드된 자료</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weeklyMaterials.slice(0, 3).map((material: any) => (
                        <div key={material.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                          <div>
                            <p className="font-medium">{material.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {material.week}주차 ({material.startDate} - {material.endDate})
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            보기
                          </Button>
                        </div>
                      ))}
                      {weeklyMaterials.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          아직 업로드된 자료가 없습니다.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>학생 현황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {students.slice(0, 5).map((student: any) => (
                        <div key={student.id} className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.studentNumber}</p>
                          </div>
                          <Badge variant={student.isActive ? "default" : "secondary"}>
                            {student.isActive ? "활성" : "비활성"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Students Management */}
          {activeTab === "students" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">학생 관리</h2>
                  <p className="text-muted-foreground">5학년 7반 학생 명단 및 계정 관리</p>
                </div>
                <div className="flex space-x-2">
                  <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-bulk-add-students">
                        <UserPlus className="mr-2 h-4 w-4" />
                        일괄 생성
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>학생 일괄 생성</DialogTitle>
                        <DialogDescription>
                          CSV 형식으로 여러 학생을 한번에 생성할 수 있습니다.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>CSV 데이터 입력</Label>
                          <p className="text-sm text-muted-foreground mb-2">
                            형식: 이름,학번,아이디,비밀번호 (한 줄에 하나씩)
                          </p>
                          <Textarea
                            placeholder="홍길동,2025001,student001,password123
김영희,2025002,student002,password456
이철수,2025003,student003,password789"
                            value={bulkStudents}
                            onChange={(e) => setBulkStudents(e.target.value)}
                            rows={8}
                            className="font-mono text-sm"
                            data-testid="textarea-bulk-students"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowBulkDialog(false)}
                          >
                            취소
                          </Button>
                          <Button
                            onClick={handleBulkCreate}
                            disabled={bulkCreateStudentsMutation.isPending}
                            data-testid="button-create-bulk-students"
                          >
                            {bulkCreateStudentsMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            생성하기
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button data-testid="button-add-student">
                    <Plus className="mr-2 h-4 w-4" />
                    학생 추가
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>학생 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.studentNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={student.isActive ? "default" : "secondary"}>
                            {student.isActive ? "활성" : "비활성"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowPasswordDialog(true);
                            }}
                            data-testid={`button-reset-password-${student.id}`}
                          >
                            <KeyRound className="mr-1 h-3 w-3" />
                            비밀번호 초기화
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-1 h-3 w-3" />
                            편집
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`${student.name} 학생을 삭제하시겠습니까?`)) {
                                deleteStudentMutation.mutate(student.id);
                              }
                            }}
                            data-testid={`button-delete-${student.id}`}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        등록된 학생이 없습니다.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Password Reset Dialog */}
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>비밀번호 초기화</DialogTitle>
                    <DialogDescription>
                      {selectedStudent?.name} 학생의 비밀번호를 초기화합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>새 비밀번호</Label>
                      <Input
                        type="password"
                        placeholder="새 비밀번호를 입력하세요"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              handlePasswordReset(target.value.trim());
                            }
                          }
                        }}
                        data-testid="input-new-password"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordDialog(false)}
                      >
                        취소
                      </Button>
                      <Button
                        onClick={() => {
                          const input = document.querySelector('[data-testid="input-new-password"]') as HTMLInputElement;
                          if (input?.value.trim()) {
                            handlePasswordReset(input.value.trim());
                          }
                        }}
                        disabled={resetPasswordMutation.isPending}
                        data-testid="button-confirm-password-reset"
                      >
                        {resetPasswordMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        초기화
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Weekly Materials */}
          {activeTab === "materials" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">주간학습 자료 관리</h2>
                <p className="text-muted-foreground">주간학습 안내 파일 업로드 및 관리</p>
              </div>

              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle>새 주간학습 자료 업로드</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>제목</Label>
                      <Input placeholder="주간학습 자료 제목" data-testid="input-material-title" />
                    </div>
                    <div className="space-y-2">
                      <Label>주차</Label>
                      <Input type="number" placeholder="4" data-testid="input-material-week" />
                    </div>
                    <div className="space-y-2">
                      <Label>시작일</Label>
                      <Input type="date" data-testid="input-start-date" />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일</Label>
                      <Input type="date" data-testid="input-end-date" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>파일 업로드</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">PDF 파일을 드래그하거나 클릭하여 업로드</p>
                      <p className="text-sm text-muted-foreground">최대 10MB까지 지원</p>
                      <Button className="mt-4" data-testid="button-select-file">
                        파일 선택
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button data-testid="button-upload-material">업로드</Button>
                    <Button variant="outline">취소</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Materials List */}
              <Card>
                <CardHeader>
                  <CardTitle>업로드된 자료</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weeklyMaterials.map((material: any) => (
                      <div key={material.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                        <div className="flex items-center space-x-4">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{material.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {material.week}주차 | {material.startDate} - {material.endDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            다운로드
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            미리보기
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))}
                    {weeklyMaterials.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        업로드된 자료가 없습니다.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Evaluations */}
          {activeTab === "evaluations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">평어 관리</h2>
                <p className="text-muted-foreground">누적된 학습 기록을 바탕으로 과목별 평어 생성 및 관리</p>
              </div>

              {/* Generation Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>평어 생성</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>대상 학생</Label>
                      <Select>
                        <SelectTrigger data-testid="select-target-student">
                          <SelectValue placeholder="학생 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 학생</SelectItem>
                          {students.map((student: any) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>과목 선택</Label>
                      <Select>
                        <SelectTrigger data-testid="select-subject">
                          <SelectValue placeholder="과목 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 과목</SelectItem>
                          {subjects.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>기간</Label>
                      <Select>
                        <SelectTrigger data-testid="select-period">
                          <SelectValue placeholder="기간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 기간</SelectItem>
                          <SelectItem value="recent4">최근 4주</SelectItem>
                          <SelectItem value="recent8">최근 8주</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      disabled={generateEvaluationMutation.isPending}
                      data-testid="button-generate-evaluation"
                    >
                      {generateEvaluationMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PenTool className="mr-2 h-4 w-4" />
                      )}
                      AI 평어 생성
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Student Evaluations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {students.slice(0, 2).map((student: any) => (
                  <Card key={student.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                            {student.name.charAt(0)}
                          </div>
                          <h3 className="text-lg font-semibold">{student.name}</h3>
                        </div>
                        <Button variant="outline" size="sm">
                          전체 보기
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {subjects.slice(0, 3).map((subject) => (
                        <div key={subject} className={`p-3 rounded-lg border-2 ${getSubjectColor(subject)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{subject}</span>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                                편집
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 px-2 text-xs"
                                onClick={() => generateEvaluationMutation.mutate({
                                  studentId: student.id,
                                  subject
                                })}
                                disabled={generateEvaluationMutation.isPending}
                              >
                                🤖
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {subject === "국어" && student.name === students[0]?.name ? 
                              "대화의 특성을 정확하게 파악하고 상대방의 마음에 공감하며 대화하는 능력이 우수함. 작품을 읽을 때 자신의 경험과 연결하여 깊이 있게 이해하고 창의적으로 표현할 수 있음." :
                              "아직 평어가 생성되지 않았습니다. AI 평어 생성 버튼을 클릭해주세요."
                            }
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
