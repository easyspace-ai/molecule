import { expect, test } from '@playwright/test';

async function waitForWorkbench(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByTestId('molecule-loading')).toBeHidden({ timeout: 20_000 });
  await expect(page.getByTestId('workbench')).toBeVisible({ timeout: 15_000 });
}

async function openExplorer(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar');
  if (!(await sidebar.isVisible())) {
    await page.keyboard.press('Control+b');
  }
  await page.getByTestId('activity-explorer').click();
  await expect(page.getByTestId('explorer-view')).toBeVisible({ timeout: 15_000 });
}

async function openExplorerFile(page: import('@playwright/test').Page, filePath: string) {
  await openExplorer(page);
  const segments = filePath.split('/');
  let prefix = '';
  for (let i = 0; i < segments.length - 1; i++) {
    prefix = prefix ? `${prefix}/${segments[i]}` : segments[i];
    const dir = page.getByTestId(`tree-item-${prefix}`);
    await dir.locator('.mo-tree-item__chevron').click();
  }
  await page.getByTestId(`tree-item-${filePath}`).getByRole('button').last().click();
}

test.describe('Reference IDE', () => {
  test('loads workbench and explorer', async ({ page }) => {
    await waitForWorkbench(page);
    await openExplorer(page);
  });

  test('opens file from explorer', async ({ page }) => {
    await waitForWorkbench(page);
    await openExplorerFile(page, 'src/index.ts');
    await expect(page.getByTestId('monaco-editor')).toBeVisible();
  });

  test('AI chat sends message and streams response', async ({ page }) => {
    await waitForWorkbench(page);
    await expect(page.getByTestId('auxiliary-bar')).toBeVisible();
    await expect(page.getByTestId('ai-chat')).toBeVisible();
    await page.getByPlaceholder('Message AI…').fill('hello molecule');
    await page.getByTestId('ai-send').click();
    await expect(page.getByText(/Mock response/i)).toBeVisible({ timeout: 15_000 });
  });

  test('theme persists after reload', async ({ page }) => {
    await waitForWorkbench(page);

    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('theme-picker')).toBeVisible();
    await page.getByTestId('theme-picker-vs-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'vs-light');

    await page.reload();
    await expect(page.getByTestId('workbench')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'vs-light');
  });

  test('Ctrl+B toggles sidebar visibility', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Modifier shortcuts are chromium-only in CI');

    await waitForWorkbench(page);
    await openExplorer(page);

    await page.keyboard.press('Control+b');
    await expect(page.getByTestId('sidebar')).toBeHidden();

    await page.keyboard.press('Control+b');
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('search finds Molecule in sample workspace', async ({ page }) => {
    await waitForWorkbench(page);

    await page.getByTestId('activity-search').click();
    await expect(page.getByTestId('search-view')).toBeVisible();
    await page.getByTestId('search-input').fill('Molecule');
    await page.getByTestId('search-view').getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('button', { name: /README\.md:1/ })).toBeVisible({ timeout: 10_000 });
  });

  test('editor auto-save persists content after reload', async ({ page }) => {
    await waitForWorkbench(page);
    await openExplorerFile(page, 'src/index.ts');
    await expect(page.getByTestId('monaco-editor')).toBeVisible();

    const marker = `autosave-${Date.now()}`;
    await page.evaluate((m) => {
      const append = (
        window as unknown as { __moleculeAppend?: (uri: string, text: string) => void }
      ).__moleculeAppend;
      if (!append) throw new Error('Editor test hook unavailable');
      append('src/index.ts', m);
    }, marker);
    await page.waitForTimeout(700);

    const savedBeforeReload = await page.evaluate(async (m) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('molecule-workspace');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const content = await new Promise<string>((resolve, reject) => {
        const tx = db.transaction('files', 'readonly');
        const req = tx.objectStore('files').get('project/src/index.ts');
        req.onsuccess = () => resolve(String(req.result ?? ''));
        req.onerror = () => reject(req.error);
      });
      return content.includes(m);
    }, marker);
    expect(savedBeforeReload).toBe(true);

    await page.reload();
    await waitForWorkbench(page);
    await openExplorerFile(page, 'src/index.ts');
    await expect(page.getByTestId('monaco-editor')).toBeVisible();

    const savedAfterReload = await page.evaluate(async (m) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('molecule-workspace');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const content = await new Promise<string>((resolve, reject) => {
        const tx = db.transaction('files', 'readonly');
        const req = tx.objectStore('files').get('project/src/index.ts');
        req.onsuccess = () => resolve(String(req.result ?? ''));
        req.onerror = () => reject(req.error);
      });
      return content.includes(m);
    }, marker);
    expect(savedAfterReload).toBe(true);
  });

  test('terminal panel shows xterm view', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Modifier shortcuts are chromium-only in CI');

    await waitForWorkbench(page);
    await page.keyboard.press('Control+`');
    await expect(page.getByTestId('panel-terminal')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('panel')).toBeVisible();
  });

  test('terminal echo command works', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Modifier shortcuts are chromium-only in CI');

    await waitForWorkbench(page);
    await page.keyboard.press('Control+`');
    await expect(page.getByTestId('panel-terminal')).toBeVisible({ timeout: 10_000 });
    await page.evaluate(async () => {
      const run = (
        window as unknown as { __moleculeTerminalRun?: (line: string) => Promise<void> }
      ).__moleculeTerminalRun;
      if (!run) throw new Error('Terminal test hook unavailable');
      await run('echo hello-terminal');
    });
    await expect(page.getByTestId('panel-terminal')).toHaveAttribute('data-terminal-output', /hello-terminal/, {
      timeout: 8000,
    });
  });

  test('i18n switch updates menubar to Japanese', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Modifier shortcuts are chromium-only in CI');

    await waitForWorkbench(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('molecule:open-settings'));
    });
    await expect(page.getByTestId('settings-view')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('settings-locale').selectOption('ja');
    // i18n plugin applies on configuration change; dispatch ensures menubar re-renders
    await page.waitForTimeout(100);
    await expect(page.getByTestId('menubar')).toContainText('ファイル', { timeout: 5000 });
  });

  test('hello extension command is available', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Modifier shortcuts are chromium-only in CI');

    await waitForWorkbench(page);
    await page.keyboard.press('Control+Shift+P');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.getByPlaceholder(/command/i).fill('Hello Extension: Ping');
    await page.getByTestId('command-palette').getByText('Hello Extension: Ping').click();
    await expect(page.getByText(/bundled extension/i)).toBeVisible({ timeout: 5000 });
  });

  test('scm sidebar shows git branch and commit', async ({ page }) => {
    await waitForWorkbench(page);
    await page.getByTestId('activity-scm').click();
    await expect(page.getByTestId('scm-view')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('scm-view').getByText(/Branch:/)).toBeVisible();
    await expect(page.getByTestId('scm-commit')).toBeVisible();
  });

  test('status bar shows workspace root name', async ({ page }) => {
    await waitForWorkbench(page);
    await expect(page.getByTestId('status-workspace-root')).toBeVisible();
    await expect(page.getByTestId('status-workspace-root')).not.toHaveText('');
  });

  test('restores open editor tabs after reload', async ({ page }) => {
    await waitForWorkbench(page);
    await openExplorerFile(page, 'src/index.ts');
    await expect(page.getByTestId('monaco-editor')).toBeVisible();
    await page.getByTestId('tree-item-README.md').getByRole('button').click();
    await expect(page.getByRole('tab', { name: 'README.md' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'index.ts' })).toBeVisible();

    await page.waitForTimeout(300);
    await page.reload();
    await waitForWorkbench(page);
    await expect(page.getByRole('tab', { name: 'README.md' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tab', { name: 'index.ts' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /README\.md/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('AI suggest edit can be accepted', async ({ page }) => {
    await waitForWorkbench(page);
    await expect(page.getByTestId('ai-chat')).toBeVisible();
    await page.getByPlaceholder('Message AI…').fill('please suggest edit');
    await page.getByTestId('ai-send').click();
    await expect(page.getByTestId('ai-diff-preview')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('ai-diff-accept').click();
    await expect(page.getByTestId('ai-diff-preview')).toBeHidden({ timeout: 10_000 });
  });

  test('regex search finds line anchor in README', async ({ page }) => {
    await waitForWorkbench(page);
    await page.getByTestId('activity-search').click();
    await page.getByTestId('search-use-regex').check();
    await page.getByTestId('search-input').fill('^# Molecule');
    await page.getByTestId('search-view').getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('button', { name: /README\.md:1/ })).toBeVisible({ timeout: 10_000 });
  });

  test('explorer toolbar creates a new file', async ({ page }) => {
    await waitForWorkbench(page);
    await openExplorer(page);

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept(`e2e-new-${Date.now()}.txt`);
    });

    await page.getByTestId('explorer-new-file').click();
    await expect(page.getByTestId('monaco-editor')).toBeVisible({ timeout: 10_000 });
  });

  test('explorer can rename and delete a file', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Dialog handling is chromium-only in CI');

    await waitForWorkbench(page);
    await openExplorer(page);

    const fileName = `e2e-crud-${Date.now()}.txt`;
    page.once('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') await dialog.accept(fileName);
    });
    await page.getByTestId('explorer-new-file').click();
    await expect(page.getByTestId(`tree-item-${fileName}`)).toBeVisible({ timeout: 10_000 });

    await page.getByTestId(`tree-item-${fileName}`).click({ button: 'right' });
    await expect(page.getByTestId('explorer-context-menu')).toBeVisible();
    page.once('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') await dialog.accept(`${fileName}.renamed`);
    });
    await page.getByTestId('explorer-context-menu').getByRole('button', { name: 'Rename' }).click();
    await page.getByTestId('explorer-rename-input').fill(`${fileName}.renamed`);
    await page.getByTestId('explorer-rename-input').press('Enter');
    await expect(page.getByTestId(`tree-item-${fileName}.renamed`)).toBeVisible({ timeout: 10_000 });

    await page.getByTestId(`tree-item-${fileName}.renamed`).click({ button: 'right' });
    page.once('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') await dialog.accept();
    });
    await page.getByTestId('explorer-context-menu').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByTestId(`tree-item-${fileName}.renamed`)).toBeHidden({ timeout: 10_000 });
  });

  test('extensions panel lists bundled extensions', async ({ page }) => {
    await waitForWorkbench(page);
    await page.getByTestId('activity-extensions').click();
    await expect(page.getByTestId('extensions-view')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('extension-hello-extension')).toBeVisible();
    await expect(page.getByTestId('extension-sample-panel-extension')).toBeVisible();
    await expect(page.getByTestId('extensions-tab-installed')).toBeVisible();
    await expect(page.getByTestId('extensions-tab-available')).toBeVisible();
  });

  test('double-click extension opens detail tab in editor', async ({ page }) => {
    await waitForWorkbench(page);
    await page.getByTestId('activity-extensions').click();
    await expect(page.getByTestId('extensions-view')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('extension-hello-extension').dblclick();
    await expect(page.getByTestId('extension-detail-hello-extension')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('extension-detail-name')).toHaveText('Hello Extension');
    await expect(page.getByRole('tab', { name: 'Hello Extension' })).toBeVisible();
  });

  test('install calc extension shows activity icon after reload', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'localStorage install flow is chromium-only in CI');

    await waitForWorkbench(page);
    await page.getByTestId('activity-extensions').click();
    await expect(page.getByTestId('extensions-view')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('extensions-tab-available').click();
    await expect(page.getByTestId('extension-calc-extension')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('extension-install-calc-extension').click();
    await page.getByTestId('extensions-tab-installed').click();
    await expect(page.getByTestId('extension-calc-extension')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('extensions-reload').click();
    await waitForWorkbench(page);
    await expect(page.getByTestId('activity-calcPanel')).toBeVisible({ timeout: 10_000 });
  });

  test('sample panel extension activity opens sidebar view', async ({ page }) => {
    await waitForWorkbench(page);
    await expect(page.getByTestId('activity-samplePanel')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('activity-samplePanel').click();
    await expect(page.getByTestId('sidebar')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('sample-panel-view')).toBeVisible({ timeout: 10_000 });
  });
});
