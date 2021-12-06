// TODO code duplication
var strings = {
  "pixelWidth": function(nodeLabel, fontName, fontStyleName, fontSize) {
    let Font = Java.type("java.awt.Font")
    let Canvas = Java.type("java.awt.Canvas")
    let fontStyle = Font.PLAIN
    let newFontStyleName = fontStyleName.trim().toLowerCase()

    // TODO consider bold italic
    if (newFontStyleName == 'bold')
      fontStyle = Font.BOLD
    if (newFontStyleName == 'bold-italic')
      fontStyle = (Font.BOLD | Font.ITALIC)
    else if (newFontStyleName == 'italic')
      fontStyle = Font.ITALIC    
    
    let font = new Font(fontName, fontStyle, fontSize)
    let c = new Canvas()
    let fm = c.getFontMetrics(font)

    return fm.stringWidth(nodeLabel)
  },
  "pixelHeight": function(fontName, fontStyleName, fontSize) {
    let Font = Java.type("java.awt.Font")
    let Canvas = Java.type("java.awt.Canvas")
    let fontStyle = Font.PLAIN
    let newFontStyleName = fontStyleName.trim().toLowerCase()
    
    if (newFontStyleName == 'bold')
      fontStyle = Font.BOLD
    if (newFontStyleName == 'bold-italic')
      fontStyle = (Font.BOLD | Font.ITALIC)
    else if (newFontStyleName == 'italic')
      fontStyle = Font.ITALIC
    
    let font = new Font(fontName, fontStyle, fontSize)
    let c = new Canvas()
    let fm = c.getFontMetrics(font)

    return fm.getHeight()
  },
  "textLines": function(strInit, widthLimitParam, fontName, fontStyleName, fontSize) {    
    let Font = Java.type("java.awt.Font")
    let FontRenderContext = Java.type("java.awt.font.FontRenderContext")
    let LineBreakMeasurer = Java.type("java.awt.font.LineBreakMeasurer")
    let TextAttribute = Java.type("java.awt.font.TextAttribute")
    let AttributedCharacterIterator = Java.type("java.text.AttributedCharacterIterator")
    let AttributedString = Java.type("java.text.AttributedString")
    let Canvas = Java.type("java.awt.Canvas")

    let widthLimit = parseFloat(widthLimitParam)
    let fontStyle = Font.PLAIN
    let newFontStyleName = fontStyleName.trim().toLowerCase()

    if (newFontStyleName == 'bold')
      fontStyle = Font.BOLD
    if (newFontStyleName == 'bold-italic')
      fontStyle = (Font.BOLD | Font.ITALIC)
    else if (newFontStyleName == 'italic')
      fontStyle = Font.ITALIC    

    let font = new Font(fontName, fontStyle, fontSize)
    let c = new Canvas()
    let fm = c.getFontMetrics(font)
    widthLimit = widthLimit - (fm.stringWidth(" ") * 3)

    let result = []
    let strInitValues  = strInit.split("\n")

    for (let i = 0; i < strInitValues.length; i++) {
      let x = 0

      let str = strInitValues[i]
      if (str.length == 0) str = " " // Avoid any Java NPE with AttributedString constructor

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
