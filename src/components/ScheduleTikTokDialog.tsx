import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
import {
  createScheduledPostFn,
  listScheduleOptionsFn,
} from "@/lib/schedule.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScheduleOptions = {
  accounts: {
    id: string;
    account_handle: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
  captions: {
    id: string;
    title: string;
    body: string;
    hashtags: string[];
    is_favorite: boolean;
  }[];
};

/** Mirrors the server-side {hook} substitution so the preview matches what gets stored. */
function finalCaption(body: string, hashtags: string[], hookText: string) {
  let out = body.split("{hook}").join(hookText);
  if (hashtags.length) out += `\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;
  return out.trim();
}

function defaultSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleTikTokDialog({
  videoId,
  hookText,
  open,
  onOpenChange,
}: {
  videoId: string;
  hookText: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const listOptions = useServerFn(listScheduleOptionsFn);
  const schedule = useServerFn(createScheduledPostFn);

  const { data, isLoading } = useQuery({
    queryKey: ["schedule-options"],
    queryFn: () => listOptions(),
    enabled: open,
  });
  const options = data as ScheduleOptions | undefined;
  const accounts = options?.accounts ?? [];
  const captions = options?.captions ?? [];

  const [accountId, setAccountId] = useState("");
  const [slot, setSlot] = useState(defaultSlot);
  const [captionId, setCaptionId] = useState("");
  const [customCaption, setCustomCaption] = useState("");

  // Reset the form each time the dialog opens for a (possibly different) video.
  useEffect(() => {
    if (open) {
      setAccountId("");
      setSlot(defaultSlot());
      setCaptionId("");
      setCustomCaption("");
    }
  }, [open, videoId]);

  const activeTemplate = captions.find((c) => c.id === captionId);
  const preview = activeTemplate
    ? finalCaption(activeTemplate.body, activeTemplate.hashtags, hookText ?? "")
    : customCaption.split("{hook}").join(hookText ?? "").trim();

  const scheduleMut = useMutation({
    mutationFn: (input: {
      videoId: string;
      socialAccountId: string;
      captionId?: string | null;
      caption?: string | null;
      scheduledFor: string;
    }) => schedule({ data: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      onOpenChange(false);
      toast.success("Scheduled — it will post to TikTok at the time you picked.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = Boolean(accountId) && slot && preview.length > 0 && !scheduleMut.isPending;

  function submit() {
    if (!accountId || !slot) return;
    if (new Date(slot).getTime() <= Date.now()) {
      toast.error("Pick a date and time in the future.");
      return;
    }
    scheduleMut.mutate({
      videoId,
      socialAccountId: accountId,
      captionId: captionId || null,
      caption: customCaption || null,
      scheduledFor: new Date(slot).toISOString(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Schedule to TikTok
          </DialogTitle>
          <DialogDescription>
            This video will be posted to the account you pick, at the time you pick. The queue
            page sends it when it's due.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts and captions…
          </p>
        ) : accounts.length === 0 ? (
          <div className="space-y-3 rounded-md border border-border p-4 text-sm">
            <p className="text-muted-foreground">
              No TikTok accounts are connected yet. Connect one first, then come back to schedule.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/accounts">Go to Accounts</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Post to account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.display_name ? `${a.display_name} (@${a.account_handle})` : `@${a.account_handle}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedule-when">Post at</Label>
              <Input
                id="schedule-when"
                type="datetime-local"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Caption</Label>
              {captions.length > 0 ? (
                <Select value={captionId} onValueChange={setCaptionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Saved template (or write your own below)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template — write my own</SelectItem>
                    {captions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.is_favorite ? "★ " : ""}
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No saved captions yet — write one below, or save templates on the Captions tab.
                </p>
              )}
              {captions.length > 0 ? (
                <Textarea
                  rows={3}
                  placeholder={
                    captionId
                      ? "Using the selected template"
                      : "Write the caption… {hook} becomes the video's hook."
                  }
                  value={captionId ? undefined : customCaption}
                  disabled={Boolean(captionId)}
                  onChange={(e) => setCustomCaption(e.target.value)}
                />
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Preview</Label>
              <div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-3 text-xs">
                {preview || (
                  <span className="text-muted-foreground">
                    Caption preview appears here — {"{hook}"} becomes the video's hook text.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {scheduleMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
