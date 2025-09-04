'use client';

import { AIChatPlugin } from '@platejs/ai/react';
import { usePlateEditor } from '@platejs/core/react';
import { cn } from '@/lib/utils';
import { Node } from 'slate';
import type { Node as SlateNode } from 'slate';

export function AIMenu() {
  const editor = usePlateEditor();
  const api = editor?.getApi(AIChatPlugin);

  const lastNode: SlateNode | undefined = api?.aiChat.node({ streaming: true })?.[0];
  const content = lastNode ? Node.string(lastNode) : 'Henüz bir yanıt yok...';

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-medium text-gray-700">AI Assistant</div>

      <div className="min-h-[60px] whitespace-pre-wrap text-sm text-gray-900">
        {content}
      </div>

      <button
        onClick={() =>
          api?.aiChat.submit({
            mode: 'insert',
            prompt: 'Metni geliştir',
          })
        }
        className={cn(
          'mt-3 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700'
        )}
      >
        Metni Geliştir
      </button>
    </div>
  );
}
