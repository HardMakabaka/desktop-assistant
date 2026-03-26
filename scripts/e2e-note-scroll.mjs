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
  const sourceEditor = page.locator('.cm-editor');
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

    await noteWindow.locator('.cm-content').click();
    await noteWindow.keyboard.insertText(longText);
    await noteWindow.waitForTimeout(700);

    await setScrollTop(noteWindow, '.cm-scroller', 0);
    const sourceBefore = await getScrollMetrics(noteWindow, '.cm-scroller');
    assert(sourceBefore.scrollHeight > sourceBefore.clientHeight, 'Source mode should overflow vertically');

    await wheelScroll(noteWindow, '.cm-scroller');
    const sourceAfter = await getScrollMetrics(noteWindow, '.cm-scroller');
    assert(sourceAfter.scrollTop > sourceBefore.scrollTop + 100, 'Mouse wheel should scroll in source mode');

    await noteWindow.getByRole('button', { name: '切换到所见即所得' }).click();
    await noteWindow.locator('.mdxeditor-root-contenteditable').waitFor({ state: 'visible' });
    await noteWindow.waitForTimeout(400);

    await setScrollTop(noteWindow, '.mdxeditor-root-contenteditable', 0);
    const richBefore = await getScrollMetrics(noteWindow, '.mdxeditor-root-contenteditable');
    if (richBefore.scrollHeight <= richBefore.clientHeight) {
      const richDebug = await noteWindow.evaluate(() => {
        const root = document.querySelector('.mdxeditor-root-contenteditable');
        const ancestors = [];
        let current = root;
        while (current && ancestors.length < 8) {
          const style = window.getComputedStyle(current);
          ancestors.push({
            className: current.className,
            clientHeight: current.clientHeight,
            scrollHeight: current.scrollHeight,
            offsetHeight: current.offsetHeight,
            display: style.display,
            flex: style.flex,
            minHeight: style.minHeight,
            height: style.height,
            overflowY: style.overflowY,
          });
          current = current.parentElement;
        }

        return {
          root: document.querySelector('.mdxeditor-root-contenteditable')?.outerHTML?.slice(0, 1200) ?? null,
          prose: document.querySelector('.note-mdx-prose')?.outerHTML?.slice(0, 1200) ?? null,
          container: document.querySelector('.note-mdx')?.outerHTML?.slice(0, 1200) ?? null,
          ancestors,
        };
      });
      console.log('richDebug', JSON.stringify(richDebug, null, 2));
    }
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
