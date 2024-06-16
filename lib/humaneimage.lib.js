/*
 * Generate a humane image from an ArchiMate Diagram Model object
 * Author: Yves Zoundi
 * Version: 0.2.0
 * This script creates a plain image from a diagram (just lines and rectangles, specialization icons are supported with limitations)
 * - It is assumed that there are no negative coordinates (WIP, current limitation)
 * - Similarly to the above point, there needs to be a translation of actual coordinates relatively to the desired margin
 * - Positioning lines is a best effort and doesn't reflect 100% what's drawn in Archi (not WYSIWYG)
 * - Filled images are not supported
 */

load(__SCRIPTS_DIR__ + "archi-humaneimage/lib/strings.lib.js")
Java.addToClasspath(__SCRIPTS_DIR__ + "archi-humaneimage/lib/edraw2d.lib.jar")
Java.addToClasspath(__SCRIPTS_DIR__ + "archi-humaneimage/lib/svgtopng.lib.jar")

var humaneImage = {
  "renderViewAsBase64": function (currentView, options) {
    // Declare the Eclipse FontData class
    // See https://github.com/eclipse-platform/eclipse.platform.swt/blob/master/bundles/org.eclipse.swt/Eclipse%20SWT/gtk/org/eclipse/swt/graphics/FontData.java
    const FontDataClass = Java.type('org.eclipse.swt.graphics.FontData')

    // Get the default font string for diagram objects
    const archiPrefs = Java.type('com.archimatetool.editor.ArchiPlugin').PREFERENCES
    let defaultViewFont = archiPrefs.getString('defaultViewFont')
    let tmpDefaultFontSize   = 12
    let tmpDefaultFontName   = "Monospace"

    if(defaultViewFont) {
      // It's a long string so we need to load it into an Eclipse FontData object to get its parts
      let fontData = new FontDataClass(defaultViewFont)
      tmpDefaultFontName = fontData.getName()
      tmpDefaultFontSize = fontData.getHeight()
    }

    const _defaultLineWidth  = 1
    const _defaultFontSize   = tmpDefaultFontSize
    const _defaultFillColor  = "#ffffff"
    const _defaultLineColor  = "#000000"
    const _defaultFontColor  = "#000000"
    const _defaultFontName   = tmpDefaultFontName

    let cfg = {
      imgTargetGeometry             : "",
      imgBackgroundColor            : "#ffffff",
      layoutGapTolerance            : 5,
      svgWidth                      : 5,
      svgHeight                     : 5,
      imageMargin                   : {top: 20, left: 20},
      elementBoundsById             : new Map(),
      obstaclesSet                  : new Set(),
      visitedPoints                 : new Set(),
      rectRoundedEnabled            : false,
      rectRoundedRadius             : 5,
      rectLinkSize                  : 4,
      dashSizeLine                  : 4,
      dashSizeLineArrow             : 2,
      dashLinesEnabled              : false,
      pointsSimplificationTolerance : 4.0,
      debug                         : false,
      drawCustomIcons               : true,
      doNotDrawTextIfBoxIsTooSmall  : true,
      markerColors                  : new Set(),
      rgbColorByElementType         : {
        "application-collaboration" : archiPrefs.getString("defaultFillColour_ApplicationCollaboration"),
        "application-component"     : archiPrefs.getString("defaultFillColour_ApplicationComponent"),
        "application-event"         : archiPrefs.getString("defaultFillColour_ApplicationEvent"),
        "application-function"      : archiPrefs.getString("defaultFillColour_ApplicationFunction"),
        "application-interaction"   : archiPrefs.getString("defaultFillColour_ApplicationInteraction"),
        "application-interface"     : archiPrefs.getString("defaultFillColour_ApplicationInterface"),
        "application-process"       : archiPrefs.getString("defaultFillColour_ApplicationProcess"),
        "application-service"       : archiPrefs.getString("defaultFillColour_ApplicationService"),
        "artifact"                  : archiPrefs.getString("defaultFillColour_Artifact"),
        "assessment"                : archiPrefs.getString("defaultFillColour_Assessment"),
        "business-actor"            : archiPrefs.getString("defaultFillColour_BusinessActor"),
        "business-collaboration"    : archiPrefs.getString("defaultFillColour_BusinessCollaboration"),
        "business-event"            : archiPrefs.getString("defaultFillColour_BusinessEvent"),
        "business-function"         : archiPrefs.getString("defaultFillColour_BusinessFunction"),
        "business-interaction"      : archiPrefs.getString("defaultFillColour_BusinessInteraction"),
        "business-interface"        : archiPrefs.getString("defaultFillColour_BusinessInterface"),
        "business-object"           : archiPrefs.getString("defaultFillColour_BusinessObject"),
        "business-process"          : archiPrefs.getString("defaultFillColour_BusinessProcess"),
        "business-role"             : archiPrefs.getString("defaultFillColour_BusinessRole"),
        "business-service"          : archiPrefs.getString("defaultFillColour_BusinessService"),
        "communication-network"     : archiPrefs.getString("defaultFillColour_CommunicationNetwork"),
        "capability"                : archiPrefs.getString("defaultFillColour_Capability"),
        "constraint"                : archiPrefs.getString("defaultFillColour_Constraint"),
        "contract"                  : archiPrefs.getString("defaultFillColour_Contract"),
        "course-of-action"          : archiPrefs.getString("defaultFillColour_CourseOfAction"),
        "data-object"               : archiPrefs.getString("defaultFillColour_DataObject"),
        "deliverable"               : archiPrefs.getString("defaultFillColour_Deliverable"),
        "device"                    : archiPrefs.getString("defaultFillColour_Device"),
        "junction"                  : archiPrefs.getString("defaultFillColour_Junction"),
        "diagram-model-group"       : (archiPrefs.getString("defaultFillColour_DiagramModelGroup") || "#dcdcdc"),
        "distribution-network"      : archiPrefs.getString("defaultFillColour_DistributionNetwork"),
        "driver"                    : archiPrefs.getString("defaultFillColour_Driver"),
        "equipment"                 : archiPrefs.getString("defaultFillColour_Equipment"),
        "facility"                  : archiPrefs.getString("defaultFillColour_Facility"),
        "gap"                       : archiPrefs.getString("defaultFillColour_Gap"),
        "goal"                      : archiPrefs.getString("defaultFillColour_Goal"),
        "grouping"                  : archiPrefs.getString("defaultFillColour_Grouping"),
        "implementation-event"      : archiPrefs.getString("defaultFillColour_ImplementationEvent"),
        "location"                  : archiPrefs.getString("defaultFillColour_Location"),
        "material"                  : archiPrefs.getString("defaultFillColour_Material"),
        "meaning"                   : archiPrefs.getString("defaultFillColour_Meaning"),
        "node"                      : archiPrefs.getString("defaultFillColour_Node"),
        "outcome"                   : archiPrefs.getString("defaultFillColour_Outcome"),
        "path"                      : archiPrefs.getString("defaultFillColour_Path"),
        "plateau"                   : archiPrefs.getString("defaultFillColour_Plateau"),
        "principle"                 : archiPrefs.getString("defaultFillColour_Principle"),
        "product"                   : archiPrefs.getString("defaultFillColour_Product"),
        "representation"            : archiPrefs.getString("defaultFillColour_Representation"),
        "resource"                  : archiPrefs.getString("defaultFillColour_Resource"),
        "requirement"               : archiPrefs.getString("defaultFillColour_Requirement"),
        "stakeholder"               : archiPrefs.getString("defaultFillColour_Stakeholder"),
        "system-software"           : archiPrefs.getString("defaultFillColour_SystemSoftware"),
        "technology-collaboration"  : archiPrefs.getString("defaultFillColour_TechnologyCollaboration"),
        "technology-event"          : archiPrefs.getString("defaultFillColour_TechnologyEvent"),
        "technology-function"       : archiPrefs.getString("defaultFillColour_TechnologyFunction"),
        "technology-interaction"    : archiPrefs.getString("defaultFillColour_TechnologyInteraction"),
        "technology-interface"      : archiPrefs.getString("defaultFillColour_TechnologyInterface"),
        "technology-process"        : archiPrefs.getString("defaultFillColour_TechnologyProcess"),
        "technology-service"        : archiPrefs.getString("defaultFillColour_TechnologyService"),
        "value"                     : archiPrefs.getString("defaultFillColour_Value"),
        "value-stream"              : archiPrefs.getString("defaultFillColour_ValueStream"),
        "work-package"              : archiPrefs.getString("defaultFillColour_WorkPackage")
      },
      format                        : "png",
      dumpSvg                       : false
    }

    // See https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
    function _invertColor(hex) {
      function _padZero(str, len) {
        len = len || 2;
        let zeros = new Array(len).join('0');
        return (zeros + str).slice(-len);
      }

      if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
      }
      // convert 3-digit hex to 6-digits.
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
      }
      let r = parseInt(hex.slice(0, 2), 16),
          g = parseInt(hex.slice(2, 4), 16),
          b = parseInt(hex.slice(4, 6), 16);

      // invert color components
      r = (255 - r).toString(16);
      g = (255 - g).toString(16);
      b = (255 - b).toString(16);
      // pad each with zeros and return
      return "#" + _padZero(r) + _padZero(g) + _padZero(b);
    }

    // Translate x,y coordinates for top-level elements
    function _translateBounds(bounds, offset, level) {
      if (level > 1) return bounds

      let result = {
        x      : bounds.x + offset.x,
        y      : bounds.y + offset.y,
        width  : bounds.width,
        height : bounds.height
      }

      return result
    }

    function _elementIsConnection(e) {
      return (e.type.endsWith("-relationship") || e.type.endsWith("-connection"))
    }

    function _renderViewAsSvgBase64(currentView, cfg) {
      const _edraw2dJarPath = __SCRIPTS_DIR__ + "archi-humaneimage/lib/edraw2d.lib.jar"

      // evaluate the diagram boundaries while accounting for connections segments points that could be "further out"
      function _evaluateBoundaries(activeView, cfg) {
        let minX = Number.MAX_SAFE_INTEGER
        let minY = Number.MAX_SAFE_INTEGER
        let maxX = Number.MIN_SAFE_INTEGER
        let maxY = Number.MIN_SAFE_INTEGER
        let boundsById = new Map()
        let q = []

        $(activeView).children().each(function (e) {
          if (! _elementIsConnection(e))
            q.push({item: e, parentId: null})
        })

        while (q.length != 0) {
          let data = q.shift()
          let itemBounds = { x: data.item.bounds.x, y: data.item.bounds.y, width: data.item.bounds.width, height: data.item.bounds.height }

          if (data.parentId) {
            itemBounds.x = itemBounds.x + boundsById.get(data.parentId).x
            itemBounds.y = itemBounds.y + boundsById.get(data.parentId).y
          }

          boundsById.set(data.item.id, itemBounds)

          $(data.item).children().each(function (e) {
            if (! _elementIsConnection(e))
              q.push({item: e, parentId: data.item.id})
          })
        }

        $(activeView).find().each(function(e) {
          if (! _elementIsConnection(e)) {
            let bounds = boundsById.get(e.id)
            minX = Math.min(minX, bounds.x)
            minY = Math.min(minY, bounds.y)
            maxX = Math.max(maxX, (bounds.x + bounds.width))
            maxY = Math.max(maxY, (bounds.y + bounds.height))
          } else {
            // Don't consider connections that point to connections
            // TODO Maybe log a warning? Throwing an error could also be reasonable/acceptable in terms of conventions?
            if ( (e.relativeBendpoints.length != 0) && (boundsById.has(e.source.id) && boundsById.has(e.target.id))) {
              let sourceBounds = boundsById.get(e.source.id)
              let targetBounds = boundsById.get(e.target.id)
              let centerPointOnSource  = _rectCenterPoint(sourceBounds)
              let centerPointOnTarget  = _rectCenterPoint(targetBounds)

              for (let p of e.relativeBendpoints) {
                let pStart = { x: p.startX + centerPointOnSource.x, y: p.startY + centerPointOnSource.y }
                let pEnd   = { x: p.endX + centerPointOnTarget.x,   y: p.endY + centerPointOnTarget.y }
                minX = Math.min(minX, pStart.x)
                minY = Math.min(minY, pStart.y)
                maxX = Math.max(maxX, pEnd.x)
                maxY = Math.max(maxY, pEnd.y)
              }
            }
          }
        })

        return {
          minX: parseInt(minX), minY: parseInt(minY), maxX: parseInt(maxX), maxY: parseInt(maxY)
        }
      }

      // Calculate image size with evaluated boundaries and requested margins
      function _calcImageSize(activeView, cfg) {
        let dim = _evaluateBoundaries(activeView, cfg)

        if (dim.minX == Number.MAX_SAFE_INTEGER)
          return { x: cfg.imageMargin.left, y: cfg.imageMargin.top }

        let maxWidth = 0
        let maxHeight = 0

        if (_debugEnabled(cfg))
          console.log("++Calculating image size")

        cfg.markerColors = new Set()

        cfg.offset = {
          x: cfg.imageMargin.left - dim.minX,
          y: cfg.imageMargin.top - dim.minY
        }

        let result = {
          width  : (dim.maxX - dim.minX) + (cfg.imageMargin.left * 2),
          height : (dim.maxY - dim.minY) + (cfg.imageMargin.top  * 2)
        }

        if (_debugEnabled(cfg))
          console.log("++The image will be generated with the following dimensions:", result, " and initial offset:", cfg.offset)

        return result
      }

      // Sanitize text for SVG XML output
      function _sanitizeText(str) {
        return str.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')
      }

      // Check if text is drawable
      // For example there might be situations where you want to display or hide junctions/interfaces text
      // This replicates reasonably well the observed behaviour in Archi
      function _textIsDrawable(originalText, newText) {
        let originalWords = originalText.split(/(\s+)/).filter( function(e) { return e.trim().length > 0; } );
        let newTextSet = new Set()

        for (let newTextLine of newText) {
          let newTextLineWords = newTextLine.split(/(\s+)/).filter( function(e) { return e.trim().length > 0; } )

          for (let newTextLineWord of newTextLineWords)
            newTextSet.add(newTextLineWord)
        }

        for (let originalWord of originalWords) {
          if (newTextSet.has(originalWord))
            return true
        }

        return false
      }

      function _mapToJavaFontStyle(fontWeight, fontStyle) {
        let result = "plain"

        if (fontStyle && (fontStyle == "italic"))
          result = "italic"

        if (fontWeight && (fontWeight == "bold"))
          result = (result == "italic") ? "bold-italic" : "bold"

        return result
      }

      // Draw multiline text for a given element
      function _drawMultilineText (text, x, y, widthLimit, heightLimit, fontName, fontSize, fontWeight, fontStyle, textAlignment, textPosition, doNotDrawTextIfBoxIsTooSmall, layoutGapTolerance) {
        let fontStyleTextLines = _mapToJavaFontStyle(fontWeight, fontStyle)
        let newText = strings.textLines(text, widthLimit, fontName, fontStyleTextLines, fontSize)
        let textData = ''

        if (doNotDrawTextIfBoxIsTooSmall) {
          if (!_textIsDrawable(text, newText))
            return textData
        }

        let dy = 0

        let lineHeight = strings.pixelHeight(fontName, fontStyleTextLines, fontSize)

        if (textPosition != 0) {   // TOP
          if (textPosition == 1) { // CENTER
            dy = (dy + heightLimit/2) - ( (lineHeight * newText.length) / 2)
          } else {                // BOTTOM
            dy = heightLimit - (lineHeight * newText.length) - 4
          }
        }

        dy += (lineHeight  + y)

        for (let newTextLine of newText) {
          let horizontalTextPosition = x + 5

          if (textAlignment != 1 ) {  // LEFT
            let newTextLineWidth = strings.pixelWidth(newTextLine, fontName, fontStyleTextLines, fontSize)

            if (textAlignment == 2) { // MIDDLE
              horizontalTextPosition = (x + (widthLimit  / 2)) - (newTextLineWidth / 2)
            } else {                  // RIGHT
              horizontalTextPosition = (x + widthLimit) - newTextLineWidth
            }
          }

          newTextLine = _sanitizeText(newTextLine)

          textData = textData + `<tspan x="${horizontalTextPosition}" y="${dy}" font-weight="${fontWeight}" font-size="${fontSize}" font-style="${fontStyle}">${newTextLine}</tspan>`
          dy+= (lineHeight )
        }

        return textData
      }

      // Draw an element
      function _drawElement (bounds, element, level, cfg) {
        let adjustedBounds = _translateBounds(bounds, cfg.offset, level)
        cfg.elementBoundsById.set(element.id, adjustedBounds)

        let itemText = element.labelValue

        if (itemText.length == 0) {
          itemText = element.name

          if (itemText.length == 0)
            if (element.text) itemText = element.text
        }

        itemText = itemText.trim()

        // Do not consider a group or container for other elements as an obstacle
        if (element.type != "grouping" && $(element).children().length == 0)
          cfg.obstaclesSet.add(element.id)

        let fillColor = (element.fillColor) ? element.fillColor : (cfg.rgbColorByElementType[element.type] || _defaultFillColor)
        let lineColor = element.fontColor
        if (element.deriveLineColor == false) lineColor = element.lineColor

        let fontName = element.fontName || _defaultFontName
        let fontSize = (element.fontSize || _defaultFontSize) * 1.2

        let groupingStyle = ''
        if (element.type == 'grouping')
          groupingStyle = ` stroke-dasharray="4" `

        let additionalRectAttributes = ''
        if (cfg.rectRoundedEnabled == true)
          additionalRectAttributes = ` rx="${cfg.rectRoundedRadius}" ry="${cfg.rectRoundedRadius}" `

        let strokeWidth = (element.lineWidth || _defaultLineWidth)

        let result = `<rect ` + additionalRectAttributes +  ` x = "${adjustedBounds.x}" y="${adjustedBounds.y }" width="${adjustedBounds.width}"  ${groupingStyle}  height="${adjustedBounds.height}" fill="${fillColor}" stroke-width="${strokeWidth}" stroke="${lineColor}"/>`

        if (element.specialization) {
          let spec = model.findSpecialization(element.specialization, element.type)
          let img = spec.getImage()

          if (img) {
            let JString = Java.type("java.lang.String")
            let JBase64 = Java.type("java.util.Base64")
            let JFiles = Java.type("java.nio.file.Files")
            let JFile = Java.type("java.io.File")

            let JByteArrayOutputStream = Java.type("java.io.ByteArrayOutputStream")
            let JImageLoader = Java.type("org.eclipse.swt.graphics.ImageLoader")
            let JSWT = Java.type("org.eclipse.swt.SWT")

            let out = new JByteArrayOutputStream()
            let loader = new JImageLoader()
            let imgPath = img.path
            let archiveManager = cfg.archiveManager
            let specImage = archiveManager.createImage(imgPath)
            let data = specImage.getImageData()
            loader.data = [data]
            loader.save(out, JSWT.IMAGE_PNG);
            let imageData = JBase64.getEncoder().encodeToString(out.toByteArray())
            let imagePosition = new Number(element.imagePosition.toFixed(0))
            let imageX = adjustedBounds.x + adjustedBounds.width - img.width - 1
            let imageY = adjustedBounds.y + 2
            let imageWidth = data.width
            let imageHeight = data.height

            if (imagePosition) {
              if (imagePosition == 0) { // TOP LEFT
                imageX = adjustedBounds.x + 2
                imageY = adjustedBounds.y + 2
              } else if (imagePosition == 1) { // TOP_CENTRE
                imageX = adjustedBounds.x + (adjustedBounds.width/2) - (img.width/2) - 1
                imageY = adjustedBounds.y + 2
              } else if (imagePosition == 2) { // TOP_RIGHT
                imageX = adjustedBounds.x + adjustedBounds.width - img.width - 1
                imageY = adjustedBounds.y + 2
              } else if (imagePosition == 3) { // MIDDLE_LEFT
                imageX = adjustedBounds.x + 2
                imageY = adjustedBounds.y + (adjustedBounds.height / 2) - (img.height/2)
              } else if (imagePosition == 4) { // MIDDLE_CENTER
                imageX = adjustedBounds.x + (adjustedBounds.width/2) - (img.width/2) - 1
                imageY = adjustedBounds.y + (adjustedBounds.height / 2) - (img.height/2)
              } else if (imagePosition == 5) { // MIDDLE_RIGHT
                imageX = adjustedBounds.x + adjustedBounds.width - img.width - 1
                imageY = adjustedBounds.y + (adjustedBounds.height / 2) - (img.height/2)
              } else if (imagePosition == 6) { // BOTTOM_LEFT
                imageX = adjustedBounds.x + 2
                imageY = adjustedBounds.y + (adjustedBounds.height) - 2 - img.height
              } else if (imagePosition == 7) { // BOTTOM_CENTRE
                imageX = adjustedBounds.x + (adjustedBounds.width/2) - (img.width/2) - 1
                imageY = adjustedBounds.y + (adjustedBounds.height) - 2 - img.height
              } else if (imagePosition == 8) { // BOTTOM_RIGHT
                imageX = adjustedBounds.x + adjustedBounds.width - img.width - 1
                imageY = adjustedBounds.y + (adjustedBounds.height) - 2 - img.height
              } else if (imagePosition == 9) { // FILL is not supported
                throw new Error("Image with position FILL is unsupported for element:" + (element.name || element.labelValue))
              }
            }

            result += `<image xlink:href="data:image/png;base64,${imageData}" height="${imageWidth}" width="${imageHeight}" x="${imageX}" y="${imageY}"/>`
          }
        }

        result += "\n"

        if (itemText.length != 0) {
          if (!(element.type == 'junction')) {
            let fontColor = element.fontColor
            let fontWeight = (element.fontStyle.indexOf('bold') != -1) ? 'bold' : 'normal'
            let fontStyle = element.fontStyle.replaceAll('bold', '')
            if (fontStyle.length == 0) fontStyle = 'normal'
            let fontName = element.fontName || _defaultFontName
            let fontStyleTextLines = _mapToJavaFontStyle(fontWeight, fontStyle)
            let lineHeight = strings.pixelHeight(fontName, fontStyleTextLines, fontSize)
            let textData = _drawMultilineText(itemText, adjustedBounds.x, adjustedBounds.y, adjustedBounds.width, adjustedBounds.height, fontName, fontSize, fontWeight, fontStyle, element.textAlignment, element.textPosition, cfg.doNotDrawTextIfBoxIsTooSmall, cfg.layoutGapTolerance)

            result += `<text x="${adjustedBounds.x}" y="${adjustedBounds.y + lineHeight}" font-size="${fontSize}" font-family="${fontName}" fill="${fontColor}" font-style="${fontStyle}" font-weight="${fontWeight}">${textData}</text>`
          }
        }

        if (cfg.drawCustomIcons && !cfg.archiveManager) {
          let userIconRadius = 5

          if (element.type =="business-actor" || element.type == "business-role" || element.type == 'stakeholder') {
            let userIconX      = adjustedBounds.x + adjustedBounds.width  - (userIconRadius * 1.2)
            let userIconY      = adjustedBounds.y + (userIconRadius * 0.6)
            let iconColor      = element.fontColor;//_invertColor(fillColor)
            let userIconPath   = userIconAt(userIconX, userIconY, userIconRadius, iconColor)

            result += userIconPath
          }
        }

        return result
      }

      // Collect elements to draw and draw them from parent to child (DFS for shape visibility control)
      function _drawVertices (currentView, cfg) {
        if (_debugEnabled(cfg))
          console.log("\n+Processing vertices")

        let buffer = []
        let queue  = []

        $(currentView).children().each(function(e) {
          if (! _elementIsConnection(e))
            queue.push( { item: e, level: 1 })
        })

        let parentIdByNodeId = new Map()

        while (queue.length != 0) {
          let data = queue.shift()
          let itemBounds = { x: data.item.bounds.x, y: data.item.bounds.y, width: data.item.bounds.width, height: data.item.bounds.height }

          if (parentIdByNodeId.has(data.item.id)) {
            let parentId     = parentIdByNodeId.get(data.item.id)
            let parentBounds = cfg.elementBoundsById.get(parentId)
            itemBounds.x    += parentBounds.x
            itemBounds.y    += parentBounds.y
          }

          if (!cfg.elementBoundsById.has(data.item.id)) {
            if (_debugEnabled(cfg))
              console.log("++Drawing vertex for '", data.item, "'")

            buffer.push (_drawElement(itemBounds, data.item, data.level, cfg))
          }

          $(data.item).children().not("relationship").not("diagram-note").each( function(itemChild) {
            queue.push({item: itemChild, level: data.level + 1})
            parentIdByNodeId.set(itemChild.id, data.item.id)
          })
        }

        return buffer
      }

      // Tell if a rectangle r1 contains another rectangle r2
      function _rectangleContains (r1, r2) {
        return r1.x <= r2.x && r2.x <= r1.x + r1.width && r1.y <= r2.y && r2.y <= r1.y + r1.height
      }

      // Tell if a rectangle r contains a point with coordinates (x,y), with padding for precision(tolerance)
      function _rectangleContainsPoint (r, x, y, tolerance) {
        return r.x - tolerance <= x && x <= r.x + tolerance + r.width && r.y - tolerance <= y && y <= r.y + r.height + tolerance
      }

      // See https://en.wikipedia.org/wiki/Distance
      function _distanceBetweenPoints (x1, y1, x2, y2) {
        return Math.abs(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)))
      }

      // Return a simple circle indicating and aggregation/composition relationship
      function _aggregationIconAt(x, y, rectSize, lineColor) {
        let result = `<circle cx = "${x}" cy="${y  - (rectSize / 4)}" r="${rectSize}" fill="${lineColor}"/>`

        return result
      }

      // Draws a basic user icon
      // See https://stackoverflow.com/questions/8312922/how-to-draw-bottom-half-of-a-circle-in-canvas
      function userIconAt(xCenterPosition, yTopMostPosition, maxRadius, iconColor) {
        let icon = ""
        let lr = maxRadius / 2
        let k1 = yTopMostPosition + (lr / 2)
        let lrr = maxRadius
        icon += `<circle cx="${xCenterPosition}" cy="${k1}" r="${lr}" fill="${iconColor}"/>`
        k = k1 + (lr * 3)
        r = lrr

        function computeX(theta, r, xCenterPosition, k){ return r * Math.cos(theta) + xCenterPosition; }
        function computeY(theta, r, xCenterPosition, k){ return r * Math.sin(theta) + k; }

        let start = Math.PI;

        icon += `<path fill="${iconColor}" d="`
        icon = icon + "M " + computeX(start, r, xCenterPosition, k) + " " + computeY(start, r, xCenterPosition, k);

        for (let theta = start; theta <= (2 * Math.PI); theta += .1) {
          let x = computeX(theta, r, xCenterPosition, k)
          let y = computeY(theta, r, xCenterPosition, k)
          icon = icon + (" L " + x + " " + y)
        }

        icon = icon + " Z\"/>"

        return icon
      }

      // Return lines for each side of a given rectangle
      function _getRectangleLines(rectangle) {
        return [
          { x1: rectangle.x                   , y1: rectangle.y,                    x2: rectangle.x + rectangle.width, y2: rectangle.y },
          { x1: rectangle.x                   , y1: rectangle.y + rectangle.height, x2: rectangle.x + rectangle.width, y2: rectangle.y + rectangle.height },
          { x1: rectangle.x                   , y1: rectangle.y,                    x2: rectangle.x,                   y2: rectangle.y + rectangle.height },
          { x1: rectangle.x + rectangle.width , y1: rectangle.y,                    x2: rectangle.x + rectangle.width, y2: rectangle.y + rectangle.height }
        ]
      }

      // See https://stackoverflow.com/questions/15514906/how-to-check-intersection-between-a-line-and-a-rectangle
      // Compute the intersection point between 2 lines
      function _intersectionPointForLines(firstLine, otherLine) {
        let result = null

        let firstLineDx = firstLine.x2 - firstLine.x1
        let firstLineDy = firstLine.y2 - firstLine.y1
        let otherLineDx = otherLine.x2 - otherLine.x1
        let otherLineDy = otherLine.y2 - otherLine.y1

        let s = (-firstLineDy * (firstLine.x1 - otherLine.x1) + firstLineDx * (firstLine.y1 - otherLine.y1)) / (-otherLineDx * firstLineDy + firstLineDx * otherLineDy)
        let t = ( otherLineDx * (firstLine.y1 - otherLine.y1) - otherLineDy * (firstLine.x1 - otherLine.x1)) / (-otherLineDx * firstLineDy + firstLineDx * otherLineDy)

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1){
          let x = parseInt(firstLine.x1 + (t * firstLineDx))
          let y = parseInt(firstLine.y1 + (t * firstLineDy))

          return {x: x, y: y}
        }

        return result;
      }

      // Find the closest point on a target rectangle from a reference point
      // This is essentially about drawing  a line from the center points of 2 rectangles and finding the nearest point
      // TODO optimize, in this case as soon as we have a result we can exit the loop as the refPoint is usually the center of the rectangle....
      function _closestIntersectingPointOnRectangleWithLine(refPoint, rectangle, line) {
        let minDistance = Number.MAX_SAFE_INTEGER
        let rectLines = _getRectangleLines(rectangle)
        let result

        for (let rectLine of rectLines) {
          let p = _intersectionPointForLines(rectLine, line)

          if (p) {
            let d = _distanceBetweenPoints(refPoint.x, refPoint.y, p.x, p.y)
            if (d < minDistance) {
              result = p
              minDistance = d
            }
          }
        }

        return result
      }

      // Center point of a rectangle
      function _rectCenterPoint(r) {
        return {x: r.x + (r.width / 2), y: r.y + (r.height / 2)}
      }

      // Gather a set of points on a rectangle
      // Those points will be evaluated to find the minimum distance for connectivity to another rectangle
      function _rectanglePorts (r, layoutGapTolerance) {
        let preferredInternal = layoutGapTolerance
        let centerPoint = _rectCenterPoint(r)

        if (r.width > preferredInternal && r.height > preferredInternal) {
          let result = []

          for (let i = r.x + preferredInternal; i <= r.x + r.width - preferredInternal; i+= preferredInternal) {
            let k = Math.abs(centerPoint.x - i) / layoutGapTolerance
            result.push({ x: i, y: r.y })
            result.push({ x: i, y: r.y + r.height })
          }

          for (let j = r.y + preferredInternal; j < r.y + r.height - preferredInternal ; j+= preferredInternal) {
            let k = Math.abs(centerPoint.y - j) / layoutGapTolerance
            result.push({ x: r.x, y: j })
            result.push({ x: r.x + r.width, y: j })
          }

          return result
        } else {
          return [
            { x: r.x,               y: r. y },
            { x: r.x,               y: r.y + r.height },
            { x: r.x + r.width,     y: r. y },
            { x: r.x + r.width,     y: r.y + r.height },
            { x: r.x + r.width / 2, y: r.y },
            { x: r.x,               y: centerPoint.y },
            { x: r.x + r.width / 2, y: r.y + r.height },
            { x: r.x + r.width,     y: centerPoint.y }
          ]
        }
      }

      // Simple coordinate key to avoid lines overlap from a source or target point
      function _pointKey(x, y) {
        return x + "-" + y
      }

      // Find visually appealing connection points between 2 rectangle shapes
      // TODO this can be optimized at the expense of readibility (easy to check logic and typos, with hand drawings)
      function _visuallyAppealingConnectionPoints(sourceBounds, targetBounds, layoutGapTolerance) {
        let result = { sourcePoints: [], targetPoints: [] }

        function _horizontallyContains(firstRect, otherRect, tolerance) {
          if ( firstRect.x <= otherRect.x && ( (firstRect.x + firstRect.width + tolerance) >= (otherRect.x + otherRect.width)) )
            return true

          return ( (firstRect.x- tolerance) <= otherRect.x && ( (firstRect.x - tolerance + firstRect.width + (tolerance * 2)) >= (otherRect.x + otherRect.width)) )
        }

        function _verticallyContains(firstRect, otherRect, tolerance) {
          if ( (firstRect.y <= otherRect.y) && ( (firstRect.y + firstRect.height + tolerance) >= (otherRect.y + otherRect.height)))
            return true

          return ( (firstRect.y <= otherRect.y) && ( (firstRect.y - tolerance + firstRect.height + (tolerance * 2)) >= (otherRect.y + otherRect.height)))
        }

        if (_horizontallyContains(sourceBounds, targetBounds, layoutGapTolerance) || _horizontallyContains(targetBounds, sourceBounds, layoutGapTolerance)) {
          if (_horizontallyContains(sourceBounds, targetBounds, layoutGapTolerance)) {
            if (sourceBounds.y > targetBounds.y) {
              result.sourcePoints.push({x: targetBounds.x + targetBounds.width / 2, y: sourceBounds.y })
              result.targetPoints.push({x: targetBounds.x + targetBounds.width / 2, y: targetBounds.y + targetBounds.height })
            } else {
              result.sourcePoints.push({x: targetBounds.x + targetBounds.width / 2, y: sourceBounds.y + sourceBounds.height})
              result.targetPoints.push({x: targetBounds.x + targetBounds.width / 2, y: targetBounds.y })
            }
          } else {
            if (sourceBounds.y > targetBounds.y) {
              result.sourcePoints.push({x: sourceBounds.x + sourceBounds.width / 2 , y: sourceBounds.y})
              result.targetPoints.push({x: sourceBounds.x + sourceBounds.width / 2 , y: targetBounds.y + targetBounds.height})
            } else {
              result.sourcePoints.push({x: sourceBounds.x + sourceBounds.width / 2 , y: sourceBounds.y + sourceBounds.height})
              result.targetPoints.push({x: sourceBounds.x + sourceBounds.width / 2 , y: targetBounds.y})
            }
          }
        } else if (_verticallyContains(sourceBounds, targetBounds, layoutGapTolerance) || _verticallyContains(targetBounds, sourceBounds, layoutGapTolerance)) {
          if (_verticallyContains(sourceBounds, targetBounds, layoutGapTolerance)) {
            if (sourceBounds.x < targetBounds.y) {
              result.sourcePoints.push({x: sourceBounds.x + sourceBounds.width , y: targetBounds.y + targetBounds.height / 2})
              result.targetPoints.push({x: targetBounds.x                      , y: targetBounds.y + targetBounds.height / 2})
            } else {
              result.sourcePoints.push({x: sourceBounds.x                      , y: targetBounds.y + targetBounds.height / 2})
              result.targetPoints.push({x: targetBounds.x + targetBounds.width , y: targetBounds.y + targetBounds.height / 2})
            }
          } else {
            if (sourceBounds.x < targetBounds.y) {
              result.sourcePoints.push({x: sourceBounds.x + sourceBounds.width , y: sourceBounds.y + sourceBounds.height / 2})
              result.targetPoints.push({x: targetBounds.x                      , y: sourceBounds.y + sourceBounds.height / 2})
            } else {
              result.sourcePoints.push({x: sourceBounds.x                      , y: sourceBounds.y + sourceBounds.height / 2})
              result.targetPoints.push({x: targetBounds.x + targetBounds.width , y: sourceBounds.y + sourceBounds.height / 2})
            }
          }
        }

        return result
      }

      // Find the closest points on 2 rectangles to draw a line connection
      function _bestCoordinates (sourceBounds, targetBounds, cfg) {
        let result               = { x1: sourceBounds.x, y1: sourceBounds.y, x2: targetBounds.x, y2: targetBounds.y }
        let centerPointOnSource  = _rectCenterPoint(sourceBounds)
        let centerPointOnTarget  = _rectCenterPoint(targetBounds)
        let lineFromCenterPoints = { x1: centerPointOnSource.x, y1: centerPointOnSource.y, x2: centerPointOnTarget.x, y2: centerPointOnTarget.y }
        let idealPointOnSource   = _closestIntersectingPointOnRectangleWithLine(centerPointOnSource, sourceBounds, lineFromCenterPoints)
        let idealPointOnTarget   = _closestIntersectingPointOnRectangleWithLine(centerPointOnTarget, targetBounds, lineFromCenterPoints)
        let sourcePoints         = _rectanglePorts(sourceBounds, cfg.layoutGapTolerance)
        let targetPoints         = _rectanglePorts(targetBounds, cfg.layoutGapTolerance)

        sourcePoints.push(idealPointOnSource)
        targetPoints.push(idealPointOnTarget)

        let visuallyAppealingPoints = _visuallyAppealingConnectionPoints(sourceBounds, targetBounds, cfg.layoutGapTolerance)
        for (let sourcePoint of visuallyAppealingPoints.sourcePoints)
          sourcePoints.push(sourcePoint)

        for (let targetPoint of visuallyAppealingPoints.targetPoints)
          targetPoints.push(targetPoint)

        let minDistance = Number.MAX_SAFE_INTEGER

        for (let i = 0; i < sourcePoints.length; i++) {
          for (let j = 0; j < targetPoints.length; j++) {
            if (! (cfg.visitedPoints.has(_pointKey(sourcePoints[i].x, _pointKey(sourcePoints[i].y))) || cfg.visitedPoints.has(_pointKey(targetPoints[j].x, _pointKey(targetPoints[j].y))))) {
              let d = _distanceBetweenPoints(sourcePoints[i].x, sourcePoints[i].y, targetPoints[j].x, targetPoints[j].y)

              if (d <= minDistance) {
                minDistance = d
                result = { x1: parseInt(sourcePoints[i].x), y1: parseInt(sourcePoints[i].y), x2: parseInt(targetPoints[j].x), y2: parseInt(targetPoints[j].y) }
              }
            }
          }
        }

        return result
      }

      // Draw relationships between elements
      function _drawEdges (currentView, cfg) {
        if (_debugEnabled(cfg))
          console.log("\n+Processing edges")

        let connections = $(currentView).find().filter(_elementIsConnection)
        let relBuffer   = []
        let ArrayList   = Java.type("java.util.ArrayList")
        let obstacles   = new ArrayList(cfg.elementBoundsById.size) // For Java interop purposes

        cfg.elementBoundsById.forEach( function(bounds, id) {
          if (cfg.obstaclesSet.has(id)) {
            let obstacle = new ArrayList(4)  // For Java interop purposes
            obstacle.add(bounds.x); obstacle.add(bounds.y ); obstacle.add(bounds.width); obstacle.add(bounds.height);
            obstacles.add(obstacle);
          }
        })

        connections.each (function (e) {
          let lineColor = e.lineColor || _defaultLineColor
          let drawLineArrows = !(e.type.startsWith("association") || e.type.startsWith("composition") || e.type.startsWith("aggregation") || e.type.endsWith("-connection"))
          let sourceBounds = cfg.elementBoundsById.get(e.source.id)
          let targetBounds = cfg.elementBoundsById.get(e.target.id)

          if (_rectangleContains(sourceBounds, targetBounds) || _rectangleContains(targetBounds, sourceBounds ))
            return

          if (_debugEnabled(cfg))
            console.log("++Drawing edge from '", e.source, "' to '", e.target, "'")

          let itinerary = {x1: sourceBounds.x, y1: sourceBounds.y, x2: targetBounds.x, y2: targetBounds.y}
          let bendpoints = new ArrayList(e.relativeBendpoints.length + 1)

          if (e.relativeBendpoints.length != 0) {
            let centerPointOnSource  = _rectCenterPoint(sourceBounds)
            let centerPointOnTarget  = _rectCenterPoint(targetBounds)

            for (let p of e.relativeBendpoints) {
              let bendpoint = new ArrayList(4)
              bendpoint.add(p.startX + centerPointOnSource.x);   bendpoint.add(p.startY + centerPointOnSource.y);
              bendpoint.add(p.endX   + centerPointOnTarget.x ); bendpoint.add(p.endY   + centerPointOnTarget.y);
              bendpoints.add(bendpoint);
            }

            let bendPointCount = bendpoints.size()
            let startPoint = {x: 0, y: 0}; let endPoint = {x: 0, y: 0};
            let startComparisonPoint = {x: bendpoints.get(0).get(0), y: bendpoints.get(0).get(1)}
            let startLine = {x1: centerPointOnSource.x, y1: centerPointOnSource.y, x2: startComparisonPoint.x, y2: startComparisonPoint.y}
            let endComparisonPoint = {x: bendpoints.get(bendPointCount - 1).get(2), y: bendpoints.get(bendPointCount - 1).get(3)}
            let endLine = {x1: centerPointOnTarget.x, y1: centerPointOnTarget.y, x2: endComparisonPoint.x , y2: endComparisonPoint.y}

            if (sourceBounds.x < startComparisonPoint.x && sourceBounds.x + sourceBounds.width > startComparisonPoint.x) {
              startPoint.x = startComparisonPoint.x
            } else if (startComparisonPoint.x < sourceBounds.x) {
              startPoint.x = parseInt(Math.max(sourceBounds.x, startComparisonPoint.x))
            } else {
              startPoint.x = parseInt(Math.min(sourceBounds.x + sourceBounds.width, startComparisonPoint.x))
            }

            if (targetBounds.x < endComparisonPoint.x && targetBounds.x + targetBounds.width > endComparisonPoint.x) {
              endPoint.x = endComparisonPoint.x
            } else if (endComparisonPoint.x < targetBounds.x) {
              endPoint.x = targetBounds.x
            } else {
              endPoint.x = targetBounds.x + targetBounds.width
            }

            if (sourceBounds.y < startComparisonPoint.y && sourceBounds.y + sourceBounds.height > startComparisonPoint.y) {
              startPoint.y = startComparisonPoint.y
            } else if (startComparisonPoint.y > sourceBounds.y) {
              startPoint.y = parseInt(Math.min(sourceBounds.y + sourceBounds.height, startComparisonPoint.y))
            } else {
              startPoint.y = parseInt(Math.max(sourceBounds.y, startComparisonPoint.y))
            }

            if (targetBounds.y < endComparisonPoint.y && targetBounds.y + targetBounds.height > endComparisonPoint.y) {
              endPoint.y = endComparisonPoint.y
            } else if (endComparisonPoint.y > targetBounds.y) {
              endPoint.y = parseInt(Math.min(targetBounds.y + targetBounds.height, endComparisonPoint.y))
            } else {
              endPoint.y = parseInt(Math.max(targetBounds.y, endComparisonPoint.y))
            }

            itinerary  = {x1: startPoint.x, y1: startPoint.y, x2: endPoint.x, y2: endPoint.y}
          } else {
            itinerary = _bestCoordinates(sourceBounds, targetBounds, cfg)
          }

          if (_debugEnabled(cfg))
            console.log("+++Connection start and end points: ", itinerary)

          cfg.visitedPoints.add(_pointKey(itinerary.x1, itinerary.y1))
          cfg.visitedPoints.add(_pointKey(itinerary.x2, itinerary.y2))

          if (_debugEnabled(cfg))
            console.log("+++Computing point list to draw connection lines")

          let linePoints = []

          if (bendpoints.size() != 0) {
            linePoints.push({x: itinerary.x1, y: itinerary.y1})

            for (let bendpoint of bendpoints) {
              let x1 = bendpoint.get(0); let y1 = bendpoint.get(1); let x2 = bendpoint.get(2); let y2 = bendpoint.get(3);
              linePoints.push({x: x1, y: y1})
              linePoints.push({x: x2, y: y2})
            }

            linePoints.push({x: itinerary.x2, y: itinerary.y2})
          } else {
            let JRRouter = Java.type("RRouter")
            let router = new JRRouter()
            let pointList = router.solveFor(obstacles, bendpoints, itinerary.x1, itinerary.y1, itinerary.x2, itinerary.y2)

            if (pointList.size() == 0) {
              linePoints.push({x: itinerary.x1, y: itinerary.y1})
              linePoints.push({x: itinerary.x2, y: itinerary.y2})
            } else {
              for (let j = 0; j < pointList.size(); j++)
                linePoints.push( {x: parseInt(pointList.getPoint(j).x), y: parseInt(pointList.getPoint(j).y)} )
            }
          }

          let lineStyle = ''
          let lineStyleArrow = ''
          let invertedLineArrows = false

          if (e.type == 'realization-relationship' || e.type == 'access-relationship') {
            if (cfg.dashLinesEnabled) {
              lineStyle = ` stroke-dasharray="${cfg.dashSizeLine}" `
              lineStyleArrow = ` stroke-dasharray="${cfg.dashSizeLineArrow}" `
            }

            if (e.concept.accessType == 'read' || e.concept.accessType == '') {
              invertedLineArrows = true
              linePoints.reverse()
            }
          }

          let p0 = linePoints[0]

          let lineData = "<path d=\"M " + p0.x + " " + p0.y

          // Deal with bendpoints as gracefully as possible...
          // See https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#b%C3%A9zier_curves
          if (linePoints.length > 2) {
            let pn = linePoints[linePoints.length - 1]
            let lastIdx = 0

            for (let j = 1; j < linePoints.length - 2; j +=3) {
              let p =  linePoints[j]
              let p1 = linePoints[j + 1]
              let p2 = linePoints[j + 2]

              if (j == 1)
                lineData = lineData + " C " + p1.x + " " + p1.y
              else
                lineData = lineData + " , " + p1.x + " " + p1.y

              lineData = lineData + " , " + p.x + " " + p.y
              lineData = lineData + " , " + p2.x + " " + p2.y

              lastIdx = (j + 2)
            }

            if (lastIdx != (linePoints.length - 1))
              lineData = lineData + " L " + pn.x + " " + pn.y
          } else {
            for (let j = 1; j < linePoints.length; j++) {
              let p = linePoints[j]
              lineData = lineData + " L " + p.x + " " + p.y
            }
          }

          let strokeWidth = (e.lineWidth || _defaultLineWidth)

          let lineArrowStyle = ''
          if (drawLineArrows) {
            let colorId = lineColor.slice(1)
            cfg.markerColors.add(colorId)
            lineArrowStyle = " marker-end=\"url(#arrow-end-" + colorId + ")\" "
          }

          lineData = lineData + "\""  + lineArrowStyle + " stroke=\"" + lineColor + "\"  fill-opacity=\"0\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"" + strokeWidth + "\"" + lineStyle + " />"

          relBuffer.push(lineData)

          if (e.type.startsWith("composition") || e.type.startsWith("aggregation")) {
            let groupingPath = _aggregationIconAt(p0.x, p0.y, cfg.rectLinkSize, lineColor)
            relBuffer.push(groupingPath)
          }

          let relText = e.labelValue.length ? e.labelValue : e.name

          if (relText.trim().length != 0) {
            if (_debugEnabled(cfg))
              console.log("+++Drawing connection label")

            let fontName = e.fontName || _defaultFontName
            let actualFontSize = (e.fontSize || _defaultFontSize)
            let fontWeight = (e.fontStyle.indexOf('bold') != -1) ? 'bold' : 'normal'
            let fontStyle = e.fontStyle.replaceAll('bold', '')
            if (fontStyle.length == 0) fontStyle = 'normal'
            let fontStyleTextLines = _mapToJavaFontStyle(fontWeight, fontStyle)

            let relTextWidth = strings.pixelWidth(relText, fontName, fontStyleTextLines, actualFontSize)
            let currentLineHeight = strings.pixelHeight(fontName, fontStyleTextLines, actualFontSize)
            let p1 = linePoints[linePoints.length - 2]
            let p2 = linePoints[linePoints.length - 1]
            let relTextPoint = _labelTextLocation(e.textPosition, linePoints)
            let fontColor = (e.fontColor || _defaultFontColor)
            let textData = ''
            let pos = 0

            for (let relLineText of _sanitizeText(relText).split("\n")) {
              let effectiveX = relTextPoint.x

              if (effectiveX + relTextWidth > cfg.svgWidth)
                effectiveX = cfg.svgWidth - (relTextWidth / 2)

              textData = textData + `<tspan x="${effectiveX }"  font-size="${actualFontSize}" dy="1em">${relLineText}</tspan>`
              pos += (currentLineHeight)
            }

            // Make the relation text readable enough by drawing the text twice (first with a white color -> painting program eraser effect)
            let lineText = `<text x="${relTextPoint.x}" y="${relTextPoint.y}" font-size="${actualFontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" stroke-width="3" stroke="#ffffff" text-anchor="middle" fill="#ffffff">${textData}</text>`
            lineText += `<text x="${relTextPoint.x}" y="${relTextPoint.y}" font-size="${actualFontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="middle"  fill="${fontColor}">${textData}</text>`

            relBuffer.push(lineText)
          }

        })

        return relBuffer
      }

      // Tell if we want verbose messages
      function _debugEnabled(cfg) {
        return (cfg.debug == true)
      }

      // This is based on some of the Eclipse GEF logic iirc
      // can't remember exactly where it is in the legacy GEF source code tree....
      function _labelTextLocation(textPosition, linePoints) {
        if (textPosition == 2) { // SOURCE
          return linePoints[0]
        } else if (textPosition == 3) { // TARGET
          return linePoints[linePoints.length - 1]
        } else {
          if (linePoints.length % 2 == 0) {
            let i  = Math.floor(linePoints.length / 2 )
            let j  = i - 1
            let p1 = linePoints[j]
            let p2 = linePoints[i]
            let dw = p2.x - p1.x
            let dh = p2.y - p1.y

            return {
              x: p1.x + (dw / 2),
              y: p1.y + (dh / 2)
            }
          }

          let idx = Math.floor((linePoints.length - 1) / 2)

          return linePoints[idx]
        }
      }

      if (! currentView)
        throw new Error("> No view selected: exiting.")

      let imageSize = _calcImageSize(currentView, cfg)
      cfg.svgWidth  = Math.max(cfg.svgWidth,  imageSize.width)
      cfg.svgHeight = Math.max(cfg.svgHeight, imageSize.height)

      let imgBackgroundStyle = ""

      if (cfg.imgBackgroundColor != null && cfg.imgBackgroundColor.trim().length != 0)
        imgBackgroundStyle = ` style="background-color:${cfg.imgBackgroundColor}" `

      let svgText     = `<svg width='${cfg.svgWidth}' height='${cfg.svgHeight}' ` + imgBackgroundStyle + ` xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'>`
      let buffer      = _drawVertices(currentView, cfg)
      let relBuffer   = _drawEdges(currentView, cfg)
      let arrowBuffer = _drawMarkers(cfg)

      svgText = svgText + arrowBuffer
      svgText = svgText + buffer.join("\n")
      svgText = svgText + relBuffer.join("\n")
      svgText = svgText + "\n</svg>"

      if (cfg.dumpSvg == true) {
        console.log("---- SVG DUMP BEGINS ---- ")
        console.log(svgText)
        console.log("---- SVG DUMP ENDS   ---- ")
      }

      let JString = Java.type("java.lang.String")
      let svgTextBytes = new JString(svgText).getBytes()

      console.log(`\n+Exporting view(id:${currentView.id}, name:${currentView.name}) to SVG in base64 format\n`)

      return svgTextBytes
    }

    function _drawMarkers(cfg) {
      let result = "\n<defs>\n"

      for (let markerColor of cfg.markerColors) {
        result = result + `
    <marker id="arrow-end-${markerColor}" viewBox="0 0 10 10" refX="9" refY="5"
          markerUnits="strokeWidth"
          markerWidth="10" markerHeight="10"
          orient="auto">
      <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="#${markerColor}"/>
    </marker>`
      }

      result = result + "\n</defs>\n"

      return result
    }

    function _renderViewAsPngBase64 (svgTextBytes, cfg) {
      let JString = Java.type("java.lang.String")
      let svgText = new JString(svgTextBytes)
      let JSvgToPng = Java.type("SvgToPng")

      console.log(`\n+Exporting view(id:${currentView.id}, name:${currentView.name}) to PNG in base64 format\n`)
      let svgToPng = new JSvgToPng()

      return svgToPng.toPngBase64FromString(svgText, cfg.imgBackgroundColor, cfg.imgTargetGeometry)
    }

    if (currentView == null)
      throw new Error("Please provide an archimate diagram as input. No diagram was provided")

    if (currentView.type != "archimate-diagram-model")
      throw new Error("Please select a regular archimate diagram! Received " + currentView.type + " as input.")

    // Override default settings with user provided options
    Object.assign(cfg, (options || {}))

    if (!cfg.format)
      throw new Error("An image format is required (svg or png)")

    cfg.format = cfg.format.toLowerCase()

    if (! (cfg.format == "svg" || cfg.format == "png") )
      throw new Error("Unsupported format '" + cfg.format + "'! Supported image formats are: 'svg' or 'png'.")

    let specs = model.getSpecializations();

    if (!specs.isEmpty()) {
      let archiveManager = Java.type("com.archimatetool.editor.model.IArchiveManager").FACTORY.createArchiveManager(model)
      let modelFilePath = model.getPath()
      let JFile = Java.type("java.io.File")
      archiveManager.loadImagesFromModelFile(new JFile(modelFilePath))
      cfg.archiveManager = archiveManager
    }

    let svgTextBytes = _renderViewAsSvgBase64(currentView, cfg)

    if (cfg.format == "svg") {
      let JBase64 = Java.type("java.util.Base64")

      return JBase64.getEncoder().encodeToString(svgTextBytes)
    }

    return _renderViewAsPngBase64(svgTextBytes, cfg)
  }

}
