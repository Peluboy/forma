import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  ImagePlus,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import { api, useAccount } from "../../shared/api/api";
import { readLocalProjects } from "../editor/hooks/usePersistence";
import { START_KEY, type Preferences } from "../../shared/navigation";
import { templates, type TemplateId } from "../../domain/design/model";
import { PageMeta, Preview, SiteShell } from "../site/PublicSite";

export default function Onboarding() {
  const { session, ready, error: sessionError } = useAccount();
  const requested = new URLSearchParams(location.search).get("template");
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState<Preferences["purpose"]>("personal");
  const [start, setStart] = useState<Preferences["start"]>(
    templates.some((t) => t.id === requested) ? "template" : "sample",
  );
  const [template, setTemplate] = useState<TemplateId>(
    templates.find((t) => t.id === requested)?.id || "gathering",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const guest = readLocalProjects()[0];
  async function begin(skip = false) {
    setBusy(true);
    setError("");
    try {
      if (session.user)
        await api("/account/preferences", {
          method: "PUT",
          body: JSON.stringify({ purpose, start, completed: true }),
        });
      if (!skip)
        sessionStorage.setItem(
          START_KEY,
          JSON.stringify({
            owner: session.user?.id || "guest",
            start,
            template,
          }),
        );
      location.assign(skip ? "/editor" : "/editor?tour=1");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <SiteShell compact>
      <PageMeta title="Make your first design" privatePage />
      <main id="main" className="onboarding-page">
        <div className="onboarding-progress" aria-label={`Step ${step} of 2`}>
          <span className="done">{step > 1 ? <Check size={14} /> : "1"}</span>
          <i />
          <span className={step === 2 ? "done" : ""}>2</span>
          <small>YOUR QUICK START</small>
        </div>
        <div className="section-title">
          <span className="site-eyebrow">
            {session.user
              ? `WELCOME, ${session.user.name.split(" ")[0].toUpperCase()}`
              : "GOOD IDEAS START SOMEWHERE"}
          </span>
          <h1>
            {step === 1 ? (
              <>
                What are you
                <br />
                <em>making room for?</em>
              </>
            ) : (
              <>
                How would you
                <br />
                <em>like to start?</em>
              </>
            )}
          </h1>
          <p>
            {step === 1
              ? "A little context for your workspace. You can change it later."
              : "Choose a starting point. Your existing designs stay right where they are."}
          </p>
        </div>
        {step === 1 ? (
          <div className="onboarding-options">
            {[
              {
                id: "personal",
                title: "My own good ideas",
                text: "Personal projects, invitations, and experiments.",
                Icon: Sparkles,
              },
              {
                id: "business",
                title: "My business or brand",
                text: "Announcements, events, and everyday marketing.",
                Icon: LayoutTemplate,
              },
              {
                id: "client",
                title: "Work for my clients",
                text: "Approved copy, repeat designs, and review rounds.",
                Icon: FileText,
              },
            ].map(({ id, title, text, Icon }) => (
              <button
                key={id}
                className={purpose === id ? "selected" : ""}
                aria-pressed={purpose === id}
                onClick={() => setPurpose(id as Preferences["purpose"])}
              >
                <Icon size={26} />
                <strong>{title}</strong>
                <span>{text}</span>
                <i>{purpose === id && <Check size={14} />}</i>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="onboarding-starts">
              {[
                {
                  id: "sample",
                  title: "Show me an example",
                  text: "Explore a sample manuscript and design.",
                  Icon: Sparkles,
                },
                {
                  id: "template",
                  title: "Choose a template",
                  text: "Start from an editable look you love.",
                  Icon: LayoutTemplate,
                },
                {
                  id: "reference",
                  title: "Use my own reference",
                  text: "Upload a design and map its text areas.",
                  Icon: ImagePlus,
                },
                ...(guest
                  ? [
                      {
                        id: "guest",
                        title: "Continue my browser draft",
                        text: guest.name,
                        Icon: FileText,
                      },
                    ]
                  : []),
              ].map(({ id, title, text, Icon }) => (
                <button
                  key={id}
                  className={start === id ? "selected" : ""}
                  aria-pressed={start === id}
                  onClick={() => setStart(id as Preferences["start"])}
                >
                  <Icon size={24} />
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                  {start === id && <Check size={17} />}
                </button>
              ))}
            </div>
            {start === "template" && (
              <div
                className="onboarding-templates"
                aria-label="Choose your template"
              >
                {templates.map((t) => (
                  <button
                    key={t.id}
                    aria-label={t.name}
                    className={template === t.id ? "selected" : ""}
                    aria-pressed={template === t.id}
                    onClick={() => setTemplate(t.id)}
                  >
                    <Preview template={t.id} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {(error || sessionError) && (
          <p className="form-error" role="alert">
            {error || sessionError}
          </p>
        )}
        <div className="onboarding-controls">
          {step === 2 ? (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <a href="/" className="site-text-link">
              Back to home
            </a>
          )}
          <button
            className="button primary large"
            disabled={!ready || busy || !!sessionError}
            onClick={() => (step === 1 ? setStep(2) : void begin())}
          >
            {busy
              ? "Preparing your workspace…"
              : step === 1
                ? "Next, your starting point"
                : "Open my workspace"}
            <ArrowRight size={17} />
          </button>
        </div>
        <button
          className="onboarding-skip"
          disabled={!ready || busy || !!sessionError}
          onClick={() => void begin(true)}
        >
          I’ll explore on my own
        </button>
        <p className="quiet-note">
          {session.user
            ? "Your quick-start preferences are saved to your account."
            : "Trying it as a guest? Your designs stay in this browser until you save them to an account."}
        </p>
      </main>
    </SiteShell>
  );
}
