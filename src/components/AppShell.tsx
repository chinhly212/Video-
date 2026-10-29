import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Home, Clapperboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// 3 Tab điều hướng chính theo yêu cầu
const TABS = [
  { to: "/", label: "Trang chủ", icon: Home },
  { to: "/upload", label: "Sửa video", icon: Clapperboard },
  { to: "/settings", label: "Cài đặt", icon: Settings },
] as const;

function isActive(path: string, to: string) {
  return to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        V
      </span>
      <span className="text-foreground">VibNest</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Header cố định phía trên */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {TABS.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent/60 hover:text-accent-foreground",
                  isActive(path, tab.to) && "bg-accent/90 font-medium text-accent-foreground shadow-xs",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Nội dung trang: chừa khoảng đệm dưới chân để không bị thanh điều hướng che */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 md:pb-24">
        {children}
      </main>

      {/* Thanh điều hướng 3 tab Liquid Glass lơ lửng ở đáy màn hình */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 safe-bottom">
        <nav
          aria-label="Điều hướng chính"
          className={cn(
            "pointer-events-auto flex items-center gap-1 sm:gap-2 rounded-full px-2 py-1.5",
            // Hiệu ứng kính lỏng (Liquid Glass) tinh tế phù hợp tông trắng - xanh lá nhạt
            "bg-white/70 dark:bg-card/75 backdrop-blur-xl border border-white/60 dark:border-white/10",
            "shadow-[0_12px_36px_-10px_rgba(34,197,94,0.18),0_4px_16px_rgba(0,0,0,0.06)]",
          )}
        >
          {TABS.map((tab) => {
            const active = isActive(path, tab.to);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-300 select-none",
                  active
                    ? "bg-primary/15 text-primary font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    active && "scale-110 stroke-[2.25]",
                  )}
                />
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-primary/80" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md p-4 sm:p-5 shadow-xs", className)}>
      {children}
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-warning/20 text-warning-foreground dark:text-warning",
  done: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  canceled: "bg-muted text-muted-foreground line-through",
  draft: "bg-muted text-muted-foreground",
  uploaded: "bg-accent text-accent-foreground",
  transcribed: "bg-accent text-accent-foreground",
  translated: "bg-accent text-accent-foreground",
  dubbed: "bg-success/15 text-success",
  ready: "bg-success/15 text-success",
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  uploaded: "Đã tải lên",
  transcribed: "Đã có bản chép lời",
  translated: "Đã dịch",
  dubbed: "Đã lồng tiếng",
  ready: "Sẵn sàng",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[status] ?? "bg-muted")}>
      {label ?? status}
    </span>
  );
  }
