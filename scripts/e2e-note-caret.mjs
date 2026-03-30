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

async function getCurrentNoteContent(page) {
  return page.evaluate(async () => {
    const noteId = new URLSearchParams(window.location.search).get('id');
    const notes = await window.desktopAPI.getNotes();
    return notes.find(note => note.id === noteId)?.content ?? null;
  });
}

async function getScrollTop(page, selector) {
  return page.locator(selector).evaluate(node => node.scrollTop);
}

async function clickRichTextEnd(page) {
  const root = page.locator('.mdxeditor-root-contenteditable');
  await root.evaluate(node => {
    node.scrollTop = node.scrollHeight;
  });

  const lastLine = page.locator('.mdxeditor-root-contenteditable li, .mdxeditor-root-contenteditable p').last();
  await lastLine.scrollIntoViewIfNeeded();
  const box = await lastLine.boundingBox();
  if (!box) {
    throw new Error('No rich text line found to place caret');
  }

  await page.mouse.move(box.x + Math.max(6, box.width - 10), box.y + box.height / 2);
  await page.mouse.click(box.x + Math.max(6, box.width - 10), box.y + box.height / 2);
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

    const sourceTail = ' [source-tail-check]';
    const richTail = ' [rich-tail-check]';
    const longText = Array.from({ length: 160 }, (_, index) => `- caret test line ${index + 1} lorem ipsum dolor sit amet`).join('\n');

    await ensureSourceMode(noteWindow);
    await noteWindow.locator('.note-source-textarea').click();
    await noteWindow.keyboard.insertText(longText);
    await noteWindow.waitForTimeout(700);
    await noteWindow.keyboard.press('Control+End');
    await noteWindow.locator('.note-source-textarea').evaluate(node => {
      node.scrollTop = node.scrollHeight;
    });
    const sourceScrollBefore = await getScrollTop(noteWindow, '.note-source-textarea');
    await noteWindow.keyboard.type(sourceTail, { delay: 60 });
    await noteWindow.waitForTimeout(700);
    const sourceScrollAfter = await getScrollTop(noteWindow, '.note-source-textarea');
    const sourceContent = await getCurrentNoteContent(noteWindow);

    assert.equal(sourceContent, `${longText}${sourceTail}`);
    assert(sourceScrollBefore > 100, 'Source mode should be scrolled away from the top before typing');
    assert(sourceScrollAfter > 100, 'Source mode typing should not jump back to the top');

    await ensureRichMode(noteWindow);
    await noteWindow.waitForTimeout(500);
    await clickRichTextEnd(noteWindow);
    const richScrollBefore = await getScrollTop(noteWindow, '.mdxeditor-root-contenteditable');
    await noteWindow.keyboard.type(richTail, { delay: 60 });
    await noteWindow.waitForTimeout(700);
    const richScrollAfter = await getScrollTop(noteWindow, '.mdxeditor-root-contenteditable');
    const richContent = await getCurrentNoteContent(noteWindow);

    assert(richContent && richContent.includes('caret test line 160'), 'Rich text mode should keep the existing long-form content');
    assert(richContent && richContent.includes('source-tail-check'), 'Rich text mode should preserve the source-mode append');
    assert(richContent && richContent.includes('rich-tail-check'), 'Rich text mode should append newly typed content');
    assert(richScrollBefore > 100, 'Rich text mode should be scrolled away from the top before typing');
    assert(richScrollAfter > 100, 'Rich text typing should not jump back to the top');

    await ensureSourceMode(noteWindow);
    const sourceValueAfterRichEdit = await noteWindow.locator('.note-source-textarea').inputValue();
    assert(sourceValueAfterRichEdit.includes('caret test line 160'), 'Source mode should still show the original note body after rich editing');
    assert(sourceValueAfterRichEdit.includes('source-tail-check'), 'Source mode should keep the source append after returning from rich mode');
    assert(sourceValueAfterRichEdit.includes('rich-tail-check'), 'Source mode should show content entered in rich mode');

    console.log(
      JSON.stringify(
        {
          ok: true,
          sourceScrollBefore,
          sourceScrollAfter,
          richScrollBefore,
          richScrollAfter,
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
