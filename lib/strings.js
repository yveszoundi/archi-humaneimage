var strings = {
  "pixelWidth": function(nodeLabel) {
    let Font = Java.type("java.awt.Font")
    let Canvas = Java.type("java.awt.Canvas")
    let font = new Font("Monospace", Font.PLAIN, 12)
    let c = new Canvas()
    let fm = c.getFontMetrics(font)

    return fm.stringWidth(nodeLabel)
  },
  "pixelHeight": function() {
    let Font = Java.type("java.awt.Font")
    let Canvas = Java.type("java.awt.Canvas")
    let font = new Font("Monospace", Font.PLAIN, 12)
    let c = new Canvas()
    let fm = c.getFontMetrics(font)

    return fm.getHeight()
  },
  "textLines": function(strInit, widthLimitParam) {
    let widthLimit = parseFloat(widthLimitParam)
    let Font = Java.type("java.awt.Font")
    let FontRenderContext = Java.type("java.awt.font.FontRenderContext")
    let LineBreakMeasurer = Java.type("java.awt.font.LineBreakMeasurer")
    let TextAttribute = Java.type("java.awt.font.TextAttribute")
    let AttributedCharacterIterator = Java.type("java.text.AttributedCharacterIterator")
    let AttributedString = Java.type("java.text.AttributedString")
    let font = new Font("Monospace", Font.PLAIN, 12)
    let result = []
    let strInitValues  = strInit.split("\n")

    for (let i = 0; i < strInitValues.length; i++) {
      let x = 0
      let str = strInitValues[i]
      let frc = new FontRenderContext(null, false, false)
      let as = new AttributedString(str)
      as.addAttribute(TextAttribute.FONT, font)
      let aci = as.getIterator()
      let lbm = new LineBreakMeasurer(aci, frc)

      while (lbm.getPosition() < aci.getEndIndex()) {
        lbm.nextLayout(widthLimit)
        let lineString  = str.substring(x, lbm.getPosition())
        result.push(lineString)
        x = lbm.getPosition()
      }
    }

    return result
  }
}
