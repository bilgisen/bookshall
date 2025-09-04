'use client';

import { useEditorState } from '@platejs/core/react';
import { useAIEditor } from './ai-editor-provider';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export function AIMenu() {
  const editor = useEditorState();
  const { isAIEditorOpen, closeAIEditor, aiEditorValue, setAIEditorValue, isGenerating, generateWithAI } = useAIEditor();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      generateWithAI(prompt);
      setPrompt('');
    }
  };

  if (!isAIEditorOpen || !editor) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">AI Assistant</h3>
          <Button variant="ghost" size="icon" onClick={closeAIEditor}>
            <Icons.close className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What would you like to generate?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
            autoFocus
          />
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeAIEditor}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!prompt.trim() || isGenerating}>
              {isGenerating ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
