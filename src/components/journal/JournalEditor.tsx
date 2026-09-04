'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Save, Quote, Undo, Redo, RotateCcw, CheckSquare } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface JournalEditorProps {
  initialContent: string
  template: string
  onSave?: (content: string) => void
  isSaving?: boolean
  readOnly?: boolean
}

const MenuBar = ({ editor, template }: { editor: Editor | null, template: string }) => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!editor) return
    const update = () => forceUpdate((prev) => prev + 1)
    editor.on('transaction', update)
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  const btnClass = (isActive: boolean) => 
    `p-2 rounded-lg transition-colors flex items-center justify-center ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-2xl border-b border-slate-200/70 bg-white/80 px-3 py-2 backdrop-blur-md sm:px-4">
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btnClass(false)} title="Deshacer" aria-label="Deshacer"><Undo className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btnClass(false)} title="Rehacer" aria-label="Rehacer"><Redo className="w-4 h-4" /></button>
      
      <div className="w-px h-5 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Negrita" aria-label="Negrita"><Bold className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Cursiva" aria-label="Cursiva"><Italic className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Subrayado" aria-label="Subrayado"><UnderlineIcon className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Tachado" aria-label="Tachado"><Strikethrough className="w-4 h-4" /></button>
      
      <div className="w-px h-5 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Lista de viñetas" aria-label="Lista de viñetas"><List className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Lista numerada" aria-label="Lista numerada"><ListOrdered className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnClass(editor.isActive('taskList'))} title="Lista de tareas (Checklist)" aria-label="Lista de tareas"><CheckSquare className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Cita" aria-label="Cita"><Quote className="w-4 h-4" /></button>

      <div className="flex-1" />

      <button 
        type="button"
        onClick={() => {
          if (confirm('¿Estás seguro de que quieres restaurar la plantilla? Se borrarán tus notas actuales en esta semana.')) {
            editor.commands.setContent(template)
          }
        }}
        className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors border border-red-200"
        title="Restaurar formato original"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Restaurar Plantilla</span>
      </button>
    </div>
  )
}

export default function JournalEditor({ initialContent, template, onSave, isSaving = false, readOnly = false }: JournalEditorProps) {
  const [content, setContent] = useState(initialContent)
  const editorRef = useRef<Editor | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
        onReadOnlyChecked: (_node, checked) => {
          const ed = editorRef.current
          if (!ed) return false

          const checkboxes = Array.from(ed.view.dom.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
          const clickedIndex = checkboxes.findIndex((checkbox) => checkbox.checked !== (checkbox.closest('li')?.dataset.checked === 'true'))
          let taskIndex = 0
          let position: number | null = null

          ed.state.doc.descendants((node, pos) => {
            if (position !== null || node.type.name !== 'taskItem') return position === null
            if (taskIndex++ === clickedIndex) position = pos
            return position === null
          })

          if (position === null) return false
          const task = ed.state.doc.nodeAt(position)
          if (!task) return false
          ed.view.dispatch(ed.state.tr.setNodeMarkup(position, undefined, { ...task.attrs, checked }))
          return true
        }
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setContent(html)
      if (!editor.isEditable) onSaveRef.current?.(html)
    },
    editorProps: {
      attributes: {
        class: `prose prose-slate max-w-none w-full focus:outline-none min-h-[400px] px-5 py-6 sm:px-8 tiptap-table-split ${readOnly ? 'cursor-default' : ''}`,
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
      setContent(initialContent)
    }
  }, [initialContent, editor])

  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  return (
    <>
      <style>{`
        ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        ul[data-type="taskList"] p {
          margin: 0;
        }
        ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }
        ul[data-type="taskList"] li > label {
          margin-right: 0.5rem;
          margin-top: 0.2rem;
          user-select: none;
        }
        ul[data-type="taskList"] li > div {
          flex: 1;
        }
      `}</style>
      <div className={readOnly ? '' : 'relative flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-md transition-shadow focus-within:shadow-2xl'}>
        {!readOnly && <MenuBar editor={editor} template={template} />}
        
        <div className="flex-1 overflow-y-auto bg-transparent">
          <EditorContent editor={editor} />
        </div>

        {!readOnly && <div className="flex items-center justify-end border-t border-slate-200/70 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={() => onSave?.(content)}
            disabled={isSaving}
            className="flex items-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-70"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Bitácora'}
          </button>
        </div>}
      </div>
    </>
  )
}
