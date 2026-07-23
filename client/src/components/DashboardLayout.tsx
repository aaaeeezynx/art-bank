import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Archive,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PackagePlus,
  Warehouse,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "儀表板", path: "/" },
  { icon: Archive, label: "典藏作品", path: "/artworks" },
  { icon: PackagePlus, label: "作品入庫", path: "/artworks/new" },
  { icon: Warehouse, label: "庫房管理", path: "/storage" },
];

/**
 * 判斷指定選單項目是否為啟用狀態。
 * - `/` 僅精確比對
 * - `/artworks` 在列表、詳情(`/artworks/:id`)、狀態頁(`/artworks/status/:status`)時啟用，
 *   但 `/artworks/new`（作品入庫）不啟用，避免與「作品入庫」項目同時亮起。
 * - 其他項目以精確比對或 `path + "/"` 前綴比對。
 */
function isPathActive(itemPath: string, location: string): boolean {
  if (itemPath === "/") return location === "/";
  if (itemPath === "/artworks") {
    if (location === "/artworks") return true;
    if (location === "/artworks/new") return false;
    if (location.startsWith("/artworks/status/")) return true;
    return /^\/artworks\/\d+/.test(location);
  }
  if (location === itemPath) return true;
  return location.startsWith(itemPath + "/");
}

const SIDEBAR_WIDTH_KEY = "artbank-sidebar-width";
const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 180;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full text-center">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">Art Bank</p>
            <h1 className="page-title text-2xl mb-2">典藏管理系統</h1>
            <p className="text-sm text-muted-foreground">請登入以繼續使用</p>
          </div>
          <Button
            onClick={() => { window.location.href = "/login"; }}
            className="w-full"
          >
            登入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find((item) => item.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - left;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-border/50 bg-card"
          disableTransition={isResizing}
        >
          {/* 標題 */}
          <SidebarHeader className="h-16 justify-center border-b border-border/40">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground leading-none mb-1">
                    Art Bank
                  </p>
                  <p className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-serif)" }}>
                    典藏管理系統
                  </p>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* 導覽 */}
          <SidebarContent className="gap-0 pt-3">
            <SidebarMenu className="px-2">
              {menuItems.map((item) => {
                const isActive = isPathActive(item.path, location);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal ${isActive ? "bg-primary/10 border-l-2 border-primary rounded-l-none" : ""}`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={isActive ? "text-primary font-medium" : ""}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* 使用者 */}
          <SidebarFooter className="p-3 border-t border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border border-border/60 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">{user?.name || "使用者"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* 拖曳調整寬度 */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {/* 行動端頂部列 */}
        {isMobile && (
          <div className="flex border-b border-border/50 h-14 items-center justify-between bg-card/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground leading-none">Art Bank</p>
              </div>
              <span className="text-sm font-medium" style={{ fontFamily: "var(--font-serif)" }}>
                {activeMenuItem?.label ?? "典藏管理系統"}
              </span>
            </div>
          </div>
        )}
        <main className={`flex-1 p-4 sm:p-6 ${isMobile ? "pb-24" : ""}`}>{children}</main>

        {/* 行動端底部導覽列 */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border/50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
              {menuItems.map((item) => {
                const isActive = isPathActive(item.path, location);
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    <span className={`text-[10px] font-medium tracking-wide ${
                      isActive ? "text-primary" : ""
                    }`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </SidebarInset>
    </>
  );
}
