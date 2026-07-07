import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, PenTool, Calendar, Save, Send, CalendarDays, Grid3X3, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StudentHeader from "@/components/student-header";

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState("1");
  const [viewMode, setViewMode] = useState("weekly"); // "weekly" or "daily"
  const [selectedDay, setSelectedDay] = useState("월");
  const [learningRecords, setLearningRecords] = useState<Record<string, { content: string; reflection: string; unit?: string; activity?: string }>>({});
  const [dailyRecords, setDailyRecords] = useState<Record<string, Record<number, { subject: string; unit: string; content: string; reflection: string }>>>({});

  // Fetch data
  const { data: weeklyMaterials = [] } = useQuery<any[]>({
    queryKey: ["/api/weekly-materials"],
  });

  const { data: myRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/learning-records"],
  });

  // 주간학습 자료가 로드되면 첫 번째 주차로 자동 설정
  useEffect(() => {
    if (weeklyMaterials.length > 0 && !weeklyMaterials.find((m: any) => String(m.week) === selectedWeek)) {
      setSelectedWeek(String(weeklyMaterials[0].week));
    }
  }, [weeklyMaterials]);

  // 요일별/주간별 데이터 조회
  const { data: weeklyRecords = [] } = useQuery({
    queryKey: ["/api/learning-records/weekly", selectedWeek, viewMode === "daily" ? selectedDay : null],
    queryFn: () => {
      const params = new URLSearchParams({ week: selectedWeek });
      if (viewMode === "daily" && selectedDay) {
        params.append("dayOfWeek", selectedDay);
      }
      return fetch(`/api/learning-records/weekly?${params}`)
        .then(res => res.json());
    },
  });

  // 시간표 정보 조회
  const { data: timetableInfo } = useQuery<any>({
    queryKey: ["/api/weekly-materials/timetable", selectedWeek],
    enabled: viewMode === "daily" && !!selectedWeek,
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
    { name: "도덕", icon: "💝", description: "바른 마음가짐" },
    { name: "실과", icon: "🔨", description: "실생활과 관련된 기능" },
    { name: "체육", icon: "⚽", description: "건강한 몸과 마음" },
    { name: "음악", icon: "🎵", description: "아름다운 소리와 리듬" },
    { name: "미술", icon: "🎨", description: "창의적 표현" },
    { name: "영어", icon: "🔤", description: "외국어 소통" },
  ];

  const daysOfWeek = ["월", "화", "수", "목", "금", "토"];
  const periods = [1, 2, 3, 4, 5, 6];

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      "국어": "subject-korean",
      "수학": "subject-math", 
      "과학": "subject-science",
      "사회": "subject-social",
    };
    return colors[subject] || "bg-gray-50 border-gray-200 text-gray-800";
  };

  // 시간표에서 특정 요일/교시의 정보를 가져오는 함수
  const getTimetableInfo = (dayOfWeek: string, period: number) => {
    if (!timetableInfo?.timetable) return { subject: "", unit: "" };
    return timetableInfo.timetable[dayOfWeek]?.[period] || { subject: "", unit: "" };
  };

  // 일별 기록 업데이트 함수
  const updateDailyRecord = (dayOfWeek: string, period: number, field: string, value: string) => {
    setDailyRecords(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [period]: {
          ...prev[dayOfWeek]?.[period],
          [field]: value
        }
      }
    }));
  };

  // 일별 기록 가져오기 함수
  const getDailyRecord = (dayOfWeek: string, period: number, field: keyof { subject: string; unit: string; content: string; reflection: string }) => {
    return dailyRecords[dayOfWeek]?.[period]?.[field] || "";
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

  // 요일별 기록 저장 함수
  const handleSaveDailyRecord = (dayOfWeek: string, period: number, isSubmitted = false) => {
    const record = dailyRecords[dayOfWeek]?.[period];
    if (!record?.subject || !record?.content) {
      toast({
        title: "입력 오류",
        description: "과목과 배운 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const recordData = {
      subject: record.subject,
      content: record.content,
      reflection: record.reflection || "",
      unit: record.unit || "",
      week: parseInt(selectedWeek),
      dayOfWeek,
      period,
      isSubmitted,
    };

    saveLearningRecordMutation.mutate(recordData);
  };

  const handleSaveRecord = (subject: string, isSubmitted = false, dayOfWeek?: string, period?: number) => {
    const recordKey = viewMode === "daily" ? `${subject}-${dayOfWeek}-${period}` : subject;
    const record = learningRecords[recordKey];
    
    if (!record?.content) {
      toast({
        title: "저장 실패",
        description: "학습 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const recordData: any = {
      subject,
      content: record.content,
      reflection: record.reflection,
      week: parseInt(selectedWeek),
      isSubmitted,
      submittedAt: isSubmitted ? new Date() : null,
    };

    // 요일별 보기일 때 추가 정보 포함
    if (viewMode === "daily" && dayOfWeek && period) {
      recordData.dayOfWeek = dayOfWeek;
      recordData.period = period;
      recordData.unit = record.unit;
      recordData.activity = record.activity;
    }

    saveLearningRecordMutation.mutate(recordData);
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader
        onLogout={() => logoutMutation.mutate()}
        logoutPending={logoutMutation.isPending}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">나의 주간 배움 기록</h2>
          <p className="text-muted-foreground">이번 주 학습 내용을 과목별로 정리해보세요</p>
        </div>

        {/* Weekly Materials Info */}
        {weeklyMaterials.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-blue-100">
                <FileText className="h-5 w-5" />
                <span>이번 주 학습 안내</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weeklyMaterials.map((material: any) => (
                  <div key={material.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{material.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {material.week}주차 | {material.startDate} ~ {material.endDate}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week Selection & View Mode */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">{selectedWeek}주차 학습 기록</h3>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === "weekly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("weekly")}
                    data-testid="button-weekly-view"
                  >
                    <Grid3X3 className="mr-2 h-4 w-4" />
                    주단위 보기
                  </Button>
                  <Button
                    variant={viewMode === "daily" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("daily")}
                    data-testid="button-daily-view"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    요일별 보기
                  </Button>
                </div>
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger className="w-64" data-testid="select-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weeklyMaterials.length > 0 ? (
                      weeklyMaterials.map((material: any) => (
                        <SelectItem key={material.id} value={String(material.week)}>
                          {material.week}주차 ({material.startDate} - {material.endDate})
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="1">1주차 (9월 1일 - 9월 7일)</SelectItem>
                        <SelectItem value="2">2주차 (9월 8일 - 9월 14일)</SelectItem>
                        <SelectItem value="3">3주차 (9월 15일 - 9월 21일)</SelectItem>
                        <SelectItem value="4">4주차 (9월 22일 - 9월 28일)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주단위 보기 */}
        {viewMode === "weekly" && (
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
        )}

        {/* 요일별 보기 */}
        {viewMode === "daily" && (
          <div className="space-y-6">
            {/* 요일 선택 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">요일별 시간표 - {selectedDay}요일</h3>
                </div>
                <div className="flex space-x-2">
                  {daysOfWeek.map((day) => (
                    <Button
                      key={day}
                      variant={selectedDay === day ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDay(day)}
                      data-testid={`button-day-${day}`}
                    >
                      {day}요일
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 교시별 학습 기록 */}
            <div className="grid gap-4">
              {periods.map((period) => (
                <Card key={period}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{period}교시</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>과목</Label>
                        <Input
                          value={getTimetableInfo(selectedDay, period)?.subject || getDailyRecord(selectedDay, period, "subject")}
                          onChange={(e) => updateDailyRecord(selectedDay, period, "subject", e.target.value)}
                          placeholder="과목을 입력하세요"
                          data-testid={`input-subject-${selectedDay}-${period}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>단원/학습주제</Label>
                        <Input 
                          value={getTimetableInfo(selectedDay, period)?.unit || getDailyRecord(selectedDay, period, "unit")}
                          onChange={(e) => updateDailyRecord(selectedDay, period, "unit", e.target.value)}
                          placeholder="단원 또는 학습주제를 입력하세요"
                          data-testid={`input-unit-${selectedDay}-${period}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>배운 내용</Label>
                      <Textarea
                        className="resize-none"
                        rows={3}
                        value={getDailyRecord(selectedDay, period, "content")}
                        onChange={(e) => updateDailyRecord(selectedDay, period, "content", e.target.value)}
                        placeholder="이 시간에 배운 내용을 자세히 적어주세요..."
                        data-testid={`textarea-content-${selectedDay}-${period}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>느낀 점</Label>
                      <Textarea
                        className="resize-none"
                        rows={2}
                        value={getDailyRecord(selectedDay, period, "reflection")}
                        onChange={(e) => updateDailyRecord(selectedDay, period, "reflection", e.target.value)}
                        placeholder="어려웠던 점이나 재미있었던 점을 적어주세요..."
                        data-testid={`textarea-reflection-${selectedDay}-${period}`}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSaveDailyRecord(selectedDay, period, false)}
                        disabled={saveLearningRecordMutation.isPending}
                        data-testid={`button-save-${selectedDay}-${period}`}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        저장
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSaveDailyRecord(selectedDay, period, true)}
                        disabled={saveLearningRecordMutation.isPending}
                        data-testid={`button-submit-${selectedDay}-${period}`}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        제출
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

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
