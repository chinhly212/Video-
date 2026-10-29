import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileVideo, Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { readVideoMeta } from "@/lib/media";
import { createTask, currentUserId, errMsg, logError, signedUrl, updateTask, uploadWithProgress } from "@/lib/client-data";
import { MAX_UPLOAD_BYTES, VIDEO_EXT, formatBytes, formatDate, formatDuration } from "@/lib/constants";
import { UNSUPPORTED_PLATFORMS } from "@/lib/url-check";
import { importVideoUrl, inspectVideoUrl } from "@/lib/import.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Tải video — VibNest" },
      { name: "description", content: "Tải video từ thiết bị hoặc liên kết tệp video công khai." },
    ],
  }),
  component: UploadPage,
});

type Picked = { file: File; url: string; duration: number | null; width?: number; height?: number; canPreview: boolean };

function UploadPage() {
  return (
    <div className="grid gap-5">
      <PageHeader title="Sửa & Tải video" desc="Chọn video bạn có quyền sử dụng để tạo phụ đề, dịch và lồng tiếng." />
      <div className="grid gap-5 lg:grid-cols-2">
        <FileUploader />
        <UrlImporter />
      </div>
      <InputVideos />
    </div>
  );
}

function FileUploader() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url); }, [picked]);

  const onPick = async (file?: File) => {
    setError(null);
    setDoneId(null);
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!file.type.startsWith("video/") && !VIDEO_EXT.includes(ext))
      return setError("Tệp này không phải video. Hỗ trợ: " + VIDEO_EXT.join(", ").toUpperCase() + ".");
    if (file.size > MAX_UPLOAD_BYTES) return setError(`Tệp quá lớn (${formatBytes(file.size)}). Giới hạn là 200 MB.`);
    if (file.size === 0) return setError("Tệp trống.");
    const meta = await readVideoMeta(file);
    const canPreview = document.createElement("video").canPlayType(file.type || "video/mp4") !== "";
    setPicked({ file, url: URL.createObjectURL(file), ...meta, canPreview });
  };

  const upload = async () => {
    if (!picked) return;
    setError(null);
    setProgress(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let projectId: string | null = null;
    let taskId: string | null = null;
    try {
      const user_id = await currentUserId();
      const { data: proj, error: pErr } = await supabase
        .from("projects")
        .insert({ user_id, name: picked.file.name.replace(/\.[^.]+$/, ""), status: "draft", duration_sec: picked.duration })
        .select("id")
        .single();
      if (pErr) throw new Error("Không tạo được dự án: " + pErr.message);
      projectId = proj.id;
      taskId = await createTask("upload", projectId, { name: picked.file.name, size: picked.file.size });
      const ext = picked.file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${user_id}/${projectId}/source.${ext}`;
      await uploadWithProgress(path, picked.file, (l, t) => setProgress(Math.round((l / t) * 100)), ctrl.signal);
      const { error: fErr } = await supabase.from("files").insert({
        user_id,
        project_id: projectId,
        kind: "source_video",
        name: picked.file.name,
        mime_type: picked.file.type || null,
        size_bytes: picked.file.size,
        storage_path: path,
        duration_sec: picked.duration,
      });
      if (fErr) throw new Error("Đã tải tệp nhưng không lưu được thông tin: " + fErr.message);
      await supabase.from("projects").update({ status: "uploaded" }).eq("id", projectId);
      await updateTask(taskId, { status: "done" });
      setDoneId(projectId);
      toast.success("Tải video lên thành công");
      qc.invalidateQueries();
    } catch (e) {
      const m = errMsg(e);
      setError(m);
      if (taskId) await updateTask(taskId, { status: ctrl.signal.aborted ? "canceled" : "failed", error: m });
      if (projectId) await supabase.from("projects").delete().eq("id", projectId);
      logError("upload", m);
      toast.error(m);
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  return (
    <Panel>
      <h2 className="mb-1 font-medium">Từ điện thoại hoặc máy tính</h2>
      <p className="mb-4 text-sm text-muted-foreground">Tối đa 200 MB · MP4, WebM, MOV, M4V, MKV</p>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? undefined)} />
      {!picked ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-input text-sm text-muted-foreground hover:bg-accent/50"
        >
          <FileVideo className="h-7 w-7 text-primary" />
          Chạm để chọn video
        </button>
      ) : (
        <div className="grid gap-3">
          {picked.canPreview ? (
            <video src={picked.url} controls playsInline className="aspect-video w-full rounded-xl bg-muted" />
          ) : (
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Trình duyệt không xem trước được định dạng này, nhưng vẫn có thể tải lên.</div>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Tên tệp</dt>
            <dd className="truncate">{picked.file.name}</dd>
            <dt className="text-muted-foreground">Định dạng</dt>
            <dd>{picked.file.type || picked.file.name.split(".").pop()?.toUpperCase()}</dd>
            <dt className="text-muted-foreground">Dung lượng</dt>
            <dd>{formatBytes(picked.file.size)}</dd>
            <dt className="text-muted-foreground">Thời lượng</dt>
            <dd>{picked.duration ? formatDuration(picked.duration) : "Không đọc được"}</dd>
            {picked.width && (
              <>
                <dt className="text-muted-foreground">Kích thước</dt>
                <dd>{picked.width}×{picked.height}</dd>
              </>
            )}
          </dl>
          {progress !== null && (
            <div className="grid gap-1">
              <Progress value={progress} />
              <span className="text-xs text-muted-foreground">Đang tải lên… {progress}%</span>
            </div>
          )}
          {doneId ? (
            <div className="grid gap-2">
              <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Đã lưu vào thư viện</p>
              <Button onClick={() => setDoneId(null)}>Tiếp tục sửa video</Button>
              <Button variant="ghost" onClick={() => { setPicked(null); setDoneId(null); }}>Tải video khác</Button>
            </div>
          ) : progress !== null ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}><X /> Hủy tải lên</Button>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={upload}>Tải lên</Button>
              <Button variant="outline" onClick={() => setPicked(null)}>Chọn lại</Button>
            </div>
          )}
        </div>
      )}
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Panel>
  );
}

function UrlImporter() {
  const qc = useQueryClient();
  const inspect = useServerFn(inspectVideoUrl);
  const doImport = useServerFn(importVideoUrl);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "checked" | "importing">("idle");
  const [info, setInfo] = useState<{ type: string; size: number | null; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setError(null);
    setInfo(null);
    setState("checking");
    try {
      const r = await inspect({ data: { url } });
      if (!r.ok) {
        setError(r.reason);
        setState("idle");
      } else {
        setInfo(r);
        setState("checked");
      }
    } catch (e) {
      setError(errMsg(e));
      setState("idle");
    }
  };

  const run = async () => {
    setState("importing");
    setError(null);
    const taskId = await createTask("import_url", null, { host: (() => { try { return new URL(url).hostname; } catch { return ""; } })() });
    try {
      const r = await doImport({ data: { url, name: info?.name } });
      await supabase.from("tasks").update({ status: "done", project_id: r.projectId }).eq("id", taskId);
      toast.success("Đã tải video từ liên kết vào thư viện");
      qc.invalidateQueries();
    } catch (e) {
      const m = errMsg(e);
      await updateTask(taskId, { status: "failed", error: m });
      logError("import_url", m);
      setError(m);
      setState("checked");
    }
  };

  return (
    <Panel>
      <h2 className="mb-1 font-medium">Từ liên kết</h2>
      <p className="mb-4 text-sm text-muted-foreground">Dán liên kết HTTPS trực tiếp tới tệp video công khai.</p>
      <div className="flex gap-2">
        <Input
          className="h-11"
          placeholder="https://…/video.mp4"
          inputMode="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setState("idle"); setInfo(null); }}
        />
        <Button variant="secondary" disabled={!url || state === "checking" || state === "importing"} onClick={check}>
          {state === "checking" ? <Loader2 className="animate-spin" /> : <Link2 />} Kiểm tra
        </Button>
      </div>
      {info && (
        <div className="mt-3 grid gap-2 rounded-xl bg-accent/60 p-3 text-sm">
          <div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" /> Liên kết truy cập được</div>
          <div>{info.name} · {info.type} · {info.size ? formatBytes(info.size) : "không rõ dung lượng"}</div>
          <Button onClick={run} disabled={state === "importing"}>
            {state === "importing" && <Loader2 className="animate-spin" />}
            {state === "importing" ? "Đang tải về máy chủ…" : "Tải video vào thư viện"}
          </Button>
        </div>
      )}
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Panel>
  );
}

function InputVideos() {
  const q = useQuery({
    queryKey: ["files", "source"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("id,name,size_bytes,duration_sec,created_at,storage_path,project_id,mime_type")
        .eq("kind", "source_video")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);
  return (
    <Panel>
      <h2 className="mb-3 font-medium">Video đầu vào</h2>
      {q.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : q.error ? (
        <p className="text-sm text-destructive">Không tải được danh sách.</p>
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">Chưa có video nào.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {q.data.map((f) => (
            <li key={f.id} className="grid gap-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(f.size_bytes)} · {formatDuration(f.duration_sec)} · {formatDate(f.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (preview?.id === f.id) return setPreview(null);
                      try { setPreview({ id: f.id, url: await signedUrl(f.storage_path) }); } catch (e) { toast.error(errMsg(e)); }
                    }}
                  >
                    {preview?.id === f.id ? "Đóng" : "Xem"}
                  </Button>
                </div>
              </div>
              {preview?.id === f.id && <video src={preview.url} controls playsInline className="aspect-video w-full rounded-xl bg-muted" />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
        }
  
