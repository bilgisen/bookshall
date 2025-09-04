import { Draggable, type DraggableProps } from '@udecode/plate-dnd';
import { type ComponentType, type FC, type ReactNode } from 'react';

type WithDraggableProps = {
  component: ComponentType<any>;
  componentRef?: any;
  classNames?: string;
  styles?: any;
};

export const withDraggable = <T,>(
  Component: ComponentType<T>,
  {
    component: DraggableComponent = Draggable,
    componentRef,
    classNames,
    styles,
  }: WithDraggableProps = {} as any
) => {
  const DraggableContent: FC<DraggableProps> = (props) => {
    const { element, editor, ...rest } = props;

    return (
      <DraggableComponent
        editor={editor}
        element={element}
        componentRef={componentRef}
        className={classNames}
        styles={styles}
      >
        <Component {...(rest as any)} element={element} editor={editor} />
      </DraggableComponent>
    );
  };

  return DraggableContent as unknown as ComponentType<T>;
};

type WithDraggablesOptions = {
  [key: string]: ComponentType<any>;
};

export const withDraggables = (components: WithDraggablesOptions) => {
  const newComponents = { ...components };

  Object.keys(components).forEach((key) => {
    newComponents[key] = withDraggable(newComponents[key]);
  });

  return newComponents;
};
