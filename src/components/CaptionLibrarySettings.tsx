import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  listCaptionsFn,
  createCaptionFn,
  updateCaptionFn,
  deleteCaptionFn,
} from "@/lib/captions.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type CaptionRow = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  category: string;
  is_favorite: boolean;
  created_at: string;
};

const CATEGORY_SUGGESTIONS = ["Product", "Value", "Story", "Offer"];

type Draft = {
  id: string | null;
  title: string;
  body: string;
  category: string;
  hashtags: string;
};

const emptyDraft: Draft = { id: null, title: "", body: "", category: "Product", hashtags: "" };

/** "tag1, #tag2 tag3" -> ["tag1", "tag2", "tag3"], trimmed and # stripped. */
function parseHashtags(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#+/, "").trim())
    .filter(Boolean);
}

export function CaptionLibrarySettings() {
  const qc = useQueryClient();
  const list = useServerFn(listCaptionsFn);
  const create = useServerFn(createCaptionFn);
  const update = useServerFn(updateCaptionFn);
  const remove = useServerFn(deleteCaptionFn);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const { data, isLoading } = useQuery({ queryKey: ["captions-library"], queryFn: () => list() });
  const captions = (data?.captions ?? []) as CaptionRow[];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["captions-library"] });

  const createMut = useMutation({
    mutationFn: (input: Draft) =>
      create({
        data: {
          title: input.title,
          body: input.body,
          category: input.category,
          hashtags: parseHashtags(input.hashtags),
        },
      }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success("Caption saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (input: { id: string } & Partial<Draft> & { is_favorite?: boolean }) => {
      if (input.is_favorite !== undefined)
        return update({ data: { id: input.id, is_favorite: input.is_favorite } });
      return update({
        data: {
          id: input.id!,
          title: input.title,
          body: input.body,
          category: input.category,
          hashtags: parseHashtags(input.hashtags ?? ""),
        },
      });
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success("Caption updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Caption deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = createMut.isPending || updateMut.isPending;
  const canSave = draft.title.trim() && draft.body.trim();

  function openNew() {
    setDraft(emptyDraft);
    setDialogOpen(true);
  }

  function openEdit(c: CaptionRow) {
    setDraft({
      id: c.id,
      title: c.title,
      body: c.body,
      category: c.category,
      hashtags: c.hashtags.join(" "),
    });
    setDialogOpen(true);
  }

  function save() {
    if (!canSave) return;
    if (draft.id) updateMut.mutate(draft);
    else createMut.mutate(draft);
  }

  return (
    <section className="panel space-y-5 p-6 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Caption library</h2>
          <p className="text-xs text-muted-foreground">
            Reusable caption templates picked in 1 tap when scheduling a post. Use {"{hook}"} and it
            gets replaced with the video's hook.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          New caption
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading captions…</p>
      ) : captions.length === 0 ? (
        <p className="rounded-md border border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          No captions yet. Save the caption you always post — text plus hashtag pack — and reuse it
          on every scheduled video.
        </p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {captions.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  aria-label={c.is_favorite ? "Remove favorite" : "Mark as favorite"}
                  onClick={() => updateMut.mutate({ id: c.id, is_favorite: !c.is_favorite })}
                  disabled={updateMut.isPending}
                  className="mt-0.5 shrink-0"
                >
                  <Star
                    className={
                      c.is_favorite ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-muted-foreground"
                    }
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.body}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label="Edit caption" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete caption"
                    onClick={() => deleteMut.mutate(c.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{c.category}</Badge>
                {c.hashtags.slice(0, 6).map((h) => (
                  <span key={h} className="text-[11px] text-muted-foreground">
                    #{h}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit caption" : "New caption"}</DialogTitle>
            <DialogDescription>
              {"Write the text you'll post with the video. "}
              <code className="rounded bg-surface-raised px-1">{"{hook}"}</code>
              {" is replaced with the video's hook when scheduling."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="caption-title">Title</Label>
              <Input
                id="caption-title"
                placeholder="e.g. Default product post"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caption-body">Caption text</Label>
              <Textarea
                id="caption-body"
                rows={4}
                placeholder={"This {hook} changed everything…\nLink in bio."}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    size="sm"
                    variant={draft.category === cat ? "default" : "outline"}
                    onClick={() => setDraft({ ...draft, category: cat })}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caption-hashtags">Hashtags</Label>
              <Input
                id="caption-hashtags"
                placeholder="fyp smallbusiness handmade"
                value={draft.hashtags}
                onChange={(e) => setDraft({ ...draft, hashtags: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Separated by spaces or commas — the # is added automatically.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave || pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {draft.id ? "Save changes" : "Save caption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
