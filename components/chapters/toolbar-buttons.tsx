'use client';

import { useEditorState } from '@udecode/plate-common';
import { useAIEditor } from './ai/ai-editor-provider';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { BlockToolbarButton } from '@/components/ui/block-toolbar-button';
import { AISlashMenu } from './ai/ai-slash-menu';

export function ToolbarButtons() {
  const editor = useEditorState();
  const { openAIEditor } = useAIEditor();

  return (
    <>
      {/* AI Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={openAIEditor}
        className="h-8 px-2 text-xs"
      >
        <Icons.sparkles className="mr-1 h-3.5 w-3.5" />
        <span>AI</span>
      </Button>

      {/* Text Formatting */}
      <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
        <Icons.bold className="h-4 w-4" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
        <Icons.italic className="h-4 w-4" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
        <Icons.underline className="h-4 w-4" />
      </MarkToolbarButton>

      {/* Headings */}
      <BlockToolbarButton
        value="heading"
        tooltip="Heading 1"
        onClick={() => editor?.tf.h1.toggle()}
      >
        <Icons.h1 className="h-4 w-4" />
      </BlockToolbarButton>
      <BlockToolbarButton
        value="heading"
        tooltip="Heading 2"
        onClick={() => editor?.tf.h2.toggle()}
      >
        <Icons.h2 className="h-4 w-4" />
      </BlockToolbarButton>

      {/* Lists */}
      <BlockToolbarButton
        value="ul"
        tooltip="Bulleted List"
        onClick={() => editor?.tf.ul.toggle()}
      >
        <Icons.list className="h-4 w-4" />
      </BlockToolbarButton>
      <BlockToolbarButton
        value="ol"
        tooltip="Numbered List"
        onClick={() => editor?.tf.ol.toggle()}
      >
        <Icons.listOrdered className="h-4 w-4" />
      </BlockToolbarButton>

      {/* Block Elements */}
      <BlockToolbarButton
        value="blockquote"
        tooltip="Blockquote"
        onClick={() => editor?.tf.blockquote.toggle()}
      >
        <Icons.quote className="h-4 w-4" />
      </BlockToolbarButton>
      <BlockToolbarButton
        value="code"
        tooltip="Code Block"
        onClick={() => editor?.tf.code_block.toggle()}
      >
        <Icons.code className="h-4 w-4" />
      </BlockToolbarButton>

      {/* Slash Menu */}
      <AISlashMenu />
    </>
  );
}
