import type { PluginModule } from '@jiulimiai/plugin-api';
import { useState } from 'react';

function TodoPanel() {
  const [items, setItems] = useState<string[]>(['Try Molecule extensions']);
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((prev) => [...prev, text]);
    setDraft('');
  };

  return (
    <div data-testid="todo-panel-view" style={{ padding: 12, fontSize: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>TODO</p>
      <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
        {items.map((item, i) => (
          <li key={`${item}-${i}`} data-testid={`todo-item-${i}`}>
            {item}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          data-testid="todo-input"
          value={draft}
          placeholder="New task…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ flex: 1, padding: 4 }}
        />
        <button type="button" data-testid="todo-add" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

const plugin: PluginModule = {
  manifest: {
    id: 'todo-extension',
    name: 'TODO List',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'todoPanel', name: 'TODO', location: 'sidebar', icon: '☑' }],
    },
  },
  activate(ctx) {
    ctx.workbench.registerView('sidebar', 'todoPanel', () => <TodoPanel />);
  },
};

export default plugin;
