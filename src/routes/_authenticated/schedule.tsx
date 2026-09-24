import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RotateCw, Trash2, X, Send } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  cancelScheduledPostFn,
  createScheduledPostFn,
  deleteScheduledPostFn,
  listScheduleOptionsFn,
  listScheduledPostsFn,
  listSchedulableVideosFn,
  retryScheduledPostFn,
} from "@/lib/schedule.functions";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — Creative Factory" },
      { name: "description", content: "Batch-schedule finished videos to TikTok and track the posting queue." },
      { property: "og:title", content: "Schedule — Creative Factory" },
      { property: "og:description", content: "Batch-schedule finished videos to TikTok and track the posting queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchedulePage,
});

type Preset = "now" | "1h" | "tomorrow" | "custom";

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function startTime(preset: Preset, custom: string): Date | null {
  const d = new Date();
  if (preset === "now") return null;
  if (preset === "1h") return new Date(d.getTime() + 3600_000);
  if (preset === "tomorrow") {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  return custom ? new Date(custom) : null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  published: "default",
  scheduled: "secondary",
  posting: "secondary",
  queued: "outline",
  failed: "destructive",
  cancelled: "outline",
};

function SchedulePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Schedule" description="Pick finished videos, send them to TikTok, and watch the queue." />
      <Tabs defaultValue="batch">
        <TabsList>
          <TabsTrigger value="batch">Batch schedule</TabsTrigger>
          <TabsTrigger value="queue">Queue & history</TabsTrigger>
        </TabsList>
        <TabsContent value="batch" className="mt-6">
          <BatchScheduler />
        </TabsContent>
        <TabsContent value="queue" className="mt-6">
          <QueueView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BatchScheduler() {
  const qc = useQueryClient();
  const listVideos = useServerFn(listSchedulableVideosFn);
  const listOptions = useServerFn(listScheduleOptionsFn);
  const schedule = useServerFn(createScheduledPostFn);

  const videosQ = useQuery({ queryKey: ["schedulable-videos"], queryFn: () => listVideos() });
  const optsQ = useQuery({ queryKey: ["schedule-options"], queryFn: () => listOptions() });
  const videos = videosQ.data?.videos ?? [];
  const accounts = optsQ.data?.accounts ?? [];
  const captions = optsQ.data?.captions ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<Preset>("now");
  const [custom, setCustom] = useState(() => toLocalInput(new Date(Date.now() + 2 * 3600_000)));
  const [spacing, setSpacing] = useState(60);
  const [captionId, setCaptionId] = useState("");
  const [customCaption, setCustomCaption] = useState("");
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null);

  const toggle = (set: Set<string>, id: string, fn: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    fn(next);
  };

  const plan = useMemo(() => {
    const accs = accounts.filter((a) => accountIds.has(a.id));
    if (!accs.length) return [];
    const base = startTime(preset, custom);
    const vids = videos.filter((v) => selected.has(v.id));
    const perAccount: Record<string, number> = {};
    return vids.map((v, i) => {
      const acc = accs[i % accs.length];
      const n = perAccount[acc.id] ?? 0;
      perAccount[acc.id] = n + 1;
      // Each account posts its own videos spaced apart; "now" still spaces follow-ups.
      const start = base ?? new Date();
      const when = n === 0 && !base ? null : new Date(start.getTime() + n * spacing * 60_000);
      return { video: v, account: acc, when };
    });
  }, [accounts, accountIds, videos, selected, preset, custom, spacing]);

  async function run() {
    if (!plan.length) return;
    if (!captionId && !customCaption.trim()) return toast.error("Pick a caption template or write one.");
    if (preset === "custom" && (!custom || new Date(custom).getTime() <= Date.now()))
      return toast.error("Pick a custom time in the future.");
    setRunning({ done: 0, total: plan.length });
    let ok = 0;
    let failed = 0;
    // One request at a time: the next post is only sent after the previous finished.
    for (const [i, item] of plan.entries()) {
      try {
        const res = await schedule({
          data: {
            videoId: item.video.id,
            socialAccountId: item.account.id,
            captionId: captionId || null,
            caption: customCaption || null,
            scheduledFor: item.when ? item.when.toISOString() : null,
          },
        });
        if (res.status === "failed") {
          failed++;
          toast.error(`@${item.account.account_handle}: ${res.error}`);
        } else ok++;
      } catch (e) {
        failed++;
        toast.error((e as Error).message);
      }
      setRunning({ done: i + 1, total: plan.length });
    }
    setRunning(null);
    setSelected(new Set());
    void qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    void qc.invalidateQueries({ queryKey: ["schedulable-videos"] });
    if (ok) toast.success(`${ok} post${ok > 1 ? "s" : ""} sent to TikTok${failed ? `, ${failed} failed` : ""}.`);
  }

  if (videosQ.isLoading || optsQ.isLoading)
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{selected.size} of {videos.length} videos selected</p>
          <Button variant="ghost" size="sm" onClick={() => setSelected(selected.size === videos.length ? new Set() : new Set(videos.map((v) => v.id)))}>
            {selected.size === videos.length ? "Clear" : "Select all"}
          </Button>
        </div>
        {videos.length === 0 ? (
          <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">No finished renders yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => (
              <label key={v.id} className={`cursor-pointer overflow-hidden rounded-lg border bg-card ${selected.has(v.id) ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                <div className="relative aspect-[9/16] bg-muted">
                  <VideoThumb path={v.output_url} />
                  <Checkbox className="absolute left-2 top-2 bg-background" checked={selected.has(v.id)} onCheckedChange={() => toggle(selected, v.id, setSelected)} />
                  {v.queued_count > 0 && <Badge variant="secondary" className="absolute right-2 top-2">Queued ×{v.queued_count}</Badge>}
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-xs">{v.hook_text ?? "Untitled"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{v.project_name}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="h-fit space-y-5 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-4">
        <div className="space-y-2">
          <Label>Accounts</Label>
          {accounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Connect a TikTok account on the Accounts page first.</p>
          ) : (
            accounts.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={accountIds.has(a.id)} onCheckedChange={() => toggle(accountIds, a.id, setAccountIds)} />
                @{a.account_handle}
              </label>
            ))
          )}
          {accountIds.size > 1 && <p className="text-[11px] text-muted-foreground">Videos are shared out across accounts in turn.</p>}
        </div>

        <div className="space-y-2">
          <Label>When</Label>
          <div className="grid grid-cols-2 gap-2">
            {([["now", "Now"], ["1h", "In 1 hour"], ["tomorrow", "Tomorrow 9 AM"], ["custom", "Custom"]] as const).map(([k, l]) => (
              <Button key={k} size="sm" variant={preset === k ? "default" : "outline"} onClick={() => setPreset(k)}>{l}</Button>
            ))}
          </div>
          {preset === "custom" && <Input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} />}
          <div className="flex items-center gap-2 pt-1">
            <Label className="text-xs font-normal text-muted-foreground">Gap between posts on the same account (min)</Label>
            <Input type="number" min={0} className="h-8 w-20" value={spacing} onChange={(e) => setSpacing(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Caption</Label>
          <Select value={captionId || "none"} onValueChange={(v) => setCaptionId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Write my own</SelectItem>
              {captions.map((c) => <SelectItem key={c.id} value={c.id}>{c.is_favorite ? "★ " : ""}{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          {!captionId && <Textarea rows={3} placeholder="Caption… {hook} becomes each video's hook." value={customCaption} onChange={(e) => setCustomCaption(e.target.value)} />}
        </div>

        {plan.length > 0 && (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-muted/50 p-2 text-[11px]">
            {plan.map((p) => (
              <div key={p.video.id} className="flex justify-between gap-2">
                <span className="truncate">@{p.account.account_handle}</span>
                <span className="shrink-0 text-muted-foreground">{p.when ? p.when.toLocaleString() : "Now"}</span>
              </div>
            ))}
          </div>
        )}

        <Button className="w-full" disabled={!plan.length || !!running} onClick={run}>
          {running ? <><Loader2 className="mr-2 size-4 animate-spin" /> Sending {running.done}/{running.total}</> : <><Send className="mr-2 size-4" /> Schedule {plan.length || ""} post{plan.length === 1 ? "" : "s"}</>}
        </Button>
      </div>
    </div>
  );
}

function VideoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useQuery({
    queryKey: ["render-thumb", path],
    queryFn: async () => {
      if (/^https?:/.test(path)) return setUrl(path), path;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.storage.from("renders").createSignedUrl(path, 3600);
      setUrl(data?.signedUrl ?? null);
      return data?.signedUrl ?? null;
    },
    staleTime: 50 * 60_000,
  });
  if (!url) return null;
  return <video src={`${url}#t=0.5`} muted preload="metadata" className="size-full object-cover" />;
}

function QueueView() {
  const qc = useQueryClient();
  const list = useServerFn(listScheduledPostsFn);
  const cancel = useServerFn(cancelScheduledPostFn);
  const del = useServerFn(deleteScheduledPostFn);
  const retry = useServerFn(retryScheduledPostFn);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["scheduled-posts"], queryFn: () => list(), refetchInterval: 30_000 });
  const posts = (q.data?.posts ?? []) as any[];

  async function act(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(null);
    void qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
  }

  if (q.isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</p>;
  if (!posts.length) return <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Nothing queued yet.</p>;

  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {posts.map((p) => (
        <div key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={statusVariant[p.status] ?? "outline"} className="capitalize">{p.status}</Badge>
              <span className="font-medium">@{p.social_accounts?.account_handle ?? "removed"}</span>
              <span className="text-xs text-muted-foreground">{new Date(p.scheduled_for).toLocaleString()}</span>
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{p.generated_videos?.hook_text ?? p.caption}</p>
            {p.error_message && <p className="text-xs text-destructive">{p.error_message}</p>}
          </div>
          <div className="flex gap-1">
            {p.status === "failed" && (
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => act(p.id, () => retry({ data: { id: p.id } }), "Sent again.")}>
                <RotateCw className="mr-1 size-3.5" /> Retry
              </Button>
            )}
            {["scheduled", "queued"].includes(p.status) && (
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => act(p.id, () => cancel({ data: { id: p.id } }), "Cancelled.")}>
                <X className="mr-1 size-3.5" /> Cancel
              </Button>
            )}
            <Button size="icon" variant="ghost" className="size-8" disabled={busy === p.id} aria-label="Delete" onClick={() => act(p.id, () => del({ data: { id: p.id } }), "Removed.")}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
