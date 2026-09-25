import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  socialStatusFn,
  listSocialAccountsFn,
  startTikTokConnectFn,
  completeTikTokConnectFn,
  syncSocialAccountsFn,
  disconnectSocialAccountFn,
} from "@/lib/social.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TikTokAccountsSettings() {
  const qc = useQueryClient();
  const status = useServerFn(socialStatusFn);
  const list = useServerFn(listSocialAccountsFn);
  const startConnect = useServerFn(startTikTokConnectFn);
  const completeConnect = useServerFn(completeTikTokConnectFn);
  const sync = useServerFn(syncSocialAccountsFn);
  const disconnect = useServerFn(disconnectSocialAccountFn);

  const [connecting, setConnecting] = useState(false);
  // Holds the state value for the connect attempt currently in flight, so the
  // (once-registered) message handler below always sees the latest one.
  const pendingState = useRef<string | null>(null);

  const { data: svc } = useQuery({ queryKey: ["social-status"], queryFn: () => status() });
  const { data, isLoading } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => list(),
    enabled: !!svc?.configured,
  });
  const accounts = data?.accounts ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["social-accounts"] });

  const syncMut = useMutation({
    mutationFn: () => sync(),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => disconnect({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Account removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // The popup relays TikTok's redirect (code/state, or an error) back here.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const payload = e.data as {
        type?: string;
        ok?: boolean;
        code?: string;
        state?: string;
        error?: string;
      };
      if (payload?.type !== "tiktokConnectResult") return;

      if (!payload.ok) {
        setConnecting(false);
        pendingState.current = null;
        if (payload.error) toast.error(payload.error);
        return;
      }
      if (!payload.code || !payload.state || payload.state !== pendingState.current) {
        setConnecting(false);
        pendingState.current = null;
        toast.error("TikTok connection could not be verified. Please try again.");
        return;
      }

      pendingState.current = null;
      completeConnect({ data: { code: payload.code } })
        .then(() => {
          invalidate();
          toast.success("TikTok account connected");
        })
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setConnecting(false));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setConnecting(true);
    try {
      const { connectUrl, state } = await startConnect();
      pendingState.current = state;
      const win = window.open(connectUrl, "tiktok-connect", "width=520,height=720");
      if (!win) {
        setConnecting(false);
        pendingState.current = null;
        toast.error("Allow pop-ups to connect a TikTok account.");
      }
    } catch (e) {
      setConnecting(false);
      pendingState.current = null;
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="panel space-y-5 p-6 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">TikTok accounts</h2>
          <p className="text-xs text-muted-foreground">
            Connect the accounts your approved videos will be posted to.
          </p>
        </div>
        <div className="flex gap-2">
          {svc?.configured && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
            >
              {syncMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          )}
          <Button size="sm" onClick={connect} disabled={!svc?.configured || connecting}>
            {connecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Connect TikTok account
          </Button>
        </div>
      </div>

      {!svc?.configured ? (
        <p className="rounded-md border border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          TikTok isn't set up yet. Add the TikTok client key and secret and this section goes live.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              {a.avatar_url ? (
                <img src={a.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-surface-raised" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {a.display_name || a.account_handle || "TikTok account"}
                </p>
                <p className="truncate text-xs text-muted-foreground">@{a.account_handle}</p>
              </div>
              <Badge variant={a.status === "connected" ? "secondary" : "destructive"}>
                {a.status === "connected" ? "Connected" : "Needs reconnecting"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove account"
                onClick={() => removeMut.mutate(a.id)}
                disabled={removeMut.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
