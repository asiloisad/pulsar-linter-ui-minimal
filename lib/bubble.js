const { CompositeDisposable } = require('atom')

class BubblePanel {

  constructor(pkg) {
    this.pkg = pkg
    this.editor = null // initialize
    this.signal = null // initialize
    this.marker = null // initialize
  }

  destroy() {
    this.destroyHint()
    this.editor = null
  }

  setEditor(editor) {
    this.destroyHint()
    this.editor = editor
  }

  createHint(message, position) {
    if (!this.editor) { return }
    let item = document.createElement('div')
    item.classList.add('linter-bubble', message.severity)
    item.innerHTML = atom.ui.markdown.render(message.excerpt)
    this.marker = this.editor.markBufferRange(
      [position,position], { invalidate:'never' })
    let deco = this.editor.decorateMarker(this.marker, { type:'overlay', item:item })
    this.marker.onDidDestroy(() => { deco.destroy() })
    this.signal = this.editor.onDidChangeCursorPosition(() => { this.destroyHint() })
  }

  destroyHint() {
    if (this.signal) {
      this.signal.dispose()
      this.signal = null
    }
    if (this.marker) {
      this.marker.destroy()
      this.marker = null
    }
  }

  inspect() {
    this.destroyHint()
    if (!this.editor) { return }
    const message = this.pkg.getCurrentMessage()
    if (!message) { return }
    this.createHint(message, this.editor.getCursorBufferPosition())
  }

  inspectNext() {
    this.destroyHint()
    if (!this.editor) { return }
    const message = this.pkg.getNextMessage()
    if (!message) { return }
    this.editor.setCursorBufferPosition(message.location.position.start, { autoscroll:true })
    this.editor.element.focus()
    this.createHint(message, message.location.position.start)
  }

  inspectPrev() {
    this.destroyHint()
    if (!this.editor) { return }
    const message = this.pkg.getPrevMessage()
    if (!message) { return }
    this.editor.setCursorBufferPosition(message.location.position.start, { autoscroll:true })
    this.editor.element.focus()
    this.createHint(message, message.location.position.start)
  }
}

module.exports = { BubblePanel }
