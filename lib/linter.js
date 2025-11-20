/** @babel */
/** @jsx etch.dom */

const etch = require('etch')
const path = require('path')
const { clipboard } = require('electron')

class LinterPanel {

  constructor(pkg) {
    this.pkg = pkg
    this.editor = null // initialize
    this.cwatch = null // initialize
    etch.initialize(this)
  }

  setEditor(editor) {
    this.editor = editor
    this.observe()
  }

  destroy() {
    etch.destroy(this)
  }

  update() {
    etch.update(this)
  }

  readAfterUpdate() {
    const currentRow = this.element.querySelector('.linter-row.current')
    if (currentRow) {
      currentRow.scrollIntoView({ behavior: 'instant', block: 'center' })
    }
  }

  render() {
    const head = (
      <tr class="linter-header">
        <th>Severity</th>
        <th>Provider</th>
        <th>Position</th>
        <th>File</th>
        <th>Description</th>
      </tr>
    )
    const data = []
    if (this.editor) {
      const buffer = this.editor.getBuffer()
      const curpos = this.editor.getCursorBufferPosition()
      for (let message of buffer.linterUI.messages) {
        let scls
        if (message.severity === 'error') {
          scls = 'linter-severity text-error icon icon-stop'
        } else if (message.severity === 'warning') {
          scls = 'linter-severity text-warning icon icon-alert'
        } else if (message.severity === 'info') {
          scls = 'linter-severity text-info icon icon-info'
        }
        let stxt = String(message.severity).charAt(0).toUpperCase() + String(message.severity).slice(1)
        let scroll = () => {
          this.editor.setCursorBufferPosition(message.location.position.start, { autoscroll: true })
          this.editor.element.focus()
        }
        let icls = message.location.position.containsPoint(curpos) ? ' current' : ''
        let item = <tr class={"linter-row " + message.severity + icls} on={{ click: scroll }}>
          <td class={scls}>{stxt}</td>
          <td class="linter-provider">{message.linterName}</td>
          <td class="linter-position">{message.location.position.start.row + 1}:{message.location.position.start.column + 1}</td>
          <td class="linter-file">{message.location.file.split(path.sep).pop()}</td>
          <td class="linter-description" innerHTML={atom.ui.markdown.render(message.excerpt)} />
        </tr>

        data.push(item)
      }
    }
    return (
      <div class="linter-wrapper">
        <table class="linter-table">
          <thead>{head}</thead>
          <tbody>{data}</tbody>
        </table>
      </div>
    )
  }

  getTitle() {
    return 'Linter'
  }

  getDefaultLocation() {
    return 'bottom'
  }

  getAllowedLocations() {
    return ['center', 'bottom']
  }

  toggle() {
    const refocus = atom.workspace.getActivePaneItem() != this
    let prev = document.activeElement
    atom.workspace.toggle(this).then(() => {
      if (refocus) { prev.focus() }
    })
  }

  observe() {
    if (this.cwatch) {
      this.cwatch.dispose()
      this.cwatch = null
    }
    if (this.editor) {
      this.cwatch = this.editor.onDidChangeCursorPosition(
        throttle(() => { this.update() }, 100))
    }
  }
}

function throttle(func, timeout) {
  let timer = false
  return (...args) => {
    if (timer) { return }
    timer = setTimeout(() => {
      func.apply(this, args)
      timer = false
    }, timeout)
  }
}

module.exports = { LinterPanel }
