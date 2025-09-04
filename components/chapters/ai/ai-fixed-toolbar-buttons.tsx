'use client';

import { useEditorState } from '@udecode/plate-common';
import { useAIEditor } from './ai-editor-provider';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

export function AIFixedToolbarButtons() {
  const editor = useEditorState();
  const { openAIEditor } = useAIEditor();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openAIEditor}
        className="gap-1"
      >
        <Icons.sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">AI</span>
      </Button>
      
      {/* Add more fixed toolbar buttons as needed */}
    </>
  );
}
