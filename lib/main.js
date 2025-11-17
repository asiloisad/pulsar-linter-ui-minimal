const { CompositeDisposable } = require('atom')
const { StatusPanel } = require('./status')
const { LinterPanel } = require('./linter')
const { BubblePanel } = require('./bubble')

module.exports = {

  activate() {
    this.editor = null // initialize
    this.status = new StatusPanel(this)
    this.linter = new LinterPanel(this)
    this.bubble = new BubblePanel(this)
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        this.patchEditor(editor)
      }),
      atom.workspace.observeActivePaneItem(item => {
        if (this.editor==item) {
          return
        } else if (!item) {
          this.setEditor(null)
          this.updateCurrent()
        } else if (atom.workspace.isTextEditor(item)) {
          this.setEditor(item)
          this.updateCurrent()
        }
      }),
      atom.commands.add('atom-workspace', {
        'linter-ui:toggle': () => this.linter.toggle(),
      }),
      atom.commands.add('atom-text-editor:not([mini])', {
        'linter-ui:inspect': () => this.bubble.inspect(),
        'linter-ui:next': () => this.bubble.inspectNext(),
        'linter-ui:prev': () => this.bubble.inspectPrev(),
      }),
    )
  },

  deactivate () {
    this.disposables.dispose()
    this.bubble.destroy()
    this.linter.destroy()
    this.status.destroy()
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
      { type:'text', class:'linter-text error' })
    editor.decorateMarkerLayer(buffer.linterUI.text.warning,
      { type:'text', class:'linter-text warning' })
    editor.decorateMarkerLayer(buffer.linterUI.text.info,
      { type:'text', class:'linter-text info' })
    editor.decorateMarkerLayer(buffer.linterUI.high.error,
      { type:'highlight', class:'linter-high error' })
    editor.decorateMarkerLayer(buffer.linterUI.high.warning,
      { type:'highlight', class:'linter-high warning' })
    editor.decorateMarkerLayer(buffer.linterUI.high.info,
      { type:'highlight', class:'linter-high info' })
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

  setEditor(editor) {
    this.editor = editor
    this.status.setEditor(editor)
    this.linter.setEditor(editor)
    this.bubble.setEditor(editor)
  },

  updateCurrent() {
    this.status.update()
    this.linter.update()
  },

  consumeStatusBar(statusBar) {
    statusBar.addLeftTile({ item:this.status, priority:0 })
  },

  getCurrentMessage() {
    if (!this.editor) { return }
    let cursorPosition = this.editor.getCursorBufferPosition()
    for (let message of this.editor.buffer.linterUI.messages) {
      if (message.location.position.containsPoint(cursorPosition)) {
        return message
      }
    }
  },

  getNextMessage() {
    if (!this.editor) { return }
    let cursorPos = this.editor.getCursorBufferPosition()
    for (let message of this.editor.buffer.linterUI.messages) {
      if (message.location.position.start.isGreaterThan(cursorPos)) {
        return message
      }
    }
    if (this.editor.buffer.linterUI.messages.length) { // loop
      return this.editor.buffer.linterUI.messages[0]
    }
  },

  getPrevMessage() {
    if (!this.editor) { return }
    let cursorPos = this.editor.getCursorBufferPosition()
    for (let message of this.editor.buffer.linterUI.messages.toReversed()) {
      if (message.location.position.start.isLessThan(cursorPos)) {
        return message
      }
    }
    if (this.editor.buffer.linterUI.messages.length) { // loop
      return this.editor.buffer.linterUI.messages[this.editor.buffer.linterUI.messages.length-1]
    }
  },
}
