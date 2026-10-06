import { AlertCircle, LoaderCircle } from "lucide-react";

export function EditorStorageStatus({
  conflict,
  loadError,
  signedIn,
  ready,
  onLoadRemote,
  onKeepAsCopy,
  onRetry,
}: {
  conflict: boolean;
  loadError: string;
  signedIn: boolean;
  ready: boolean;
  onLoadRemote: () => void;
  onKeepAsCopy: () => void;
  onRetry: () => void;
}) {
  return (
    <>
      {conflict && (
        <div className="sync-banner">
          <AlertCircle size={16} />
          <span>A newer version exists. Your changes are still here.</span>
          <button onClick={onLoadRemote}>Load saved version</button>
          <button onClick={onKeepAsCopy}>Keep my changes as a copy</button>
        </div>
      )}
      {loadError && (
        <div className="sync-banner">
          <AlertCircle size={16} />
          <span>{loadError}</span>
          <button onClick={onRetry}>Retry storage</button>
          <a href="/dashboard">Back to my designs</a>
        </div>
      )}
      {signedIn && !ready && !loadError && (
        <div className="workspace-loading">
          <LoaderCircle className="spin" />
          <span>Opening your private workspace…</span>
        </div>
      )}
    </>
  );
}
