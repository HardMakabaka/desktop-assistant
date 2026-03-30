import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import electronPath from 'electron';
import { _electron as electron } from 'playwright';

const repoDir = process.cwd();

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

async function getScrollMetrics(page, selector) {
  return page.locator(selector).evaluate(node => ({
    scrollTop: node.scrollTop,
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
  }));
}

async function setScrollTop(page, selector, value) {
  await page.locator(selector).evaluate((node, nextValue) => {
    node.scrollTop = nextValue;
  }, value);
}

async function wheelScroll(page, selector, deltaY = 1200) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`No bounding box for ${selector}`);
  }

  await page.mouse.move(box.x + Math.min(24, box.width / 2), box.y + Math.min(24, box.height / 2));
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(250);
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

async function ensureRichMode(page) {
  const richEditor = page.locator('.mdxeditor-root-contenteditable');
  if (await richEditor.isVisible().catch(() => false)) {
    return richEditor;
  }

  const switchButton = page.getByRole('button', { name: '切换到所见即所得' });
  await switchButton.waitFor({ state: 'visible' });
  await switchButton.click();
  await richEditor.waitFor({ state: 'visible' });
  return richEditor;
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
      },
    });

    const mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForLoadState('domcontentloaded');
    await mainWindow.getByLabel('新建便签').click();

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

    const longText = Array.from({ length: 160 }, (_, index) => `- scroll test line ${index + 1} lorem ipsum dolor sit amet`).join('\n');

    await noteWindow.locator('.note-source-textarea').click();
    await noteWindow.keyboard.insertText(longText);
    await noteWindow.waitForTimeout(700);

    await setScrollTop(noteWindow, '.note-source-textarea', 0);
    const sourceBefore = await getScrollMetrics(noteWindow, '.note-source-textarea');
    assert(sourceBefore.scrollHeight > sourceBefore.clientHeight, 'Source mode should overflow vertically');

    await wheelScroll(noteWindow, '.note-source-textarea');
    const sourceAfter = await getScrollMetrics(noteWindow, '.note-source-textarea');
    assert(sourceAfter.scrollTop > sourceBefore.scrollTop + 100, 'Mouse wheel should scroll in source mode');

    await ensureRichMode(noteWindow);
    await noteWindow.waitForTimeout(400);

    await setScrollTop(noteWindow, '.mdxeditor-root-contenteditable', 0);
    const richBefore = await getScrollMetrics(noteWindow, '.mdxeditor-root-contenteditable');
    assert(richBefore.scrollHeight > richBefore.clientHeight, 'Rich text mode should overflow vertically');

    await wheelScroll(noteWindow, '.mdxeditor-root-contenteditable');
    const richAfter = await getScrollMetrics(noteWindow, '.mdxeditor-root-contenteditable');
    assert(richAfter.scrollTop > richBefore.scrollTop + 100, 'Mouse wheel should scroll in rich text mode');

    console.log(
      JSON.stringify(
        {
          ok: true,
          sourceMode: sourceAfter,
          richTextMode: richAfter,
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

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
