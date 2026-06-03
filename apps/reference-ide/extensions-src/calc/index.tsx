import type { PluginModule } from '@jiulimiai/plugin-api';
import { useState } from 'react';

function CalcPanel() {
  const [a, setA] = useState('0');
  const [b, setB] = useState('0');
  const [op, setOp] = useState('+');

  const compute = () => {
    const x = Number(a);
    const y = Number(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return '—';
    switch (op) {
      case '+':
        return String(x + y);
      case '-':
        return String(x - y);
      case '*':
        return String(x * y);
      case '/':
        return y === 0 ? '∞' : String(x / y);
      default:
        return '—';
    }
  };

  return (
    <div data-testid="calc-panel-view" style={{ padding: 12, fontSize: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Calculator</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          data-testid="calc-input-a"
          value={a}
          onChange={(e) => setA(e.target.value)}
          style={{ width: 60, padding: 4 }}
        />
        <select data-testid="calc-op" value={op} onChange={(e) => setOp(e.target.value)}>
          <option value="+">+</option>
          <option value="-">−</option>
          <option value="*">×</option>
          <option value="/">÷</option>
        </select>
        <input
          data-testid="calc-input-b"
          value={b}
          onChange={(e) => setB(e.target.value)}
          style={{ width: 60, padding: 4 }}
        />
      </div>
      <p data-testid="calc-result">
        Result: <strong>{compute()}</strong>
      </p>
    </div>
  );
}

const plugin: PluginModule = {
  manifest: {
    id: 'calc-extension',
    name: 'Calculator',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'calcPanel', name: 'Calculator', location: 'sidebar', icon: '🧮' }],
    },
  },
  activate(ctx) {
    ctx.workbench.registerView('sidebar', 'calcPanel', () => <CalcPanel />);
  },
};

export default plugin;
