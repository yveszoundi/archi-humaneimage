/*
 * Generate a humane image from an ArchiMate Diagram Model object
 * Author: Yves Zoundi
 * Version: 0.1
 * This script creates a plain image from a diagram (just lines and rectangles, no figures)
 * - It is assumed that there are no negative coordinates (WIP, current limitation)
 * - Similarly to the above point, there needs to be a translation of actual coordinates relatively to the desired margin
 * - Positioning lines is a best effort and doesn't reflect 100% what's drawn in Archi (not WYSIWYG)
 */

load(__SCRIPTS_DIR__ + "lib/strings.lib.js")
load(__SCRIPTS_DIR__ + "lib/reflections.lib.js")

var humaneImage = {
  "renderViewAsBase64": function (currentView, options) {
    const _defaultLineWidth = 1
    const _defaultFontSize  = 12
    const _defaultFillColor = "#ffffff"
    const _defaultLineColor = "#ffffff"
    const _defaultFontColor = "#ffffff"
    const _defaultFontName  = "Monospace"

    let cfg = {
      imgBackgroundColor            : "#ffffff",
      layoutGapTolerance            : 5,
      svgWidth                      : 5,
      svgHeight                     : 5,
      imageMargin                   : {top: 20, left: 20},
      elementBoundsById             : new Map(),
      obstaclesSet                  : new Set(),
      visitedPoints                 : new Set(),
      rectRoundedEnabled            : true,
      rectRoundedRadius             : 5,
      rectLinkSize                  : 4,
      dashSizeLine                  : 4,
      dashSizeLineArrow             : 2,
      dashLinesEnabled              : false,
      pointsSimplificationTolerance : 4.0,
      debug                         : false,
      drawUserIconsEnabled          : true,
      doNotDrawTextWheBoxIsTooSmall : true,
      rgbColorByElementType         : {
        "application-collaboration" : "rgb(0,   255, 255)",
        "application-component"     : "rgb(0,   255, 255)",
        "application-event"         : "rgb(0,   255, 255)",
        "application-function"      : "rgb(0,   255, 255)",
        "application-interaction"   : "rgb(0,   255, 255)",
        "application-interface"     : "rgb(0,   255, 255)",
        "application-process"       : "rgb(0,   255, 255)",
        "application-service"       : "rgb(0,   255, 255)",
        "artifact"                  : "rgb(153, 255, 51)",
        "assessment"                : "rgb(255, 153, 255)",
        "business-actor"            : "rgb(255, 255, 51)",
        "business-collaboration"    : "rgb(255, 255, 51)",
        "business-event"            : "rgb(255, 255, 51)",
        "business-function"         : "rgb(255, 255, 51)",
        "business-interaction"      : "rgb(255, 255, 51)",
        "business-interface"        : "rgb(255, 255, 51)",
        "business-object"           : "rgb(255, 255, 51)",
        "business-process"          : "rgb(255, 255, 51)",
        "business-role"             : "rgb(255, 255, 51)",
        "business-service"          : "rgb(255, 255, 51)",
        "communication-network"     : "rgb(153, 255, 51)",
        "capability"                : "rgb(255, 204, 153)",
        "constraint"                : "rgb(255, 153, 255)",
        "contract"                  : "rgb(255, 255, 51)",
        "course-of-action"          : "rgb(255, 204, 153)",
        "data-object"               : "rgb(0,   255, 255)",
        "deliverable"               : "rgb(255, 204, 204)",
        "device"                    : "rgb(153, 255, 51)",
        "diagram-model-group"       : "rgb(230, 230, 230)",
        "distribution-network"      : "rgb(153, 255, 51)",
        "driver"                    : "rgb(255, 153, 255)",
        "equipment"                 : "rgb(153, 255, 51)",
        "facility"                  : "rgb(153, 255, 51)",
        "gap"                       : "rgb(156, 223, 188)",
        "goal"                      : "rgb(255, 153, 255)",
        "grouping"                  : "rgb(255, 255, 255)",
        "implementation-event"      : "rgb(255, 204, 204)",
        "location"                  : "rgb(230, 189, 148)",
        "material"                  : "rgb(153, 255, 51)",
        "meaning"                   : "rgb(255, 153, 255)",
        "node"                      : "rgb(153, 255, 51)",
        "outcome"                   : "rgb(255, 153, 255)",
        "path"                      : "rgb(153, 255, 51)",
        "plateau"                   : "rgb(156, 223, 188)",
        "principle"                 : "rgb(255, 153, 255)",
        "product"                   : "rgb(255, 255, 51)",
        "representation"            : "rgb(255, 255, 51)",
        "resource"                  : "rgb(255, 204, 153)",
        "requirement"               : "rgb(255, 153, 255)",
        "stakeholder"               : "rgb(255, 153, 255)",
        "system-software"           : "rgb(153, 255, 51)",
        "technology-collaboration"  : "rgb(153, 255, 51)",
        "technology-event"          : "rgb(153, 255, 51)",
        "technology-function"       : "rgb(153, 255, 51)",
        "technology-interaction"    : "rgb(153, 255, 51)",
        "technology-interface"      : "rgb(153, 255, 51)",
        "technology-process"        : "rgb(153, 255, 51)",
        "technology-service"        : "rgb(153, 255, 51)",
        "value"                     : "rgb(255, 153, 255)",
        "value-stream"              : "rgb(255, 204, 153)",
        "work-package"              : "rgb(255, 204, 204)",
        "workpackage"               : "rgb(255, 204, 204)"
      },
      format                        : "svg",
      dumpSvg                       : false
    }

    function _translateBounds(bounds, offset, margin) {
      // TODO improve...
      return bounds
    }

    function _elementIsConnection(e) {
      return (e.type.endsWith("-relationship") || e.type.endsWith("-connection"))
    }

    function _renderViewAsSvgBase64(currentView, cfg) {
      const _edraw2dJarPath = __SCRIPTS_DIR__ + "lib/edraw2d.lib.jar"

      // calculate min coordinates
      function _findMinCoords(activeView, cfg) {
        let minX = Number.MAX_SAFE_INTEGER
        let minY = Number.MAX_SAFE_INTEGER

        $(activeView).children().each(function(e) {
          if (! _elementIsConnection(e)) {
            minX = Math.min(minX, e.bounds.x)
            minY = Math.min(minY, e.bounds.y)
          }
        })

        return { x: minX, y: minY }
      }

      // Calculate image size
      // TODO we should pre-render first, but we dont :-)
      // 1. pre-render
      // 2. Translate bounds of rectangles and their text (desired margin)
      // 3. Translate coordinates of line connections (desired margin)
      // 4. Set the actual image dimension with added margins, account for label positions too...
      function _calcImageSize(activeView, cfg) {
        let minCoords = _findMinCoords(activeView, cfg)

        if (minCoords.x == Number.MAX_SAFE_INTEGER || minCoords.y == Number.MAX_SAFE_INTEGER) {
          return {x: cfg.imageMargin.left, y: cfg.imageMargin.top}
        }

        let maxWidth = 0
        let maxHeight = 0

        if (_debugEnabled(cfg))
          console.log("++Calculating image size")

        // TODO This is not precise, as it is assume that we don't account for connections around the diagram nodes/elements
        // Deal with connection bendpoints instead of just elements
        $(activeView).find().each(function(e) {
          if (! _elementIsConnection(e)) {
            maxWidth  = Math.max(maxWidth,  (e.bounds.x + e.bounds.width))
            maxHeight = Math.max(maxHeight, (e.bounds.y + e.bounds.height))
          }
        })

        cfg.offset = {x: parseInt(minCoords.x), y: parseInt(minCoords.y) }
        let marginLeft = minCoords.x > 0 ? minCoords.x : cfg.imageMargin.left
        let marginTop = minCoords.y > 0 ? minCoords.y : cfg.imageMargin.top
        let result = {
          width : parseInt(maxWidth   + marginLeft),
          height: parseInt(maxHeight  + marginTop)
        }

        if (_debugEnabled(cfg))
          console.log("++The image will be generated with the following dimensions:", result)

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
      function _textIsDrawable(originalText, newText) {
        let originalWords = originalText.split(/(\s+)/).filter( function(e) { return e.trim().length > 0; } );
        let newTextSet = new Set()

        for (let newTextLine of newText) {
          let newTextLineWords = newTextLine.split(/(\s+)/).filter( function(e) { return e.trim().length > 0; } );

          for (let newTextLineWord of newTextLineWords)
            newTextSet.add(newTextLineWord)
        }

        for (let originalWord of originalWords) {
          if (newTextSet.has(originalWord))
            return true
        }

        return false
      }

      // Draw multiline text for a given element
      function _drawMultilineText (text, x, y, widthLimit, heightLimit, fontName, fontSize, fontWeight, fontStyle, textAlignment, textPosition, shouldNotDrawTextWheBoxIsTooSmall) {
        let newText = strings.textLines(text, widthLimit, fontSize)
        let textData = ''

        if (shouldNotDrawTextWheBoxIsTooSmall) {
          if (!_textIsDrawable(text, newText))
            return textData
        }

        let dy = 0
        let lineHeight = strings.pixelHeight(fontName, fontSize)

        if (textPosition != 0) {   // TOP
          if (textPosition == 1) { // CENTER
            dy = (dy + heightLimit/2) - ( (lineHeight * newText.length) / 2)
          } else {                // BOTTOM
            dy = heightLimit - (lineHeight * newText.length)
          }
        }

        dy+= (lineHeight  + y)

        for (let newTextLine of newText) {
          newTextLine = _sanitizeText(newTextLine)
          let horizontalTextPosition = x

          if (textAlignment != 1 ) {  // LEFT
            let newTextLineWidth = strings.pixelWidth(newTextLine, fontName, fontSize)

            if (textAlignment == 2) { // MIDDLE
              horizontalTextPosition = (x + (widthLimit  / 2)) - (newTextLineWidth / 2)
            } else {                  // RIGHT
              horizontalTextPosition = (x + widthLimit) - newTextLineWidth
            }
          }

          textData = textData + `<tspan x="${horizontalTextPosition}" y="${dy}" font-weight="${fontWeight}" font-style="${fontStyle}">${newTextLine}</tspan>`
          dy+= (lineHeight )
        }

        return textData
      }

      // Draw an element
      function _drawElement (bounds, element, cfg) {
        if (element.type.endsWith("-relationship"))
          return

        let adjustedBounds = _translateBounds(bounds, cfg.offset, cfg.imageMargin)
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
        let lineColor = element.lineColor
        let fontName = element.fontName || _defaultFontName
        let fontSize = element.fontSize || _defaultFontSize

        let groupingStyle = ''
        if (element.type == 'grouping')
          groupingStyle = ` stroke-dasharray="4" `

        let additionalRectAttributes = ''
        if (cfg.rectRoundedEnabled == true)
          additionalRectAttributes = ` rx="${cfg.rectRoundedRadius}" ry="${cfg.rectRoundedRadius}" `

        let result = `<rect ` + additionalRectAttributes +  ` x = "${adjustedBounds.x}" y="${adjustedBounds.y }" width="${adjustedBounds.width}"  ${groupingStyle}  height="${adjustedBounds.height}" fill="${fillColor}" stroke-width="1" stroke="${lineColor}"/>`

        if (itemText.length != 0) {
          if (!(element.type == 'junction')) {
            let fontColor = element.fontColor
            let fontWeight = (element.fontStyle.indexOf('bold') != -1) ? 'bold' : 'normal'
            let fontStyle = element.fontStyle.replaceAll('bold', '')
            if (fontStyle.length == 0) fontStyle = 'normal'
            let fontName = element.fontName || _defaultFontName
            let lineHeight = strings.pixelHeight(fontName, fontSize)
            let textData = _drawMultilineText(itemText, adjustedBounds.x, adjustedBounds.y, adjustedBounds.width, adjustedBounds.height, fontName, fontSize, fontWeight, fontStyle, element.textAlignment, element.textPosition, cfg.doNotDrawTextWheBoxIsTooSmall)

            result += `<text style="font-weight:normal" x="${adjustedBounds.x}" y="${adjustedBounds.y + lineHeight}" font-size="${fontSize}" font-family="${fontName}" fill="${fontColor}" font-style="${fontStyle}" font-weight="${fontWeight}">${textData}</text>`
          }
        }

        if (element.type =="business-actor" || element.type == "business-role" || element.type == 'stakeholder') {
          if (cfg.drawUserIconsEnabled == true) {
            let userIconRadius = 5
            let userIconX = adjustedBounds.x + adjustedBounds.width  - (userIconRadius * 1.2)
            let userIconY = adjustedBounds.y + (userIconRadius * 0.6)
            let userIconPath = userIconAt(userIconX, userIconY, userIconRadius, "black")

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

        $(currentView).find().not("relationship").each(function(e) {
          if (e.bounds) queue.push(e)
        })

        let parentIdByNodeId = new Map()

        while (queue.length != 0) {
          let item = queue.shift()
          let itemBounds = { x: item.bounds.x, y: item.bounds.y, width: item.bounds.width, height: item.bounds.height }

          if (parentIdByNodeId.has(item.id)) {
            let parentId     = parentIdByNodeId.get(item.id)
            let parentBounds = cfg.elementBoundsById.get(parentId)
            itemBounds.x += parentBounds.x
            itemBounds.y += parentBounds.y
          }

          if (!cfg.elementBoundsById.has(item.id)) {
            if (_debugEnabled(cfg))
              console.log("++Drawing vertex for '", item, "'")

            buffer.push (_drawElement(itemBounds, item, cfg))
          }

          $(item).children().not("relationship").not("diagram-note").each( function(itemChild) {
            queue.push(itemChild)
            parentIdByNodeId.set(itemChild.id, item.id)
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
      function userIconAt(xCenterPosition, yTopMostPosition, maxRadius, color) {
        let icon = ""
        let lr = maxRadius / 2
        let k1 = yTopMostPosition + (lr / 2)
        let lrr = maxRadius
        icon += `<circle cx="${xCenterPosition}" cy="${k1}" r="${lr}" fill="${color}"/>`
        k = k1 + (lr * 3)
        r = lrr

        function computeX(theta, r, xCenterPosition, k){ return r * Math.cos(theta) + xCenterPosition; }
        function computeY(theta, r, xCenterPosition, k){ return r * Math.sin(theta) + k; }

        let start = Math.PI;

        icon += `<path fill="${color}" d="`
        icon = icon + "M " + computeX(start, r, xCenterPosition, k) + " " + computeY(start, r, xCenterPosition, k);

        for (let theta = start; theta <= (2 * Math.PI); theta += .1) {
          let x = computeX(theta, r, xCenterPosition, k)
          let y = computeY(theta, r, xCenterPosition, k)
          icon = icon + (" L " + x + " " + y)
        }

        icon = icon + " Z\"/>"

        return icon
      }

      // Draw line end arrow for a given line (fromx, fromy) -> (tox, toy)
      function _lineArrow (fromx, fromy, tox, toy, color, strokeWidth, lineStyle) {
        // See from https://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag
        function _lineArrowDelegate (fromx, fromy, tox, toy, color, strokeWidth, lineStyle) {
          let headlen = 10
          let dx = tox - fromx
          let dy = toy - fromy
          let angle = Math.atan2(dy, dx)
          let result = "<path d=\""

          result = result + ('M ' + fromx + ' ' + fromy)
          result = result + " L " + tox   + " " + toy
          result = result + " L " + (tox - headlen * Math.cos(angle - Math.PI / 6)) + " " + (toy - headlen * Math.sin(angle - Math.PI / 6))
          result = result + (" M " + tox   + " " + toy)
          result = result + (" L " + (tox - headlen * Math.cos(angle + Math.PI / 6)) + " " + (toy - headlen * Math.sin(angle + Math.PI / 6)))
          result = result + " Z\" stroke=\"" + color + "\"  fill-opacity=\"255\" stroke-linejoin=\"round\" stroke-width=\"" + strokeWidth + "\" " + lineStyle + "/>"

          return result
        }

        // See https://stackoverflow.com/questions/1250419/finding-points-on-a-line-with-a-given-distance
        // TODO It's assumed that the line segment is not too tiny to overlap elements, etc.
        let d = _distanceBetweenPoints(fromx, fromy, tox, toy)
        let dt = d * 0.95 // Pick a distance near the end of the line segment - target point "p(px, py)" close to "to(tox, toy)"
        let t = dt / d
        let px = ((1 - t) * fromx + t * tox)
        let py = ((1 - t) * fromy + t * toy)

        if (isNaN(px) || isNaN(py))
          return ""

        return _lineArrowDelegate(px, py, tox, toy, color, strokeWidth, lineStyle)
      }

      // Return lines for each side of a given rectangle
      function _getRectangleLines(rectangle) {
        return [
          {
            x1: rectangle.x,
            y1: rectangle.y,
            x2: rectangle.x + rectangle.width,
            y2: rectangle.y
          },
          {
            x1: rectangle.x,
            y1: rectangle.y + rectangle.height,
            x2: rectangle.x + rectangle.width,
            y2: rectangle.y + rectangle.height
          },
          {
            x1: rectangle.x,
            y1: rectangle.y,
            x2: rectangle.x,
            y2: rectangle.y + rectangle.height
          },
          {
            x1: rectangle.x + rectangle.width,
            y1: rectangle.y,
            x2: rectangle.x + rectangle.width,
            y2: rectangle.y + rectangle.height
          }
        ]
      }

      // See https://stackoverflow.com/questions/15514906/how-to-check-intersection-between-a-line-and-a-rectangle
      // Compute the intersection point between 2 lines
      function _intersectionPointForLines(pLine1, pLine2) {
        let result = null

        let s1_x = pLine1.x2 - pLine1.x1
        let s1_y = pLine1.y2 - pLine1.y1
        let s2_x = pLine2.x2 - pLine2.x1
        let s2_y = pLine2.y2 - pLine2.y1

        let s = (-s1_y * (pLine1.x1 - pLine2.x1) + s1_x * (pLine1.y1 - pLine2.y1)) / (-s2_x * s1_y + s1_x * s2_y)
        let t = ( s2_x * (pLine1.y1 - pLine2.y1) - s2_y * (pLine1.x1 - pLine2.x1)) / (-s2_x * s1_y + s1_x * s2_y)

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1){
          let x = parseInt (pLine1.x1 + (t * s1_x))
          let y = parseInt(pLine1.y1 + (t * s1_y))

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
            let d = Math.abs(_distanceBetweenPoints(refPoint.x, refPoint.y, p.x, p.y))
            if (d < minDistance) {
              result = p
              minDistance = d
            }
          }
        }

        return result
      }

      // Gather a set of points on a rectangle
      // Those points will be evaluated to find the minimum distance for connectivity to another rectangle
      function _rectanglePorts (r, layoutGapTolerance) {
        let preferredInternal = layoutGapTolerance
        let rxCenter = (r.x + r.width) / 2
        let ryCenter = (r.y + r.height) / 2

        if (r.width > preferredInternal && r.height > preferredInternal) {
          let result   = []

          for (let i = r.x + preferredInternal; i <= r.x + r.width - preferredInternal; i+= preferredInternal) {
            let k = Math.abs(rxCenter - i) / layoutGapTolerance
            result.push({ x: i, y: r.y, rnk: k })
            result.push({ x: i, y: r.y + r.height, rnk: k })
          }

          for (let j = r.y + preferredInternal; j < r.y + r.height - preferredInternal ; j+= preferredInternal) {
            let k = Math.abs(ryCenter - j) / layoutGapTolerance
            result.push({ x: r.x, y: j, rnk: k })
            result.push({ x: r.x + r.width, y: j, rnk: k })
          }

          return result
        } else {
          return [
            { x: r.x,               y: r. y, rnk: (Math.abs(rxCenter - r.x) / layoutGapTolerance)},
            { x: r.x,               y: r.y + r.height, rnk: (Math.abs(rxCenter - r.y + r.height) / layoutGapTolerance)},
            { x: r.x + r.width,     y: r. y, rnk: (Math.abs(rxCenter - r.x + r.width) / layoutGapTolerance)},
            { x: r.x + r.width,     y: r.y + r.height, rnk: (Math.abs(rxCenter - r.x + r.width) / layoutGapTolerance) },
            { x: r.x + r.width / 2, y: r.y, rnk: 0},
            { x: r.x,               y: r.y + r.height / 2, rnk: 0 },
            { x: r.x + r.width / 2, y: r.y + r.height, rnk: 0},
            { x: r.x + r.width,     y: r.y + r.height / 2, rnk: 0}
          ]
        }
      }

      // Simple coordinate key to avoid lines overlap from a source or target point
      function _pointKey(x, y) {
        return x + "-" + y
      }

      // Find the closest points on 2 rectangles to draw a line connection
      function _bestCoordinates (r1, r2, cfg) {
        let result    =  { x1: r1.x, y1: r1.y, x2: r2.x, y2: r2.y }
        let rxCenter1 =  (r1.x + (r1.width  / 2))
        let ryCenter1 =  (r1.y + (r1.height / 2))
        let rxCenter2 =  (r2.x + (r2.width  / 2))
        let ryCenter2 =  (r2.y + (r2.height / 2))

        let lineFromCenterPoints = {x1: rxCenter1, y1: ryCenter1, x2: rxCenter2, y2: ryCenter2 }
        let p1 = {x: rxCenter1, y: ryCenter1}
        let p2 = {x: rxCenter2, y: ryCenter2}

        let rp1s = _closestIntersectingPointOnRectangleWithLine(p2, r1, lineFromCenterPoints)
        let rp2s = _closestIntersectingPointOnRectangleWithLine(p1, r2, lineFromCenterPoints)

        let rp1 = _rectanglePorts(r1, cfg.layoutGapTolerance)
        let rp2 = _rectanglePorts(r2, cfg.layoutGapTolerance)
        rp1.push(rp1s)
        rp2.push(rp2s)

        let minDistance = Number.MAX_SAFE_INTEGER

        for (let i = 0; i < rp1.length; i++) {
          for (let j = 0; j < rp2.length; j++) {
            if (! (cfg.visitedPoints.has(_pointKey(rp1[i].x, _pointKey(rp1[i].y))) || cfg.visitedPoints.has(_pointKey(rp2[j].x, _pointKey(rp2[j].y))))) {
              let d = _distanceBetweenPoints(rp1[i].x, rp1[i].y, rp2[j].x, rp2[j].y)

              if (d <= minDistance) {
                minDistance = d
                result = { x1: rp1[i].x, y1: rp1[i].y, x2: rp2[j].x, y2: rp2[j].y }
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

        let connections = $(currentView).find().filter(function(e) {
          return (e.type.trim().endsWith("-relationship") || e.type.trim().endsWith("-connection"))
        })

        let relBuffer = []
        let ArrayList = Java.type("java.util.ArrayList")
        let obstacles = new ArrayList(cfg.elementBoundsById.size) // For Java interop purposes

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
            let rxCenter  = parseInt(sourceBounds.x + (sourceBounds.width / 2))
            let ryCenter  = parseInt(sourceBounds.y + (sourceBounds.height / 2))
            let rxCenter1 = parseInt(targetBounds.x + (targetBounds.width / 2))
            let ryCenter1 = parseInt(targetBounds.y + (targetBounds.height / 2))

            for (let p of e.relativeBendpoints) {
              let bendpoint = new ArrayList(4)
              bendpoint.add(p.startX + rxCenter); bendpoint.add(p.startY + ryCenter);
              bendpoint.add(p.endX + rxCenter1 ); bendpoint.add(p.endY + ryCenter1);
              bendpoints.add(bendpoint);
            }

            let bendPointCount = bendpoints.size()
            let startPoint = {x: 0, y: 0}; let endPoint = {x: 0, y: 0};
            let startComparisonPoint = {x: bendpoints.get(0).get(0), y: bendpoints.get(0).get(1)}
            let startLine = {x1: rxCenter, y1: ryCenter, x2: startComparisonPoint.x, y2: startComparisonPoint.y}
            let endComparisonPoint = {x: bendpoints.get(bendPointCount - 1).get(2), y: bendpoints.get(bendPointCount - 1).get(3)}
            let endLine = {x1: rxCenter1, y1: ryCenter1, x2: endComparisonPoint.x , y2: endComparisonPoint.y}

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
            let pointList = reflections.invokeMethodFromJar(_edraw2dJarPath, "RRouter", "solveFor", [obstacles, bendpoints, itinerary.x1, itinerary.y1, itinerary.x2, itinerary.y2])

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
          // TODO Extra validations for bendpoints and valid paths for cubic curves (partitioning in groups of 3 points)
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

          lineData = lineData + "\""  + " stroke=\"" + lineColor + "\" fill-opacity=\"0\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"" + strokeWidth + "\"" + lineStyle + " />"

          relBuffer.push(lineData)

          if (drawLineArrows) {
            let p0 = linePoints[linePoints.length - 2]
            let p1 = linePoints[linePoints.length -1]

            if (!(p0.x == p1.x && p0.y == p1.y)) {
              let arrowPath = _lineArrow(p0.x, p0.y, p1.x, p1.y, lineColor, strokeWidth, lineStyleArrow)
              relBuffer.push(arrowPath)
            }
          } else if (e.type.startsWith("composition") || e.type.startsWith("aggregation")) {
            let groupingPath = _aggregationIconAt(p0.x, p0.y, cfg.rectLinkSize, lineColor)
            relBuffer.push(groupingPath)
          }

          let relText = e.labelValue.length ? e.labelValue : e.name

          if (relText.trim().length != 0) {
            if (_debugEnabled(cfg))
              console.log("+++Drawing connection label")

            let fontName = e.fontName || _defaultFontName
            let actualFontSize = (e.fontSize || _defaultFontSize)
            let relTextWidth = strings.pixelWidth(relText, fontName, actualFontSize)
            let currentLineHeight = strings.pixelHeight(fontName, actualFontSize)
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

              textData = textData + `<tspan x="${effectiveX }" dy="1em">${relLineText}</tspan>`
              pos += (currentLineHeight)
            }

            // See https://stackoverflow.com/questions/15500894/background-color-of-text-in-svg
            // Make the relation text readable enough by drawing the text twice (first with a white color -> painting program eraser effect)
            let lineText = `<text x="${relTextPoint.x}" y="${relTextPoint.y}" font-size="${actualFontSize}" fill="white" fill-opacity="0.5" text-anchor="middle">${textData}</text>`
            lineText += `<text x="${relTextPoint.x}" y="${relTextPoint.y}" font-size="${actualFontSize}" text-anchor="middle" fill="${fontColor}">${textData}</text>`

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

            return {x:p1.x + (dw / 2), y: p1.y + (dh / 2)}
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

      if (cfg.imgBackgroundColor != null && cfg.imgBackgroundColor.trim().length != 0) {
        imgBackgroundStyle = ` style="background-color:${cfg.imgBackgroundColor}" `
      }

      let svgText = `<svg width='${cfg.svgWidth}' height='${cfg.svgHeight}' ` + imgBackgroundStyle + ` xmlns='http://www.w3.org/2000/svg'>\n`
      let buffer    = _drawVertices(currentView, cfg)
      let relBuffer = _drawEdges(currentView, cfg)

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

    function _renderViewAsPngBase64 (svgTextBytes, cfg) {
      let JString = Java.type("java.lang.String")
      let svgText = new JString(svgTextBytes)
      let svgToPngJarPath = __SCRIPTS_DIR__ + "lib/svgtopng.lib.jar"

      console.log(`\n+Exporting view(id:${currentView.id}, name:${currentView.name}) to PNG in base64 format\n`)

      return reflections.invokeMethodFromJar(svgToPngJarPath, "SvgToPng", "toPngBase64FromString", [svgText, cfg.imgBackgroundColor])
    }

    // Override default settings with user provided options
    Object.assign(cfg, (options || {}))

    if (!cfg.format)
      throw new Error("An image format is required (svg or png)")

    cfg.format = cfg.format.toLowerCase()

    if (! (cfg.format == "svg" || cfg.format == "png") )
      throw new Error("Unsupported format '" + cfg.format + "'! Supported image formats are: 'svg' or 'png'.")

    let svgTextBytes = _renderViewAsSvgBase64(currentView, cfg)

    if (options.format == "svg") {
      let Base64 = Java.type("java.util.Base64")

      return Base64.getEncoder().encodeToString(svgTextBytes)
    }

    return _renderViewAsPngBase64(svgTextBytes, cfg)
  }

}
