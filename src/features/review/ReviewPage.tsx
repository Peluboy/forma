import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
import { api, post, useAccount } from "../../shared/api/api";
import Poster from "../editor/components/Poster";
import { isProject, type Project } from "../../domain/design/model";
type Review = {
  project: Project;
  status: string;
  comments: { author: string; body: string; createdAt: string }[];
  expiresAt: string;
  requireAuthenticatedApproval?: boolean;
  decision?: {
    status: string;
    decidedBy: { userId: string; email: string; name: string };
    decidedAt: string;
  } | null;
};
export default function ReviewPage({ token }: { token: string }) {
  const { session } = useAccount();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const r = await api<Review>(`/reviews/${encodeURIComponent(token)}`);
      if (!isProject(r.project))
        throw new Error("This review has an invalid design.");
      setReview(r);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [token]);
  useEffect(() => {
    if (session.user?.name && !author) setAuthor(session.user.name);
  }, [session.user?.name]);
  async function act(kind: "comments" | "status", status?: string) {
    const commentAuthor =
      author.trim() ||
      (review?.requireAuthenticatedApproval ? session.user?.name || "" : "");
    if (kind === "comments" && !commentAuthor) {
      setError(
        review?.requireAuthenticatedApproval
          ? "Sign in or add your name before leaving feedback."
          : "Add your name before leaving feedback.",
      );
      return;
    }
    if (
      kind === "status" &&
      review?.requireAuthenticatedApproval &&
      !session.user
    ) {
      setError("Sign in to approve or request changes on this review.");
      return;
    }
    if (
      kind === "status" &&
      !review?.requireAuthenticatedApproval &&
      !author.trim()
    ) {
      setError("Add your name before leaving feedback.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (kind === "status" && review?.requireAuthenticatedApproval) {
        await post(`/reviews/${encodeURIComponent(token)}/decision`, {
          status,
        });
      } else {
        await post(
          `/reviews/${encodeURIComponent(token)}/${kind}`,
          kind === "comments"
            ? { author: commentAuthor, body }
            : { author: author.trim(), status },
        );
      }
      setBody("");
      setMessage(
        kind === "comments" ? "Comment added." : "Review status updated.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="review-page">
      <header>
        <a href="/" className="review-brand">
          forma<span>.</span>
        </a>
        <span>Design review</span>
        <span className="small-pill">Private link</span>
      </header>
      {!review ? (
        <div className="review-loading">
          <ShieldCheck size={36} />
          <h2>
            {error ? "This review isn’t available." : "Opening your design…"}
          </h2>
          <p>{error || "One moment."}</p>
          <a href="/">Back to Forma</a>
        </div>
      ) : (
        <main>
          <section className="review-canvas">
            <div>
              <h1>{review.project.name}</h1>
              <p>
                Snapshot for review · expires{" "}
                {new Date(review.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <div className="review-artboard">
              <Poster project={review.project} />
            </div>
          </section>
          <aside className="review-feedback">
            <div className={`review-status ${review.status}`}>
              <CheckCircle2 size={22} />
              <div>
                <strong>
                  {review.status === "approved"
                    ? "Approved"
                    : review.status === "changes_requested"
                      ? "Changes requested"
                      : "Ready for your feedback"}
                </strong>
                <span>
                  {review.decision
                    ? `Decided by ${review.decision.decidedBy.name} (${review.decision.decidedBy.email})`
                    : "This link contains a fixed design snapshot."}
                </span>
              </div>
            </div>
            <h2>Let’s get the details right.</h2>
            <p>
              Leave feedback or approve this version. The original project
              cannot be edited here.
            </p>
            {!review.requireAuthenticatedApproval || !session.user ? (
              <label className="form-label">
                Your name
                <input
                  required
                  maxLength={80}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </label>
            ) : null}
            {review.requireAuthenticatedApproval && (
              <p className="quiet-note">
                {session.user
                  ? `Approvals are recorded as ${session.user.name} (${session.user.email}).`
                  : "Approvals require a signed-in Forma account. Add your name to comment without signing in."}
              </p>
            )}
            <label className="form-label">
              Your feedback
              <textarea
                maxLength={2000}
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What looks good? What needs a change?"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}
            <button
              className="button secondary full-width"
              disabled={busy || !body.trim()}
              onClick={() => void act("comments")}
            >
              <MessageCircle size={15} />
              Add comment
            </button>
            <div className="review-decision">
              <button
                className="button primary"
                disabled={
                  busy || (review.requireAuthenticatedApproval && !session.user)
                }
                onClick={() => void act("status", "approved")}
              >
                <CheckCircle2 size={15} />
                Approve design
              </button>
              <button
                className="button secondary"
                disabled={
                  busy || (review.requireAuthenticatedApproval && !session.user)
                }
                onClick={() => void act("status", "changes_requested")}
              >
                Request changes
              </button>
            </div>
            <div className="review-comments">
              <h3>
                Conversation <span>{review.comments.length}</span>
              </h3>
              {!review.comments.length && (
                <p>No comments yet. Your feedback starts here.</p>
              )}
              {review.comments.map((c, i) => (
                <article key={i}>
                  <strong>{c.author}</strong>
                  <time>{new Date(c.createdAt).toLocaleString()}</time>
                  <p>{c.body}</p>
                </article>
              ))}
            </div>
            <p className="quiet-note">
              {review.requireAuthenticatedApproval
                ? "Approvals on this link require a signed-in identity. Don’t forward it beyond your intended reviewers."
                : "Anyone with this link can review and comment. Names are self-reported. Don’t forward it beyond your intended reviewers."}
            </p>
          </aside>
        </main>
      )}
    </div>
  );
}
