import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, PenTool, Calendar, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState("4");
  const [learningRecords, setLearningRecords] = useState<Record<string, { content: string; reflection: string }>>({});

  // Fetch data
  const { data: weeklyMaterials = [] } = useQuery({
    queryKey: ["/api/weekly-materials"],
  });

  const { data: myRecords = [] } = useQuery({
    queryKey: ["/api/learning-records"],
  });

  // Mutations
  const saveLearningRecordMutation = useMutation({
    mutationFn: async (recordData: any) => {
      const res = await apiRequest("POST", "/api/learning-records", recordData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "학습 기록 저장 완료",
        description: "주간 배움 기록이 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-records"] });
    },
    onError: (error: Error) => {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const subjects = [
    { name: "국어", icon: "📚", description: "함께 공감하며 대화하는 방법을 안다" },
    { name: "수학", icon: "🔢", description: "분수의 곱셈" },
    { name: "과학", icon: "🔬", description: "생태계를 이루고 있는 요소" },
    { name: "사회", icon: "🌏", description: "여러 나라의 교류한 삼국과 가야를 알아봅시다" },
  ];

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      "국어": "subject-korean",
      "수학": "subject-math", 
      "과학": "subject-science",
      "사회": "subject-social",
    };
    return colors[subject] || "bg-gray-50 border-gray-200 text-gray-800";
  };

  const handleRecordChange = (subject: string, field: "content" | "reflection", value: string) => {
    setLearningRecords(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: value
      }
    }));
  };

  const handleSaveRecord = (subject: string, isSubmitted = false) => {
    const record = learningRecords[subject];
    if (!record?.content) {
      toast({
        title: "저장 실패",
        description: "학습 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    saveLearningRecordMutation.mutate({
      subject,
      content: record.content,
      reflection: record.reflection,
      week: parseInt(selectedWeek),
      isSubmitted,
      submittedAt: isSubmitted ? new Date() : null,
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
                <Badge variant="secondary">학생</Badge>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">나의 주간 배움 기록</h2>
          <p className="text-muted-foreground">이번 주 학습 내용을 과목별로 정리해보세요</p>
        </div>

        {/* Week Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">{selectedWeek}주차 학습 기록</h3>
              </div>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-48" data-testid="select-week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4주차 (9월 8일 - 9월 12일)</SelectItem>
                  <SelectItem value="3">3주차 (9월 1일 - 9월 5일)</SelectItem>
                  <SelectItem value="2">2주차 (8월 25일 - 8월 29일)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Learning Record Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjects.map((subject) => {
            const record = learningRecords[subject.name] || { content: "", reflection: "" };
            const isKoreanWithSample = subject.name === "국어" && selectedWeek === "4";
            const isMathWithSample = subject.name === "수학" && selectedWeek === "4";

            return (
              <Card key={subject.name}>
                <CardHeader className={`${getSubjectColor(subject.name)} border-b border-border`}>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{subject.icon}</span>
                    <span>{subject.name}</span>
                  </CardTitle>
                  <p className="text-sm mt-1 opacity-80">{subject.description}</p>
                </CardHeader>
                
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>이번 주 배운 내용</Label>
                    <Textarea
                      className="resize-none"
                      rows={3}
                      placeholder={`${subject.name} 시간에 배운 내용을 적어주세요...`}
                      value={isKoreanWithSample ? "대화할 때 상대방의 감정을 이해하고 공감하는 방법을 배웠어요. 친구의 고민을 들어주고 적절한 조언을 해주는 것이 중요하다는 것을 알았습니다." : 
                             isMathWithSample ? "분수와 자연수의 곱셈 방법을 배웠어요. 분자에 자연수를 곱하고 분모는 그대로 두는 것을 알았습니다. 그리고 결과를 약분하는 방법도 연습했어요." :
                             record.content}
                      onChange={(e) => handleRecordChange(subject.name, "content", e.target.value)}
                      data-testid={`textarea-content-${subject.name}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>느낀 점이나 어려웠던 점</Label>
                    <Textarea
                      className="resize-none"
                      rows={2}
                      placeholder="어떤 점이 좋았는지, 어려웠는지 적어주세요..."
                      value={isKoreanWithSample ? "친구의 마음을 이해하려고 노력하는 것이 쉽지 않았지만, 상대방의 입장에서 생각해보니 더 좋은 대화를 할 수 있었어요." :
                             isMathWithSample ? "처음에는 약분하는 것이 어려웠는데, 연습을 많이 하니까 쉬워졌어요. 실생활 문제를 풀 때 분수 곱셈을 사용할 수 있다는 것이 신기했습니다." :
                             record.reflection}
                      onChange={(e) => handleRecordChange(subject.name, "reflection", e.target.value)}
                      data-testid={`textarea-reflection-${subject.name}`}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveRecord(subject.name, false)}
                      disabled={saveLearningRecordMutation.isPending}
                      data-testid={`button-save-${subject.name}`}
                    >
                      <Save className="mr-1 h-3 w-3" />
                      임시저장
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveRecord(subject.name, true)}
                      disabled={saveLearningRecordMutation.isPending}
                      data-testid={`button-submit-${subject.name}`}
                    >
                      <Send className="mr-1 h-3 w-3" />
                      제출
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            size="lg"
            disabled={saveLearningRecordMutation.isPending}
            data-testid="button-save-all"
          >
            {saveLearningRecordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            전체 임시 저장
          </Button>
          <Button
            size="lg"
            disabled={saveLearningRecordMutation.isPending}
            data-testid="button-submit-all"
          >
            {saveLearningRecordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            전체 제출하기
          </Button>
        </div>

        {/* Previous Records */}
        <Card>
          <CardHeader>
            <CardTitle>이전 주차 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myRecords.length > 0 ? (
                myRecords.slice(0, 3).map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div>
                      <p className="font-medium">{record.week}주차 - {record.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.isSubmitted ? "제출 완료" : "임시 저장"} • {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`button-view-record-${record.id}`}>
                      보기
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    아직 작성된 학습 기록이 없습니다.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    위의 양식을 작성하여 첫 번째 학습 기록을 남겨보세요!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
