"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Compass,
  LayoutDashboard,
  Map,
  CalendarDays,
  Timer,
  GraduationCap,
  FolderKanban,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  BookOpen,
  NotebookPen,
  Settings,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  PanelLeftClose,
} from "lucide-react";
import { weeks, resources } from "@/lib/content";
import { useAcademy } from "./store";
import { logout } from "@/app/auth/actions";
const links = [
  ["dashboard", "Overview", LayoutDashboard],
  ["today", "Today’s plan", CalendarDays],
  ["academy", "Academy", Map],
  ["focus", "Focus room", Timer],
  ["assessments", "Assessments", GraduationCap],
  ["projects", "Project lab", FolderKanban],
  ["schedule", "Schedule", CalendarDays],
  ["analytics", "Your progress", ChartNoAxesCombined],
  ["career", "Career", BriefcaseBusiness],
  ["reviews", "Weekly review", NotebookPen],
  ["resources", "Library", BookOpen],
  ["settings", "Settings", Settings],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const s = useAcademy();
  const [mobile, setMobile] = useState(false);
  const [mobileScreen, setMobileScreen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    const mobileQuery = matchMedia("(max-width:760px)");
    const mobileChange = () => setMobileScreen(mobileQuery.matches);
    mobileChange();
    mobileQuery.addEventListener("change", mobileChange);
    const colors = matchMedia("(prefers-color-scheme: light)");
    const colorChange = () => {
      if (localStorage.getItem("atlas-theme") === "system")
        document.documentElement.dataset.theme = colors.matches
          ? "light"
          : "dark";
    };
    colors.addEventListener("change", colorChange);
    const t = localStorage.getItem("atlas-theme") || "dark";
    document.documentElement.dataset.density =
      localStorage.getItem("atlas-density") || "comfortable";
    document.documentElement.dataset.motion =
      localStorage.getItem("atlas-motion") || "system";
    setTheme(t);
    document.documentElement.dataset.theme =
      t === "system"
        ? matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : t;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      mobileQuery.removeEventListener("change", mobileChange);
      colors.removeEventListener("change", colorChange);
    };
  }, []);
  function toggleTheme() {
    const t =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(t);
    localStorage.setItem("atlas-theme", t);
    document.documentElement.dataset.theme = t;
  }
  return (
    <div className={"app " + (collapsed ? "collapsed" : "")}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside
        inert={mobileScreen && !mobile}
        className={mobile ? "sidebar open" : "sidebar"}
      >
        <Link className="brand" href="/dashboard">
          <span className="brand-icon">
            <Compass />
          </span>
          <span>
            ATLAS<small>PERSONAL AI ACADEMY</small>
          </span>
        </Link>
        <div className="sidebar-caption">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              title={label}
              className={
                path.startsWith("/" + href) ? "nav-item active" : "nav-item"
              }
              href={"/" + href}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {href === "today" && <i />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">
            {s.preferences.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{s.preferences.name}</strong>
            <small>Class of {s.preferences.graduation}</small>
          </div>
          <button
            aria-label="Collapse sidebar"
            className="icon-button collapse-toggle"
            onClick={() => setCollapsed((v) => !v)}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            My academy <span>/</span>{" "}
            {links.find(([href]) => path.startsWith("/" + href))?.[1] ||
              "Welcome"}
          </span>
          <div className="top-actions">
            <button
              aria-label="Search your academy"
              className="search-trigger"
              onClick={() => setSearch(true)}
            >
              <Search size={16} />
              <span>Search your academy</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Switch color theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {!s.preview && (
              <form action={logout}>
                <button className="icon-button" aria-label="Sign out">
                  <LogOut size={18} />
                </button>
              </form>
            )}
          </div>
        </header>
        {s.preview && (
          <div className="preview-banner">
            Exploration mode · progress is temporary.{" "}
            <Link href="/auth">
              Connect your account to save across devices
            </Link>
          </div>
        )}
        <main id="content">
          {s.error && (
            <div role="alert" className="alert">
              {s.error}{" "}
              <button onClick={() => void s.refresh()}>Retry loading</button>
            </div>
          )}
          {s.notice && (
            <p className="save-status" role="status">
              {s.notice}
            </p>
          )}
          {s.loading ? (
            <div className="skeleton" aria-label="Loading your academy" />
          ) : !s.preview &&
            !s.preferences.onboarded &&
            path !== "/onboarding" ? (
            <section className="card">
              <h1>Make this academy yours.</h1>
              <p>Choose a realistic schedule before your first session.</p>
              <Link className="btn btn-primary" href="/onboarding">
                Set up my plan
              </Link>
            </section>
          ) : (
            <div className="page-transition" key={path}>
              {children}
            </div>
          )}
        </main>
        <footer className="page-footer">
          Build the skills. Prove the work.
          <span>ATLAS / PERSONAL AI ACADEMY</span>
        </footer>
      </div>
      <Dialog.Root open={search} onOpenChange={setSearch}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Find your next step</Dialog.Title>
            <Dialog.Description>
              Search weeks, resources, or open a workspace.
            </Dialog.Description>
            <input
              autoFocus
              placeholder="Python, retrieval, projects…"
              aria-label="Search curriculum and resources"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="search-results">
              {links
                .filter(([, label]) =>
                  label.toLowerCase().includes(query.toLowerCase()),
                )
                .map(([href, label]) => (
                  <button
                    key={href}
                    onClick={() => {
                      router.push("/" + href);
                      setSearch(false);
                    }}
                  >
                    {label}
                    <span>Workspace</span>
                  </button>
                ))}
              {weeks
                .filter((w) =>
                  (w.title + " " + w.topics.join(" "))
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .slice(0, 10)
                .map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      router.push("/academy/week/" + w.week);
                      setSearch(false);
                    }}
                  >
                    Week {w.week} · {w.title}
                    <span>Curriculum</span>
                  </button>
                ))}
              {query &&
                resources
                  .filter((r) =>
                    r.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((r) => (
                    <a key={r.id} href={r.url} target="_blank" rel="noreferrer">
                      {r.name}
                    </a>
                  ))}
            </div>
            <Dialog.Close className="dialog-close" aria-label="Close search">
              <X />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
