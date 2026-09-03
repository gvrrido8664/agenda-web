'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Save, Quote, Undo, Redo, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

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

      <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className={btnClass(editor.isActive('highlight', { color: '#fef08a' }))} title="Resaltar amarillo" aria-label="Resaltar amarillo"><div className="w-4 h-4 rounded-full bg-yellow-200 border border-yellow-400" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()} className={btnClass(editor.isActive('highlight', { color: '#bbf7d0' }))} title="Resaltar verde" aria-label="Resaltar verde"><div className="w-4 h-4 rounded-full bg-green-200 border border-green-400" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fecaca' }).run()} className={btnClass(editor.isActive('highlight', { color: '#fecaca' }))} title="Resaltar rojo" aria-label="Resaltar rojo"><div className="w-4 h-4 rounded-full bg-red-200 border border-red-400" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()} className={btnClass(editor.isActive('highlight', { color: '#bfdbfe' }))} title="Resaltar azul" aria-label="Resaltar azul"><div className="w-4 h-4 rounded-full bg-blue-200 border border-blue-400" /></button>
      <button type="button" onClick={() => editor.chain().focus().unsetHighlight().run()} className={btnClass(false)} title="Quitar resaltado" aria-label="Quitar resaltado"><div className="w-4 h-4 rounded-full bg-white border border-gray-300 relative overflow-hidden"><div className="absolute inset-0 bg-red-500 w-[2px] h-full rotate-45 left-1.5" /></div></button>

      <div className="w-px h-5 bg-gray-300 mx-1" />
      
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Lista de viñetas" aria-label="Lista de viñetas"><List className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Lista numerada" aria-label="Lista numerada"><ListOrdered className="w-4 h-4" /></button>
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-slate max-w-none w-full focus:outline-none min-h-[400px] px-5 py-6 sm:px-8 tiptap-table-split ${readOnly ? 'cursor-default' : ''}`,
      },
    },
  })

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
      setContent(initialContent)
    }
  }, [initialContent, editor])

  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  return (
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
  )
}
