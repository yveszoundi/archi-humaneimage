// TODO code duplication
var strings = {
    "pixelWidth": function(nodeLabel, fontName, fontStyleName, fontSize) {
        let Font = Java.type("java.awt.Font")
        let JBufferedImage = Java.type("java.awt.image.BufferedImage")
        let JRenderingHints = Java.type("java.awt.RenderingHints")
        let fontStyle = Font.PLAIN
        let newFontStyleName = fontStyleName.trim().toLowerCase()

        if (newFontStyleName == 'bold')
            fontStyle = Font.BOLD
        if (newFontStyleName == 'bold-italic')
            fontStyle = (Font.BOLD | Font.ITALIC)
        else if (newFontStyleName == 'italic')
            fontStyle = Font.ITALIC

        let font = new Font(fontName, fontStyle, fontSize)

        let image = new JBufferedImage(1, 1, JBufferedImage.TYPE_INT_ARGB);
        let g2d = image.createGraphics();
        g2d.setRenderingHint(JRenderingHints.KEY_ANTIALIASING, JRenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(JRenderingHints.KEY_TEXT_ANTIALIASING, JRenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        let metrics = g2d.getFontMetrics();

        let bounds = metrics.getStringBounds(nodeLabel, g2d);
        let ret = bounds.getWidth();
        g2d.dispose()

        return ret
    },
    "pixelHeight": function(fontName, fontStyleName, fontSize) {
        let Font = Java.type("java.awt.Font")
        let JBufferedImage = Java.type("java.awt.image.BufferedImage")
        let JRenderingHints = Java.type("java.awt.RenderingHints")
        let fontStyle = Font.PLAIN
        let newFontStyleName = fontStyleName.trim().toLowerCase()

        if (newFontStyleName == 'bold')
            fontStyle = Font.BOLD
        if (newFontStyleName == 'bold-italic')
            fontStyle = (Font.BOLD | Font.ITALIC)
        else if (newFontStyleName == 'italic')
            fontStyle = Font.ITALIC

        let image = new JBufferedImage(1, 1, JBufferedImage.TYPE_INT_ARGB);
        let g2d = image.createGraphics();
        g2d.setRenderingHint(JRenderingHints.KEY_ANTIALIASING, JRenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(JRenderingHints.KEY_TEXT_ANTIALIASING, JRenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        let font = new Font(fontName, fontStyle, fontSize)
        g2d.setFont(font);
        let metrics = g2d.getFontMetrics();

        let bounds = metrics.getStringBounds("A", g2d);
        let ret = bounds.getHeight();
        g2d.dispose()

        return ret
    },
    "textLines": function(strInit, widthLimitParam, fontName, fontStyleName, fontSize) {
        const Font = Java.type("java.awt.Font")
        const FontRenderContext = Java.type("java.awt.font.FontRenderContext")
        const LineBreakMeasurer = Java.type("java.awt.font.LineBreakMeasurer")
        const TextAttribute = Java.type("java.awt.font.TextAttribute")
        const AttributedCharacterIterator = Java.type("java.text.AttributedCharacterIterator")
        const AttributedString = Java.type("java.text.AttributedString")
        const Canvas = Java.type("java.awt.Canvas")

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
