import React from 'react'
import { Editor, Range, Element, Ancestor, Descendant } from 'slate'
import { useVirtual } from 'react-virtual'

import ElementComponent from '../components/element'
import TextComponent from '../components/text'
import { ReactEditor } from '..'
import { useSlateStatic } from './use-slate-static'
import { useDecorate } from './use-decorate'
import { NODE_TO_INDEX, NODE_TO_PARENT } from '../utils/weak-maps'
import {
  RenderElementProps,
  RenderLeafProps,
  RenderPlaceholderProps,
} from '../components/editable'
import { SelectedContext } from './use-selected'

/**
 * Children.
 */

interface CustomOptions {
  isEditable?: boolean
  parentHeight?: string
}
const useChildren = (props: {
  decorations: Range[]
  node: Ancestor
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  selection: Range | null
  aftrpartyOptions?: CustomOptions
}) => {
  const { isEditable, parentHeight } = props.aftrpartyOptions ?? {}
  const parentRef = React.useRef<HTMLDivElement>(null)

  const {
    decorations,
    node,
    renderElement,
    renderPlaceholder,
    renderLeaf,
    selection,
  } = props

  const rowVirtualizer = useVirtual({
    size: node.children.length,
    parentRef,
  })
  const decorate = useDecorate()
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, node)
  const children: React.ReactNode[] = []
  const isLeafBlock =
    Element.isElement(node) &&
    !editor.isInline(node) &&
    Editor.hasInlines(editor, node)

  for (let i = 0; i < node.children.length; i++) {
    const p = path.concat(i)
    const n = node.children[i] as Descendant
    const key = ReactEditor.findKey(editor, n)
    const range = Editor.range(editor, p)
    const sel = selection && Range.intersection(range, selection)
    const ds = decorate([n, p])

    for (const dec of decorations) {
      const d = Range.intersection(dec, range)

      if (d) {
        ds.push(d)
      }
    }

    if (Element.isElement(n)) {
      children.push(
        <SelectedContext.Provider key={`provider-${key.id}`} value={!!sel}>
          <ElementComponent
            decorations={ds}
            element={n}
            key={key.id}
            renderElement={renderElement}
            renderPlaceholder={renderPlaceholder}
            renderLeaf={renderLeaf}
            selection={sel}
          />
        </SelectedContext.Provider>
      )
    } else {
      children.push(
        <TextComponent
          decorations={ds}
          key={key.id}
          isLast={isLeafBlock && i === node.children.length - 1}
          parent={node}
          renderPlaceholder={renderPlaceholder}
          renderLeaf={renderLeaf}
          text={n}
        />
      )
    }

    NODE_TO_INDEX.set(n, i)
    NODE_TO_PARENT.set(n, node)
  }
  if (!isEditable) {
    return children
  }
  return (
    <div
      ref={parentRef}
      style={{
        height: parentHeight ?? '100vh',
        width: '100%',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.totalSize}px`,
          position: 'relative',
          width: '100%',
          color: 'inherit',
        }}
      >
        {rowVirtualizer.virtualItems.map(virtualRow => (
          <div
            key={virtualRow.index}
            ref={virtualRow.measureRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div>{children[virtualRow.index]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default useChildren
