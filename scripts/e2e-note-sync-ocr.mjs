import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import electronPath from 'electron';
import { _electron as electron } from 'playwright';

const repoDir = process.cwd();
const MOCK_OCR_TEXT = 'OCR inserted line';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForWindow(electronApp, predicate, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const windows = electronApp.windows();
    for (const window of windows) {
      if (await predicate(window)) {
        return window;
      }
    }
    await sleep(150);
  }

  throw new Error('Timed out waiting for target Electron window');
}

async function dragSelect(page, selector) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`No bounding box for ${selector}`);
  }

  await page.mouse.move(box.x + 80, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 220, { steps: 12 });
  await page.mouse.up();
}

async function getMarkdown(page) {
  return page.evaluate(() => {
    const source = document.querySelector('.note-source-textarea');
    if (source instanceof HTMLTextAreaElement) {
      return source.value || '';
    }
    const preview = document.querySelector('.note-markdown-preview');
    return preview?.textContent || '';
  });
}

async function ensureSourceMode(page) {
  const sourceEditor = page.locator('.note-source-textarea');
  if (await sourceEditor.isVisible().catch(() => false)) {
    return sourceEditor;
  }

  const switchButton = page.getByRole('button', { name: '切换到源码模式' });
  await switchButton.waitFor({ state: 'visible' });
  await switchButton.click();
  await sourceEditor.waitFor({ state: 'visible' });
  return sourceEditor;
}

async function ensurePreviewMode(page) {
  const preview = page.locator('.note-markdown-preview');
  if (await preview.isVisible().catch(() => false)) {
    return preview;
  }

  const switchButton = page.getByRole('button', { name: '切换到预览模式' });
  await switchButton.waitFor({ state: 'visible' });
  await switchButton.click();
  await preview.waitFor({ state: 'visible' });
  return preview;
}

async function main() {
  const appDataRoot = await mkdtemp(path.join(os.tmpdir(), 'desktop-assistant-e2e-'));
  let electronApp;

  try {
    electronApp = await electron.launch({
      executablePath: electronPath,
      args: ['.'],
      cwd: repoDir,
      env: {
        ...process.env,
        APPDATA: appDataRoot,
        DESKTOP_ASSISTANT_E2E: '1',
        DESKTOP_ASSISTANT_E2E_OCR_TEXT: MOCK_OCR_TEXT,
      },
    });

    const mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForLoadState('domcontentloaded');
    await mainWindow.getByRole('button', { name: '新建便签' }).click();

    const noteWindow = await waitForWindow(electronApp, async window => {
      try {
        await window.waitForLoadState('domcontentloaded');
        return window.url().includes('note.html');
      } catch {
        return false;
      }
    });

    await noteWindow.bringToFront();
    await noteWindow.getByRole('button', { name: 'OCR 截图识别文字' }).waitFor({ state: 'visible' });
    await ensureSourceMode(noteWindow);
    await noteWindow.locator('.note-source-textarea').click();
    await noteWindow.keyboard.insertText('# Sync heading\nsource side text');
    await noteWindow.waitForTimeout(500);

    const preview = await ensurePreviewMode(noteWindow);
    await expectText(preview, 'Sync heading');
    await expectText(preview, 'source side text');

    await noteWindow.getByRole('button', { name: 'OCR 截图识别文字' }).click();

    const ocrWindow = await waitForWindow(electronApp, async window => {
      try {
        await window.waitForLoadState('domcontentloaded');
        return window.url().includes('ocr.html');
      } catch {
        return false;
      }
    });

    await ocrWindow.bringToFront();
    const ocrUrl = ocrWindow.url();
    console.log('ocrWindowUrl', ocrUrl);
    try {
      await ocrWindow.getByText('拖拽框选要识别的区域').waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      const bodyText = await ocrWindow.locator('body').textContent();
      throw new Error(`OCR screenshot did not become ready. url=${ocrUrl} body=${bodyText || ''} cause=${error instanceof Error ? error.message : String(error)}`);
    }

    await noteWindow.bringToFront();
    await preview.waitFor({ state: 'visible' });
    await noteWindow.getByText('OCR 识别结果已插入').waitFor({ state: 'visible' });
    await expectText(preview, 'OCR inserted line');

    await ensureSourceMode(noteWindow);
    const sourceEditor = noteWindow.locator('.note-source-textarea');
    await expectInputValue(sourceEditor, 'Sync heading');
    await expectInputValue(sourceEditor, 'source side text');
    await expectInputValue(sourceEditor, 'OCR inserted line');

    const markdown = await getMarkdown(noteWindow);
    assert.match(markdown, /Sync heading/);
    assert.match(markdown, /source side text/);
    assert.match(markdown, /OCR inserted line/);

    console.log(
      JSON.stringify(
        {
          ok: true,
          markdown,
        },
        null,
        2,
      ),
    );
  } finally {
    if (electronApp) {
      await electronApp.close();
    }
    await rm(appDataRoot, { recursive: true, force: true });
  }
}

async function expectText(locator, text) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    const value = await locator.textContent();
    if ((value || '').includes(text)) {
      return;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for text: ${text}`);
}

async function expectInputValue(locator, text) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    const value = await locator.inputValue();
    if ((value || '').includes(text)) {
      return;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for input value: ${text}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
