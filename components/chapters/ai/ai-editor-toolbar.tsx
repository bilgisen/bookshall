'use client';

import { useEditorState } from '@udecode/plate-common';
import { useAIEditor } from './ai-editor-provider';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function AIEditorToolbar() {
  const editor = useEditorState();
  const { openAIEditor } = useAIEditor();

  // These are example AI actions that can be performed on selected text
  const aiActions = [
    {
      name: 'Improve',
      icon: Icons.wand2,
      description: 'Improve writing',
      command: '/improve',
    },
    {
      name: 'Summarize',
      icon: Icons.fileText,
      description: 'Summarize text',
      command: '/summarize',
    },
    {
      name: 'Expand',
      icon: Icons.plus,
      description: 'Expand text',
      command: '/expand',
    },
    {
      name: 'Simplify',
      icon: Icons.minimize2,
      description: 'Simplify text',
      command: '/simplify',
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-lg border bg-background p-1 shadow-lg">
      {aiActions.map((action) => (
        <Tooltip key={action.command}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                openAIEditor();
                // Additional logic for the specific action
              }}
            >
              <action.icon className="h-4 w-4" />
              <span className="sr-only">{action.name}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{action.description}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
