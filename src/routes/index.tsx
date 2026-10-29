import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Upload, Clapperboard, FolderOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, Logo, Panel, StatusBadge, PROJECT_STATUS_LABEL } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatDate, TASK_KIND_LABEL, TASK_STATUS_LABEL } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VibNest — Dịch video, phụ đề và lồng tiếng AI" },
      { name: "description", content: "Tải video lên, nhận dạng lời nói, chỉnh phụ đề, dịch và lồng tiếng AI ngay trên điện thoại." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  return user ? (
    <AppShell>
      <Dashboard />
    </AppShell>
  ) : (
    <Landing />
  );
}

function Landing() {
  const steps = [
    ["Tải video", "Chọn tệp từ điện thoại/máy tính hoặc dán liên kết tệp video công khai."],
    ["Phụ đề", "AI nhận dạng lời nói kèm mốc thời gian, bạn chỉnh sửa và xuất SRT."],
    ["Dịch", "Dịch tự nhiên theo ngữ cảnh, có từ điển thuật ngữ riêng."],
    ["Lồng tiếng", "Tạo giọng đọc AI, phối với âm thanh gốc và nghe thử."],
  ];
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth" search={{ redirect: undefined }}>Đăng nhập</Link>
        </Button>
      </header>
      <section className="flex flex-1 flex-col justify-center py-12">
        <p className="mb-3 text-sm font-medium text-primary">VibNest Studio</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Dịch và lồng tiếng video bằng AI, ngay trên điện thoại.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Tải video của bạn, tạo phụ đề, dịch sang tiếng Việt, Anh, Trung, Nhật, Hàn và tạo giọng đọc AI — tất cả trong một phòng làm việc.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ redirect: undefined }}>
              Bắt đầu miễn phí <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {steps.map(([t, d], i) => (
            <div key={t} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4">
              <div className="text-xs font-medium text-primary">Bước {i + 1}</div>
              <div className="mt-1 font-medium">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="text-xs text-muted-foreground">
        VibNest chỉ xử lý video bạn có quyền sử dụng. Không vượt qua DRM hay giới hạn quyền riêng tư của nền tảng.
      </footer>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const projects = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id,name,status,updated_at").order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });
  const tasks = useQuery({
    queryKey: ["tasks", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("id,kind,status,created_at").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });
  const actions = [
    { to: "/upload", label: "Tải video", desc: "Từ thiết bị hoặc liên kết", icon: Upload },
    { to: "/upload", label: "Sửa video", desc: "Mở phòng làm việc", icon: Clapperboard },
    { to: "/library", label: "Thư viện", desc: "Dự án và tệp của bạn", icon: FolderOpen },
  ] as const;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Xin chào{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Bắt đầu một dự án mới hoặc tiếp tục công việc.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.to + a.label} to={a.to} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-md transition-all hover:bg-accent/40 active:scale-[0.99]">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <a.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium">{a.label}</span>
              <span className="block text-xs text-muted-foreground">{a.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-medium">Dự án gần đây</h2>
          {projects.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : projects.error ? (
            <p className="text-sm text-destructive">Không tải được danh sách dự án.</p>
          ) : projects.data?.length ? (
            <ul className="divide-y divide-border/60">
              {projects.data.map((p) => (
                <li key={p.id}>
                  <Link to="/upload" className="flex items-center justify-between gap-2 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(p.updated_at)}</span>
                    </span>
                    <StatusBadge status={p.status} label={PROJECT_STATUS_LABEL[p.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có dự án. Hãy tải video đầu tiên.</p>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 font-medium">Tác vụ gần đây</h2>
          {tasks.data?.length ? (
            <ul className="divide-y divide-border/60">
              {tasks.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <span>{TASK_KIND_LABEL[t.kind] ?? t.kind}</span>
                  <StatusBadge status={t.status} label={TASK_STATUS_LABEL[t.status]} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{tasks.isLoading ? "Đang tải…" : "Chưa có tác vụ."}</p>
          )}
        </Panel>
      </div>
    </div>
  );
  }
      
