class StatusPanel {

  constructor(pkg) {
    this.pkg = pkg
    this.editor = null // initialize

    this.element = document.createElement('div')
    this.element.classList.add('linter-status', 'inline-block')

    this.espan = document.createElement('a')
    this.espan.classList.add('.icon', 'icon-stop')
    this.element.appendChild(this.espan)

    this.wspan = document.createElement('a')
    this.wspan.classList.add('.icon', 'icon-alert')
    this.element.appendChild(this.wspan)

    this.ispan = document.createElement('a')
    this.ispan.classList.add('.icon', 'icon-info')
    this.element.appendChild(this.ispan)

    this.element.onmouseup = (e) => this.onmouseup(e)

    this.update() // initialize
  }

  destroy() {
    this.element.remove()
  }

  setEditor(editor) {
    this.editor = editor
  }

  update() {
    if (!this.editor) {
      this.element.style.display = 'none'
      this.espan.textContent = 0
      this.wspan.textContent = 0
      this.ispan.textContent = 0
    } else {
      const buffer = this.editor.getBuffer()
      const ecount = buffer.linterUI.messages.filter(message => message.severity==='error').length
      ecount ? this.espan.classList.add('text-error') : this.espan.classList.remove('text-error')
      this.espan.textContent = ecount
      const wcount = buffer.linterUI.messages.filter(message => message.severity==='warning').length
      wcount ? this.wspan.classList.add('text-warning') : this.wspan.classList.remove('text-warning')
      this.wspan.textContent = wcount
      const icount = buffer.linterUI.messages.filter(message => message.severity==='info').length
      icount ? this.ispan.classList.add('text-info') : this.ispan.classList.remove('text-info')
      this.ispan.textContent = icount
      this.element.style.display = 'unset'
    }
  }

  onmouseup(e) {
    if (e.which===1) { // left click
      this.pkg.linter.toggle()
    } else if (e.which===3) { // right click
      this.pkg.scroll()
      this.pkg.inspect()
    }
  }
}

module.exports = { StatusPanel }
