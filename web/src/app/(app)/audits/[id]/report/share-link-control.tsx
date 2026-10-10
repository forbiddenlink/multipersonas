import { Button } from "@/components/ui/button";
import { SHARE_LINK_DEFAULT_DAYS, shareState, type ShareColumns } from "@/lib/share-token";
import { CopyLinkField } from "./copy-link-field";
import { createShareLinkAction, revokeShareLinkAction } from "./share-actions";
import { formatDate } from "./report-document";

/** Owner-only share control on the signed-in report page. Create, copy, revoke. */
export function ShareLinkControl({
  runId,
  columns,
  failed,
}: {
  runId: string;
  columns: ShareColumns;
  failed: boolean;
}) {
  const state = shareState(columns);

  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3" data-testid="share-link-control">
      <p className="text-sm font-medium">Share link</p>
      {state === "active" && columns.share_token && columns.share_expires_at ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkField path={`/r/${columns.share_token}`} />
            <form action={revokeShareLinkAction.bind(null, runId)}>
              <Button type="submit" variant="destructive">
                Revoke link
              </Button>
            </form>
          </div>
          <p className="text-xs text-muted-foreground">
            Read-only. Anyone with the link can view this report until {formatDate(columns.share_expires_at)}.
            Revoke it to cut access sooner.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <form action={createShareLinkAction.bind(null, runId)}>
              <Button type="submit" variant="outline">
                Create share link
              </Button>
            </form>
            <p className="max-w-md text-xs text-muted-foreground">
              Anyone with the link can view this report, read-only. It expires after {SHARE_LINK_DEFAULT_DAYS} days
              and you can revoke it at any time.
            </p>
          </div>
          {state === "expired" && columns.share_expires_at && (
            <p className="text-xs text-muted-foreground">
              The previous link expired on {formatDate(columns.share_expires_at)}.
            </p>
          )}
          {state === "revoked" && (
            <p className="text-xs text-muted-foreground">The previous link was revoked.</p>
          )}
        </>
      )}
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          Could not update the share link. Try again.
        </p>
      )}
    </div>
  );
}
