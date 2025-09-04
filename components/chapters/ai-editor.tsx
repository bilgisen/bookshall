'use client';

import { Plate, PlateProvider, type PlateProps } from '@udecode/plate-common';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AIEditorProvider } from './ai/ai-editor-provider';
import { AIFloatingToolbar } from './ai/ai-floating-toolbar';
import { AIFixedToolbar } from './ai/ai-fixed-toolbar';
import { AIFloatingToolbarButtons } from './ai/ai-floating-toolbar-buttons';
import { AIFixedToolbarButtons } from './ai/ai-fixed-toolbar-buttons';
import { AIEditorToolbar } from './ai/ai-editor-toolbar';
import { AIMenu } from './ai/ai-menu';
import { AISlashMenu } from './ai/ai-slash-menu';

export function AIEditor({
  children,
  ...props
}: PlateProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <AIEditorProvider>
        <Plate {...props}>
          <AIFixedToolbar>
            <AIFixedToolbarButtons />
          </AIFixedToolbar>

          <div className="relative">
            {children}
            
            <AIFloatingToolbar>
              <AIFloatingToolbarButtons />
            </AIFloatingToolbar>
            
            <AIEditorToolbar />
            <AIMenu />
            <AISlashMenu />
          </div>
        </Plate>
      </AIEditorProvider>
    </DndProvider>
  );
}
