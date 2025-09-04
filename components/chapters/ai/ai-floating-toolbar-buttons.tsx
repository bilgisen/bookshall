'use client';

import { useEditorState } from '@udecode/plate-common';
import { useAIEditor } from './ai-editor-provider';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

export function AIFloatingToolbarButtons() {
  const editor = useEditorState();
  const { openAIEditor } = useAIEditor();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openAIEditor}
        className="h-8 px-2 text-xs"
      >
        <Icons.sparkles className="mr-1 h-3.5 w-3.5" />
        <span>AI Edit</span>
      </Button>
      
      {/* Add more floating toolbar buttons as needed */}
    </>
  );
}
