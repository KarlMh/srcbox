export function WindowControls() {
  if (!window.electronAPI?.isElectron) return null;

  return (
    <div className="app-no-drag flex items-center">
      <button
        onClick={() => window.electronAPI.minimizeWindow()}
        className="w-10 h-8 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Minimize"
      >
        <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
          <rect width="10" height="1.5" rx="0.75" />
        </svg>
      </button>
      <button
        onClick={() => window.electronAPI.maximizeWindow()}
        className="w-10 h-8 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Maximize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="0.75" y="0.75" width="8.5" height="8.5" rx="1" />
        </svg>
      </button>
      <button
        onClick={() => window.electronAPI.closeWindow()}
        className="w-10 h-8 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground"
        title="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="9" y2="9" />
          <line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>
    </div>
  );
}
