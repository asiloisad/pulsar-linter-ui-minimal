/** @babel */
/** @jsx etch.dom */

const etch = require('etch')
const { clipboard } = require('electron')

class LinterPanel {

  constructor(pkg) {
    this.pkg = pkg
    this.editor = null // initialize
    etch.initialize(this)
  }

  destroy() {
    etch.destroy(this)
  }

  update(editor) {
    this.editor = editor
    etch.update(this)
  }

  render() {
    const head = (
      <tr class="linter-header">
        <th>Severity</th>
        <th>Provider</th>
        <th>Position</th>
        <th>Description</th>
      </tr>
    )
    const data = []
    if (this.editor) {
      const buffer = this.editor.getBuffer()
      for (let message of buffer.linterUI.messages) {
        let scls
        if (message.severity==='error') {
          scls = 'linter-severity text-error icon icon-stop'
        } else if (message.severity==='warning') {
          scls = 'linter-severity text-warning icon icon-alert'
        } else if (message.severity==='info') {
          scls = 'linter-severity text-info icon icon-info'
        }
        let stxt = String(message.severity).charAt(0).toUpperCase()+String(message.severity).slice(1)
        let scroll = () => {
          this.editor.setCursorBufferPosition(message.location.position.start, { autoscroll:true })
          this.editor.element.focus()
        }
        let copy = () => {
          clipboard.writeText(message.excerpt)
          atom.notifications.addInfo('Issue excerpt copied!')
        }
        let item = <tr class="linter-row">
          <td class={scls}>{stxt}</td>
          <td class="linter-provider">{message.linterName}</td>
          <td class="linter-position" on={{click:scroll}}>{message.location.position.start.row+1}:{message.location.position.start.column+1}</td>
          <td class="linter-description" on={{click:copy}}>{message.excerpt}</td>
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
    atom.workspace.toggle(this)
  }
}

module.exports = { LinterPanel }
