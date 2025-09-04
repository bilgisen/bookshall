import { createPlugins, withProps } from '@platejs/core/react';
import { createDndPlugin } from '@platejs/dnd';
import { createAIEditorPlugin } from './ai/plugin';

// Import plate plugins
import {
  createBoldPlugin,
  createItalicPlugin,
  createUnderlinePlugin,
  createStrikethroughPlugin,
  createHeadingPlugin,
  createParagraphPlugin,
  createBlockquotePlugin,
  createCodeBlockPlugin,
  createHorizontalRulePlugin,
  createLinkPlugin,
  createListPlugin,
  createImagePlugin,
  createTablePlugin,
  createTodoListPlugin,
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_H4,
  ELEMENT_H5,
  ELEMENT_H6,
} from '@platejs/core';

// Import components
import { withDraggables } from './draggable/with-draggables';

export const plugins = createPlugins(
  [
    // Basic marks
    createBoldPlugin(),
    createItalicPlugin(),
    createUnderlinePlugin(),
    createStrikethroughPlugin(),
    
    // Block elements
    createParagraphPlugin(),
    createHeadingPlugin(),
    createBlockquotePlugin(),
    createCodeBlockPlugin(),
    createHorizontalRulePlugin(),
    createLinkPlugin(),
    createListPlugin(),
    createImagePlugin(),
    createTablePlugin(),
    createTodoListPlugin(),
    
    // AI Editor
    createAIEditorPlugin(),
    
    // DnD
    createDndPlugin({
      options: {
        enableScroller: true,
      },
    }),
  ],
  {
    components: withDraggables({
      // Add draggable components here
      [ELEMENT_H1]: withProps(HeadingElement, { variant: 'h1' }),
      [ELEMENT_H2]: withProps(HeadingElement, { variant: 'h2' }),
      [ELEMENT_H3]: withProps(HeadingElement, { variant: 'h3' }),
      [ELEMENT_H4]: withProps(HeadingElement, { variant: 'h4' }),
      [ELEMENT_H5]: withProps(HeadingElement, { variant: 'h5' }),
      [ELEMENT_H6]: withProps(HeadingElement, { variant: 'h6' }),
    }),
  }
);
