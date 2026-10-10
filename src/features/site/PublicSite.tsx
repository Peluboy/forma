import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  ImagePlus,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
  LayoutTemplate,
  MoveUpRight,
  MousePointer2,
  ChevronDown,
} from "lucide-react";
import { useAccount } from "../../shared/api/api";
import Poster from "../editor/components/Poster";
import Billing from "../billing/Billing";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import {
  createProject,
  parseManuscript,
  templates,
  type TemplateId,
} from "../../domain/design/model";

export function PageMeta({
  title,
  description,
  privatePage = false,
}: {
  title: string;
  description?: string;
  privatePage?: boolean;
}) {
  useEffect(() => {
    document.title = `${title} — Forma`;
    const set = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.append(el);
      }
      el.content = content;
    };
    set(
      "description",
      description ||
        "Bring your approved words into a design you love. A reference-first design workspace with editable text and copy checks.",
    );
    set("robots", privatePage ? "noindex,nofollow" : "index,follow");
  }, [title, description, privatePage]);
  return null;
}
export function Logo() {
  return (
    <a className="brand site-logo" href="/" aria-label="Forma home">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      <span>
        forma<span className="brand-dot">.</span>
      </span>
    </a>
  );
}
export function SiteShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const { session } = useAccount();
  const [open, setOpen] = useState(false);
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Logo />
        <nav
          className={open ? "site-nav open" : "site-nav"}
          aria-label="Main navigation"
        >
          <a href="/#how-it-works">How it works</a>
          <a
            href="/templates"
            aria-current={
              location.pathname === "/templates" ? "page" : undefined
            }
          >
            Templates
          </a>
          <a
            href="/pricing"
            aria-current={location.pathname === "/pricing" ? "page" : undefined}
          >
            Pricing
          </a>
          <a href="/help">Help</a>
        </nav>
        <div className="site-header-actions">
          <ThemeToggle compact />
          <a className="site-login" href={session.user ? "/account" : "/login"}>
            {session.user ? session.user.name : "Log in"}
          </a>
          <a
            className="button primary"
            href={session.user ? "/dashboard" : "/signup"}
          >
            {session.user ? "Open workspace" : "Get started"}
            <ArrowUpRight size={15} strokeWidth={1.75} />
          </a>
          <button
            className="site-menu-button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {children}
      {!compact && (
        <footer className="site-footer">
          <div>
            <Logo />
            <p>Good design. Your words. All yours.</p>
            <span>© {new Date().getFullYear()} Forma</span>
          </div>
          <div>
            <strong>Make something</strong>
            <a href="/editor">Try the editor</a>
            <a href="/templates">Browse templates</a>
            <a href="/pricing">Plans and pricing</a>
          </div>
          <div>
            <strong>A little guidance</strong>
            <a href="/help">Help & FAQ</a>
            <a href="/user-guide.md" target="_blank" rel="noreferrer">
              Product guide <ArrowUpRight size={12} />
            </a>
            <a href="/account">Your account</a>
          </div>
        </footer>
      )}
    </div>
  );
}
export function Preview({
  template = "gathering",
  title,
}: {
  template?: TemplateId;
  title?: string;
}) {
  const p = createProject();
  p.template = template;
  if (title)
    p.copy = parseManuscript(
      `Eyebrow: MADE FOR YOUR NEXT IDEA\n\nHeadline: ${title}\n\nBody copy: Your story deserves a little space. Make it something worth sharing.\n\nFooter: GOOD IDEAS START HERE.`,
    );
  return <Poster miniature project={p} />;
}
const questions = [
  [
    "Will Forma change my words?",
    "Your manuscript stays in control. Forma maps your supplied wording into editable text and adjusts its fit. It does not invent extra copy. You can review changed or removed sections before applying an update.",
  ],
  [
    "Can I use a design I already have?",
    "Yes. Upload a PNG, JPEG, or WebP reference and mark the areas to replace. Automatic analysis can suggest text regions for your review when available. The image outside your selected regions stays in place.",
  ],
  [
    "Will every reference be pixel-perfect?",
    "Not every flattened image can be reconstructed exactly. This release uses solid-color covers behind replacement text, so simple backgrounds work best. Textured backgrounds and exact recovery of original fonts may require manual work.",
  ],
  [
    "What can I upload and export?",
    "Import text from TXT, Markdown, DOCX, or text-based PDFs. Export designs as PNG, SVG, or flattened PDF, keep an editable Forma JSON backup, or download a campaign ZIP from a template.",
  ],
  [
    "Do I need a credit card to start?",
    "No. You can try the editor as a guest or create a free account to save projects. Pro checkout opens only when pricing is configured. Your existing designs remain available if you return to Free.",
  ],
  [
    "Where do my designs get saved?",
    "Guest designs stay in the current browser. Signed-in projects are saved to your account. Guest files do not automatically move between devices; use an account or download a project backup.",
  ],
];
export function FAQ({ all = false }: { all?: boolean }) {
  return (
    <div className="site-faq">
      {questions.slice(0, all ? questions.length : 4).map(([q, a]) => (
        <details key={q}>
          <summary>
            {q}
            <ChevronDown size={18} />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
export default function HomePage() {
  return (
    <SiteShell>
      <PageMeta title="Your words. A design worth keeping." />
      <main id="main">
        <section className="site-hero">
          <div className="hero-copy">
            <span className="site-eyebrow">
              <span /> YOUR WORDS. BEAUTIFULLY IN PLACE.
            </span>
            <h1>
              A design you love.
              <br />
              The words
              <br />
              <em>only you can say.</em>
            </h1>
            <p>
              Bring a reference. Bring your manuscript.
              <br className="desktop-break" /> Make them work beautifully
              together, without losing a word.
            </p>
            <div className="hero-actions">
              <a className="button primary large" href="/create">
                Create with AI
                <ArrowUpRight size={18} />
              </a>
              <a className="button secondary large" href="/editor">
                Try the editor
                <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-assurance">
              <ShieldCheck size={16} />
              Your copy stays yours. No card needed.
            </div>
          </div>
          <div
            className="hero-composition"
            aria-label="Preview of a manuscript becoming an editable poster"
          >
            <div className="hero-orbit" />
            <div className="hero-paper">
              <div className="hero-paper-heading">
                <FileText size={16} />
                Your manuscript<span>01</span>
              </div>
              <span className="paper-label">THE HEADLINE</span>
              <strong>
                Good things
                <br />
                take shape.
              </strong>
              <span className="paper-label">THE DETAILS</span>
              <p>
                A little curiosity. A fresh perspective.
                <br />
                An evening for people who make things happen.
              </p>
              <div className="paper-rule" />
              <div className="paper-check">
                <Check size={13} />
                Original wording, intact
              </div>
            </div>
            <MoveUpRight className="hero-arrow" size={66} strokeWidth={1} />
            <div className="hero-design">
              <div className="hero-design-bar">
                <i />
                <i />
                <i />
                <span>Your design, in progress</span>
              </div>
              <Preview />
              <div className="hero-text-selection">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="hero-cursor">
                <MousePointer2 size={23} fill="currentColor" />
                <span>You, in control</span>
              </div>
            </div>
            <div className="hero-floating-note">
              <Sparkles size={18} />
              <span>
                A little less rework.
                <br />
                <strong>A lot more possibility.</strong>
              </span>
            </div>
          </div>
        </section>
        <section className="site-principles" aria-label="Product principles">
          <span>
            <ShieldCheck />
            Exact-copy checks
          </span>
          <span>
            <LayoutTemplate />
            Editable templates
          </span>
          <span>
            <ImagePlus />
            Your own references
          </span>
          <span>
            <Check />
            Ready-to-share exports
          </span>
        </section>
        <section className="site-section" id="how-it-works">
          <div className="section-title">
            <span className="site-eyebrow">FROM IDEA TO IN PLACE</span>
            <h2>
              You bring the story.
              <br />
              We help it find its place.
            </h2>
            <p>A familiar design workflow, with fewer repetitive steps.</p>
          </div>
          <div className="steps-grid">
            {[
              {
                n: "01",
                Icon: ImagePlus,
                title: "Start with a look you love.",
                text: "Upload your reference or choose an editable template. Keep the visual direction yours.",
              },
              {
                n: "02",
                Icon: FileText,
                title: "Bring your exact words.",
                text: "Paste or upload your manuscript. Review the copy, map it into place, and check the fit.",
              },
              {
                n: "03",
                Icon: ArrowUpRight,
                title: "Make it ready for the world.",
                text: "Refine the details, share a review, and export. Save your design to use it again.",
              },
            ].map(({ n, Icon, title, text }) => (
              <article key={n}>
                <div>
                  <Icon size={26} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="site-section templates-section">
          <div className="section-title horizontal">
            <div>
              <span className="site-eyebrow">
                A HEAD START, NOT A BLANK PAGE
              </span>
              <h2>
                Something here
                <br />
                already feels like you.
              </h2>
            </div>
            <a className="button secondary" href="/templates">
              Explore templates
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="home-template-grid">
            {templates.slice(0, 4).map((t, i) => (
              <a href={`/onboarding?template=${t.id}`} key={t.id}>
                <div>
                  <Preview
                    template={t.id}
                    title={
                      [
                        "Good things\ntake shape.",
                        "Room to\ngrow.",
                        "A new\nchapter.",
                        "Think\noutside.",
                      ][i]
                    }
                  />
                </div>
                <strong>
                  {t.name}
                  <ArrowUpRight size={15} />
                </strong>
                <span>{t.category}</span>
              </a>
            ))}
          </div>
        </section>
        <section className="site-section site-faq-section">
          <div className="section-title">
            <span className="site-eyebrow">A FEW GOOD QUESTIONS</span>
            <h2>Before your first good idea.</h2>
          </div>
          <FAQ />
          <a className="site-text-link" href="/help">
            More answers in the help center
            <ArrowRight size={16} />
          </a>
        </section>
        <section className="site-final-cta">
          <Sparkles size={28} />
          <h2>
            Your next design
            <br />
            starts with your words.
          </h2>
          <p>
            Make something that looks like you, and says exactly what you mean.
          </p>
          <a className="button primary large" href="/signup">
            Get started free
            <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
    </SiteShell>
  );
}
export function PricingPage() {
  const { session } = useAccount();
  return (
    <SiteShell>
      <PageMeta title="Plans for your next good idea" />
      <main id="main" className="site-section pricing-page">
        <div className="section-title">
          <span className="site-eyebrow">START SMALL. MAKE IT YOURS.</span>
          <h1>More room for good ideas.</h1>
          <p>
            Start free. Choose more analysis capacity when your work calls for
            it.
          </p>
        </div>
        <Billing
          user={session.user}
          onSignIn={() =>
            location.assign("/signup?next=/account%3Ftab%3Dbilling")
          }
          beforeCheckout={async () => {}}
        />
        <FAQ />
      </main>
    </SiteShell>
  );
}
export function TemplatesPage() {
  const [category, setCategory] = useState("All");
  return (
    <SiteShell>
      <PageMeta title="Find your starting point" />
      <main id="main" className="site-section">
        <div className="section-title">
          <span className="site-eyebrow">THE TEMPLATE COLLECTION</span>
          <h1>
            A starting point.
            <br />
            <em>Then, entirely yours.</em>
          </h1>
          <p>
            Six original looks for events, businesses, and everyday good ideas.
          </p>
        </div>
        <div className="template-filter" aria-label="Template categories">
          {["All", "Events", "Business", "Lifestyle", "Editorial"].map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="public-template-grid">
          {templates
            .filter((t) => category === "All" || t.category === category)
            .map((t) => (
              <a key={t.id} href={`/onboarding?template=${t.id}`}>
                <div>
                  <Preview template={t.id} />
                </div>
                <strong>
                  {t.name}
                  <ArrowUpRight size={17} />
                </strong>
                <span>{t.category} · Use this template</span>
              </a>
            ))}
        </div>
      </main>
    </SiteShell>
  );
}
export function HelpPage() {
  const { config } = useAccount();
  return (
    <SiteShell>
      <PageMeta title="A little help along the way" />
      <main id="main" className="site-section help-page">
        <div className="section-title">
          <span className="site-eyebrow">HERE TO HELP YOU MAKE IT</span>
          <h1>
            A little guidance.
            <br />A lot of possibility.
          </h1>
          <p>Answers for your first design, and the one after that.</p>
        </div>
        <div className="help-quick-links">
          <a href="/onboarding">
            <Sparkles />
            <strong>Take the quick start</strong>
            <span>Choose a starting point for your first project.</span>
          </a>
          <a href="/user-guide.md" target="_blank" rel="noreferrer">
            <FileText />
            <strong>Read the product guide</strong>
            <span>Uploads, copy mapping, review, and exports.</span>
          </a>
          <a href="/account?tab=billing">
            <ShieldCheck />
            <strong>Manage your account</strong>
            <span>Your profile, plan, and payment settings.</span>
          </a>
        </div>
        <FAQ all />
        <div className="help-contact">
          <h2>Need a hand?</h2>
          {config.supportEmail ? (
            <p>
              Write to{" "}
              <a href={`mailto:${config.supportEmail}`}>
                {config.supportEmail}
              </a>
              . Include what you were trying to do and the error you saw. Never
              send passwords or payment-card details.
            </p>
          ) : (
            <p>
              During the private beta, contact the person who invited you to
              Forma. Include what you were trying to do and any error shown.
            </p>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
export function NotFoundPage() {
  return (
    <SiteShell>
      <PageMeta title="Page not found" privatePage />
      <main id="main" className="site-section not-found">
        <span className="site-eyebrow">404 · A LITTLE OFF THE CANVAS</span>
        <h1>This page isn’t in the picture.</h1>
        <p>Let’s get you back to something you can make.</p>
        <a className="button primary" href="/">
          Back to Forma
          <ArrowRight size={17} />
        </a>
      </main>
    </SiteShell>
  );
}
