'use client';

import { useEditorState } from '@udecode/plate-common';
import { useAIEditor } from './ai-editor-provider';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useState } from 'react';

const AI_COMMANDS = [
  {
    name: 'Generate Text',
    description: 'Generate text based on a prompt',
    icon: Icons.sparkles,
    command: '/generate',
  },
  {
    name: 'Improve Writing',
    description: 'Improve the selected text',
    icon: Icons.wand2,
    command: '/improve',
  },
  {
    name: 'Summarize',
    description: 'Summarize the selected text',
    icon: Icons.fileText,
    command: '/summarize',
  },
  {
    name: 'Expand',
    description: 'Expand on the selected text',
    icon: Icons.plus,
    command: '/expand',
  },
];

export function AISlashMenu() {
  const [open, setOpen] = useState(false);
  const { openAIEditor } = useAIEditor();
  const editor = useEditorState();

  const handleSelect = (command: string) => {
    setOpen(false);
    openAIEditor();
    // Additional logic based on the selected command
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Icons.slash className="mr-1 h-3.5 w-3.5" />
          <span>AI Commands</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search commands..." />
          <CommandList>
            <CommandEmpty>No commands found.</CommandEmpty>
            <CommandGroup heading="AI Commands">
              {AI_COMMANDS.map((cmd) => (
                <CommandItem
                  key={cmd.command}
                  onSelect={() => handleSelect(cmd.command)}
                  className="cursor-pointer"
                >
                  <cmd.icon className="mr-2 h-4 w-4" />
                  <div>
                    <p className="font-medium">{cmd.name}</p>
                    <p className="text-xs text-muted-foreground">{cmd.description}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
