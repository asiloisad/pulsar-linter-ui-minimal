const { CompositeDisposable, Disposable } = require('atom')
const { StatusPanel } = require('./status')
const { LinterPanel } = require('./panel')

module.exports = {

  activate() {
    this.statusPanel = new StatusPanel(this)
    this.linterPanel = new LinterPanel(this)
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        this.patchEditor(editor)
      }),
      atom.workspace.observeActiveTextEditor(editor => {
        this.updateCurrent(editor)
      }),
      atom.commands.add('atom-workspace', {
        'linter-ui:toggle': () => this.linterPanel.toggle(),
      }),
      atom.commands.add('atom-text-editor:not([mini])', {
        'linter-ui:scroll-next': () => this.scrollNext(),
        'linter-ui:notify-next': () => this.notifyNext(),
      }),
    )
  },

  deactivate () {
    this.disposables.dispose()
    this.linterPanel.destroy()
    this.statusPanel.destroy()
    for (let buffer of this.getBuffers()) {
      if (buffer.linterUI) {
        buffer.linterUI.text.error.clear()
        buffer.linterUI.text.error.destroy()
        buffer.linterUI.text.warning.clear()
        buffer.linterUI.text.warning.destroy()
        buffer.linterUI.text.info.clear()
        buffer.linterUI.text.info.destroy()
        buffer.linterUI.high.error.clear()
        buffer.linterUI.high.error.destroy()
        buffer.linterUI.high.warning.clear()
        buffer.linterUI.high.warning.destroy()
        buffer.linterUI.high.info.clear()
        buffer.linterUI.high.info.destroy()
      }
      delete buffer.linterUI
    }
  },

  provideLinter() {
    return {
      name: 'linter-ui-minimal',
      render: (args) => {
        this.assignMessages(args)
        this.updateMarkers()
        this.updateCurrent()
      },
      didBeginLinting: () => {},
      didFinishLinting: () => {},
      dispose: () => {},
    }
  },

  patchEditor(editor) {
    const buffer = editor.getBuffer()
    if (!buffer.linterUI) {
      buffer.linterUI = {
        text: {
          error: buffer.addMarkerLayer(),
          warning: buffer.addMarkerLayer(),
          info: buffer.addMarkerLayer(),
        },
        high: {
          error: buffer.addMarkerLayer(),
          warning: buffer.addMarkerLayer(),
          info: buffer.addMarkerLayer(),
        },
        messages: [],
        updateRequired: false,
      }
    }
    editor.decorateMarkerLayer(buffer.linterUI.text.error,
      { type:'text', class:'linter-text-error' })
    editor.decorateMarkerLayer(buffer.linterUI.text.warning,
      { type:'text', class:'linter-text-warning' })
    editor.decorateMarkerLayer(buffer.linterUI.text.info,
      { type:'text', class:'linter-text-info' })
    editor.decorateMarkerLayer(buffer.linterUI.high.error,
      { type:'highlight', class:'linter-high-error' })
    editor.decorateMarkerLayer(buffer.linterUI.high.warning,
      { type:'highlight', class:'linter-high-warning' })
    editor.decorateMarkerLayer(buffer.linterUI.high.info,
      { type:'highlight', class:'linter-high-info' })
  },

  getBuffers() {
    return new Set(atom.workspace.getTextEditors().map(editor => editor.getBuffer()))
  },

  assignMessages(args) {
    for (let buffer of this.getBuffers()) {
      let bufferPath = buffer.getPath()
      for (let message of new Set([...args.added, ...args.removed])) {
        if (message.location.file===bufferPath) {
          buffer.linterUI.updateRequired = true
          break
        }
      }
      if (buffer.linterUI.updateRequired) {
        buffer.linterUI.messages = []
        for (let message of args.messages) {
          if (message.location.file===bufferPath) {
            buffer.linterUI.messages.push(message)
          }
        }
        buffer.linterUI.messages.sort((a,b) => {
          return a.location.position.start.compare(b.location.position.start)
        })
      }
    }
  },

  updateMarkers() {
    for (let buffer of this.getBuffers()) {
      if (buffer.linterUI.updateRequired) {
        buffer.linterUI.text.error.clear()
        buffer.linterUI.text.warning.clear()
        buffer.linterUI.text.info.clear()
        buffer.linterUI.high.error.clear()
        buffer.linterUI.high.warning.clear()
        buffer.linterUI.high.info.clear()
        for (let message of buffer.linterUI.messages) {
          buffer.linterUI.text[message.severity].markRange(
            message.location.position, { invalidate: 'inside' })
          buffer.linterUI.high[message.severity].markRange(
            message.location.position, { invalidate: 'inside' })
        }
        buffer.linterUI.updateRequired = false
      }
    }
  },


  updateCurrent(editor) {
    if (!editor) { editor = atom.workspace.getActiveTextEditor() }
    if (!editor) { return }
    this.statusPanel.update(editor)
    this.linterPanel.update(editor)
  },

  consumeStatusBar(statusBar) {
    statusBar.addLeftTile({ item:this.statusPanel, priority:0 })
  },

  getNext(editor, pos='start') {
    if (!editor) { editor = atom.workspace.getActiveTextEditor() }
    if (!editor) { return }
    let cursorPos = editor.getCursorBufferPosition()
    for (let message of editor.buffer.linterUI.messages) {
      if (message.location.position[pos].isGreaterThan(cursorPos)) {
        return { editor, message }
      }
    }
    if (editor.buffer.linterUI.messages.length) { // loop
      return { editor, message:editor.buffer.linterUI.messages[0] }
    }
  },

  scrollNext(editor) {
    const next = this.getNext(editor, 'start')
    if (!next) { return }
    next.editor.setCursorBufferPosition(next.message.location.position.start, { autoscroll:true })
    next.editor.element.focus()
  },

  notifyNext(editor) {
    const next = this.getNext(editor, 'end')
    if (!next) { return }
    const head = [
      next.message.linterName,
      ' ',
      next.message.location.position.start.row+1,
      ':',
      next.message.location.position.start.column+1,
    ].join('')
    const text = next.message.excerpt
    const opts = { dismissable:true, description:text }
    if (next.message.severity==='error') {
      atom.notifications.addError(head, { icon:'stop', ...opts })
    } else if (next.message.severity==='warning') {
      atom.notifications.addWarning(head, { icon:'alert', ...opts })
    } else if (next.message.severity==='info') {
      atom.notifications.addInfo(head, { icon:'info', ...opts })
    }
  },
}
