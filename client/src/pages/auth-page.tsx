import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "",
    studentNumber: "",
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = { ...registerForm };
    if (formData.role !== "student") {
      formData.studentNumber = "";
    }
    registerMutation.mutate(formData);
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-screen">
          {/* Left side - Forms */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-primary">📚 주간학습 평어 시스템</h1>
                <p className="text-muted-foreground">
                  효행초등학교 5학년 7반 학습 관리 시스템
                </p>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" data-testid="tab-login">로그인</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">회원가입</TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                  <Card>
                    <CardHeader>
                      <CardTitle>로그인</CardTitle>
                      <CardDescription>
                        아이디와 비밀번호를 입력해주세요
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-username">아이디</Label>
                          <Input
                            id="login-username"
                            data-testid="input-login-username"
                            type="text"
                            value={loginForm.username}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="아이디를 입력하세요"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">비밀번호</Label>
                          <Input
                            id="login-password"
                            data-testid="input-login-password"
                            type="password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="비밀번호를 입력하세요"
                            required
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isLoading}
                          data-testid="button-login"
                        >
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          로그인
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                  <Card>
                    <CardHeader>
                      <CardTitle>회원가입</CardTitle>
                      <CardDescription>
                        새 계정을 만들어주세요
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-role">역할</Label>
                          <Select 
                            value={registerForm.role} 
                            onValueChange={(value) => setRegisterForm(prev => ({ ...prev, role: value }))}
                          >
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="역할을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="teacher" data-testid="option-teacher">교사</SelectItem>
                              <SelectItem value="student" data-testid="option-student">학생</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="register-name">이름</Label>
                          <Input
                            id="register-name"
                            data-testid="input-register-name"
                            type="text"
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="이름을 입력하세요"
                            required
                          />
                        </div>

                        {registerForm.role === "student" && (
                          <div className="space-y-2">
                            <Label htmlFor="register-student-number">학번</Label>
                            <Input
                              id="register-student-number"
                              data-testid="input-student-number"
                              type="text"
                              value={registerForm.studentNumber}
                              onChange={(e) => setRegisterForm(prev => ({ ...prev, studentNumber: e.target.value }))}
                              placeholder="학번을 입력하세요 (예: 2025001)"
                              required
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="register-username">아이디</Label>
                          <Input
                            id="register-username"
                            data-testid="input-register-username"
                            type="text"
                            value={registerForm.username}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="아이디를 입력하세요"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="register-password">비밀번호</Label>
                          <Input
                            id="register-password"
                            data-testid="input-register-password"
                            type="password"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="비밀번호를 입력하세요"
                            required
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isLoading}
                          data-testid="button-register"
                        >
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          회원가입
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right side - Hero */}
          <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg">
            <div className="text-center space-y-6 p-8">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-3xl font-bold text-primary">
                스마트한 학습 관리
              </h2>
              <p className="text-lg text-muted-foreground max-w-md">
                주간 학습 기록을 체계적으로 관리하고 
                AI 기반 평어 생성으로 효율적인 
                학생 평가를 지원합니다.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-4 bg-card rounded-lg border border-border">
                  <div className="text-2xl mb-2">📚</div>
                  <h3 className="font-semibold">주간 학습 기록</h3>
                  <p className="text-sm text-muted-foreground">
                    과목별 체계적 기록
                  </p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <div className="text-2xl mb-2">🤖</div>
                  <h3 className="font-semibold">AI 평어 생성</h3>
                  <p className="text-sm text-muted-foreground">
                    자동 평가 작성
                  </p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <div className="text-2xl mb-2">👥</div>
                  <h3 className="font-semibold">학생 관리</h3>
                  <p className="text-sm text-muted-foreground">
                    효율적인 학급 운영
                  </p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold">학습 분석</h3>
                  <p className="text-sm text-muted-foreground">
                    데이터 기반 관리
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
