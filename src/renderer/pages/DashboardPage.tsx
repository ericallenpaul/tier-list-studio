import { useEffect, useState, type FormEvent } from "react";

import type { DashboardState, EditorStore } from "../domain/editorTypes";

type DashboardPageProps = {
  store: EditorStore;
  onOpenBoard: (listId: string) => Promise<void>;
};

export const DashboardPage = ({ store, onOpenBoard }: DashboardPageProps) => {
  const [dashboard, setDashboard] = useState<DashboardState>({ workspaces: [], recentLists: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    store.loadDashboard()
      .then((loaded) => {
        if (isMounted) {
          setDashboard(loaded);
          setIsLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [store]);

  const createBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    try {
      setError(null);
      const listId = await store.createBoard(cleanTitle);
      await onOpenBoard(listId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create board.");
    }
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar">
        <div className="brand-inline">
          <span className="brand-mark" />
          <span className="brand-name">Tier List Studio</span>
        </div>
        <button className="primary" disabled={isLoading} onClick={() => setIsCreating(true)}>New Board</button>
      </header>

      <section className="dashboard-main">
        <div className="dashboard-heading">
          <div className="eyebrow">Dashboard</div>
          <h1>Boards</h1>
        </div>

        {isCreating ? (
          <form className="panel create-board-form" onSubmit={createBoard}>
            <label htmlFor="board-title">Board title</label>
            <div className="create-board-row">
              <input
                id="board-title"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <button className="primary" type="submit">Create</button>
            </div>
          </form>
        ) : null}

        {error ? <p className="dashboard-error">{error}</p> : null}

        <section className="dashboard-list" aria-label="Recent boards">
          {dashboard.recentLists.map((list) => (
            <button className="dashboard-list-item" key={list.id} onClick={() => onOpenBoard(list.id)}>
              <span>{list.name}</span>
              <span>{dashboard.workspaces.find((workspace) => workspace.id === list.workspaceId)?.name ?? "Workspace"}</span>
            </button>
          ))}
        </section>
      </section>
    </main>
  );
};
