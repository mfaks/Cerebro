function Footer() {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-sidebar-border px-4">
      <span className="text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Cerebro
      </span>
      <a
        href="https://github.com/mfaks/Cerebro"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="GitHub repository"
      >
        <img src="/github.svg" alt="GitHub" className="h-4 w-4 dark:invert" />
      </a>
    </footer>
  );
}

export default Footer;