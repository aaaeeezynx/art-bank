import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Mail, Lock, User } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const handleAuthSuccess = async () => {
    await utils.auth.me.invalidate();
    setLocation("/");
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("登入成功");
      handleAuthSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("註冊並登入成功");
      handleAuthSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error("請填寫 Email 與密碼");
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      toast.error("請填寫所有欄位");
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      toast.error("兩次輸入的密碼不一致");
      return;
    }
    registerMutation.mutate({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* 標題 */}
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
            Art Bank
          </p>
          <h1 className="page-title text-2xl">典藏管理系統</h1>
          <p className="text-sm text-muted-foreground mt-1">請登入以繼續使用</p>
        </div>

        <div className="elegant-card p-6 space-y-5">
          {/* Email/Password 登入與註冊 */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登入</TabsTrigger>
              <TabsTrigger value="register">註冊</TabsTrigger>
            </TabsList>

            {/* 登入 */}
            <TabsContent value="login" className="space-y-3 mt-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="pl-9 bg-background"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">密碼</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••"
                      className="pl-9 bg-background"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      登入中…
                    </>
                  ) : (
                    "登入"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 註冊 */}
            <TabsContent value="register" className="space-y-3 mt-4">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">姓名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="您的姓名"
                      className="pl-9 bg-background"
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="pl-9 bg-background"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">密碼（至少 6 碼）</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••"
                      className="pl-9 bg-background"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm">確認密碼</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-confirm"
                      type="password"
                      value={registerForm.confirm}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, confirm: e.target.value }))}
                      placeholder="••••••"
                      className="pl-9 bg-background"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      註冊中…
                    </>
                  ) : (
                    "註冊並登入"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
