// Sometimes you just need lines and boxes for presentation purposes, without creating additional diagrams
// This is far from perfect with couple of unsolved issues for edges placement, edge labels and collisions, etc.

// A better option would have been the ability to alter directly the "figures" in memory in existing Archi data structures
// This is not possible at this time. The closest alternative seems to be the specialization plugin but that feels overkill for me.

load(__SCRIPTS_DIR__ + "lib/strings.js")
load(__SCRIPTS_DIR__ + "lib/reflections.js")
load(__SCRIPTS_DIR__ + "lib/pathfinding.js")

var humaneImage = {
    "renderViewAsBase64": function (currentView) {
        function _paddedBounds(bounds, padding) {
            return {
                x: bounds.x + padding,
                y: bounds.y + padding,
                width: bounds.width - padding,
                height: bounds.height - padding
            }
        }

        function _calcImageSize(activeView) {
            let minX = 1
            let maxX = 1
            let minY = 1
            let maxY = 1

            $(activeView).find().not("relationship").not("diagram-model-note").each(function(e) {
                minX = Math.min(minX, e.bounds.x)
                maxX = Math.max(maxX, e.bounds.x + e.bounds.width)
                minY = Math.min(minY, e.bounds.y)
                maxY = Math.max(maxY, e.bounds.y + e.bounds.height)
            })

            return { width : (maxX - minX), height: (maxY - minY) }
        }

        function _drawMultilineText (text, x, widthLimit, heightLimit, textAlignment, textPosition, padding, lineHeight) {
            text = text.replaceAll("&", "&amp;")
            let newText = strings.textLines(text, widthLimit)
            let textData = ''
            let dy = padding

            if (textPosition != 0) {  // TOP
                if (textPosition == 1) { // CENTER
                    dy = (dy + heightLimit/2) - ( (lineHeight * newText.length) / 2)
                } else { // BOTTOM
                    dy = heightLimit - (lineHeight * newText.length)
                }

                dy = (dy - padding * 2)
            }

            let gap = padding * 2

            for (let newTextLine of newText) {
                let horizontalTextPosition = x + gap

                if (textAlignment != 1 ) { // LEFT
                    let newTextLineWidth = strings.pixelWidth(newTextLine)

                    if (textAlignment == 2) { // MIDDLE
                        horizontalTextPosition = (x - padding + (widthLimit  / 2)) - (newTextLineWidth / 2) + gap
                    } else { // RIGHT
                        horizontalTextPosition = (x + widthLimit) - newTextLineWidth - gap
                    }
                }

                textData = textData + `<tspan x="${horizontalTextPosition}" dy="${dy}">${newTextLine}</tspan>`
                dy+= lineHeight
            }

            return textData
        }

        function _drawElement (bounds, element, cfg) {
            if (cfg.elementBoundsById.has(element.id))
                return

            if (element.type.endsWith("-relationship"))
                return

            let fillColor = "white"

            if (element.type == 'location') {
                fillColor = 'rgb(230, 189, 148)'
            } else if (element.type.startsWith("motivation-")
                       || element.type == "principle"
                       || element.type == "goal"
                       || element.type == "constraint"
                       || element.type == "meaning"
                       || element.type == "value"
                       || element.type == "stakeholder"
                       || element.type == "driver"
                       || element.type == "assessment"
                       || element.type == "outcome"
                       || element.type == "requirement") {
                fillColor = 'rgb(255, 153, 255)'
            } else if (element.type.startsWith("capability") || element.type.startsWith("resource") || element.type.startsWith("course-of-action")  || element.type.startsWith("value-stream")) {
                fillColor = 'rgb(255, 204, 153)'
            } else if (element.type.startsWith("business-") || element.type.startsWith("contract") || element.type.startsWith("representation") || element.type.startsWith("product")) {
                fillColor = "rgb(255, 255, 51)"
            } else if (element.type.startsWith("application-") || element.type.startsWith("data-object")) {
                fillColor = "rgb(0, 255, 255)"
            } else if (element.type.startsWith("technology-")
                       || element.type == "node"
                       || element.type == "device"
                       || element.type == "system-software"
                       || element.type == "path"
                       || element.type == "communication-network"
                       || element.type == "artifact") {
                fillColor = "rgb(153, 255, 51)"
            } else if (element.type.startsWith("gap") || element.type.startsWith("plateau")) {
                fillColor = "rgb(156, 223, 188)"
            } else if (element.type.startsWith("work-package") || element.type.startsWith("deliverable")) {
                fillColor = "rgb(255, 204, 204)"
            }

            if (element.type != "grouping" && $(element).children().length == 0) {
                cfg.obstaclesSet.add(element.id)
            }

            let adjustedBounds = {x : bounds.x + cfg.padding, y: bounds.y + cfg.padding, width: bounds.width - cfg.padding, height: bounds.height - cfg.padding}
            cfg.elementBoundsById.set(element.id, adjustedBounds)

            let itemText = element.labelValue

            if (itemText.length == 0) {
                itemText = element.name

                if (itemText.length == 0) {
                    if (element.text) {
                        itemText = element.text
                    }
                }
            }

            if (element.fillColor)
                fillColor = element.fillColor

            let lineColor = element.lineColor
            let result = `<rect x = "${bounds.x + cfg.padding}" y="${bounds.y + cfg.padding}" width="${bounds.width - cfg.padding}" height="${bounds.height - cfg.padding}" fill="${fillColor}" stroke-width="1" stroke="${lineColor}"/>`

            if (itemText.length != 0) {
                if (!(element.type == 'junction' || element.type == 'business-interface' || element.type == 'application-interface')) {
                    let textData = _drawMultilineText(itemText, bounds.x, bounds.width, bounds.height, element.textAlignment, element.textPosition, cfg.padding, cfg.lineHeight)
                    let fontColor = element.fontColor
                    let fontWeight = (element.fontStyle.indexOf('bold') != -1) ? 'bold' : 'normal'
                    let fontStyle = element.fontStyle.replaceAll('bold', '')
                    if (fontStyle.length == 0) fontStyle = 'normal'

                    result += `<text style="font-weight:normal" x="${bounds.x + cfg.padding * 2}" y="${bounds.y + cfg.lineHeight}" fill="${fontColor}" font-style="${fontStyle}" font-weight="${fontWeight}">${textData}</text>`
                }
            }

            return result
        }

        function _listChildren (buffer, parentBounds, parent, cfg) {
            parent.children().each (function (item) {
                let childBounds = {
                    x: parentBounds.x + item.bounds.x,
                    y: parentBounds.y + item.bounds.y,
                    width: item.bounds.width,
                    height: item.bounds.height
                }

                let itemText = item.labelValue
                if (itemText.length == 0) {
                    itemText = item.name

                    if (itemText.length == 0) {
                        if (item.text)
                            itemText = item.text
                    }
                }

                if (itemText.length != 0) {
                    buffer.push (_drawElement(childBounds, item, cfg))
                }

                if (childBounds) {
                    _listChildren(buffer, _paddedBounds(childBounds, cfg.padding), $(item), cfg)
                }
            })
        }

        function _drawVertices (currentView, cfg) {
            let buffer = []
            let drawElementFn = _drawElement
            let paddedBoundsFn = _paddedBounds
            let listChildrenFn = _listChildren

            $(currentView).find().not("relationship").each(function(e) {
                if (e.bounds) {
                    buffer.push (drawElementFn(e.bounds, e, cfg))
                    listChildrenFn(buffer, paddedBoundsFn(e.bounds, cfg.padding), $(e), cfg)
                }
            })

            return buffer
        }

        function _rectangleContains (r1, r2) {
            return r1.x <= r2.x && r2.x <= r1.x + r1.width &&
                r1.y <= r2.y && r2.y <= r1.y + r1.height
        }

        function _rectangleContainsPoint (r, x, y) {
            let tolerance = 5
            return r.x - tolerance <= x && x <= r.x + tolerance + r.width &&
                r.y - tolerance <= y && y <= r.y + r.height + tolerance
        }

        function _makeGrid (svgWidth, svgHeight, cellSize) {
            let rowCount = Math.ceil(svgWidth / cellSize).toFixed(0)
            let columnCount = Math.ceil(svgHeight / cellSize).toFixed(0)

            return new window.PF.Grid(rowCount, columnCount)
        }

        function _gridPoint (x, y, cellSize) {
            let px = Math.floor(x / cellSize).toFixed(0)
            let py = Math.floor(y / cellSize).toFixed(0)

            return {x: px, y: py}
        }

        function _addObstacles (grid, boundsById, obstaclesSet, svgWidth, svgHeight, cellSize) {
            boundsById.forEach( function(bounds, id) {
                if (obstaclesSet.has(id)) {
                    if ($(id).not('relationship').children().length == 0) {
                        for (let i = bounds.x; i <= svgWidth; i+= cellSize) {
                            for (let j = bounds.y; j <= svgHeight; j+= cellSize) {
                                let p = _gridPoint(i, j, cellSize)

                                if (p.x < grid.width && p.y < grid.height)
                                    grid.setWalkableAt(Math.abs(p.x), Math.abs(p.y), false)
                            }
                        }
                    }
                }
            })
        }

        function _normalizeGridPath (p, cellSize) {
            let result = []

            if (p.length == 0)
                return result

            for (let pp of p) {
                let x = pp[0] * cellSize
                let y = pp[1] * cellSize
                result.push({x: x, y: y})
            }

            return result
        }

        function _lineArrow (fromx, fromy, tox, toy) {
            // from https://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag
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
            result = result + " Z \" stroke=\"black\"  fill-opacity=\"0\" stroke-linejoin=\"round\" stroke-width=\"1\" />"

            return result
        }

        function _drawEdges (currentView, cfg) {
            let connections = $(currentView).find("relationship")
            let relBuffer = []
            let grid = _makeGrid(cfg.svgWidth, cfg.svgHeight, cfg.cellSize)
            _addObstacles(grid, cfg.elementBoundsById, cfg.obstaclesSet, cfg.svgWidth, cfg.svgHeight, cfg.cellSize)

            let finder = new window.PF.BiBestFirstFinder({
                allowDiagonal: false
            })

            connections.each (function (e) {
                let drawLineArrows = !(e.type.startsWith("association") || e.type.startsWith("composition") || e.type.startsWith("aggregation"))
                let sourceBounds = cfg.elementBoundsById.get(e.source.id)
                let targetBounds = cfg.elementBoundsById.get(e.target.id)

                if (_rectangleContains(sourceBounds, targetBounds) || _rectangleContains(targetBounds, sourceBounds ))
                    return

                let itineraryInfo = _itinerary(sourceBounds, targetBounds, cfg.layoutGapTolerance)

                let gridClone = grid.clone()
                let srcPoint = _gridPoint(itineraryInfo.start.x, itineraryInfo.start.y, cfg.cellSize)
                let destPoint = _gridPoint(itineraryInfo.end.x, itineraryInfo.end.y, cfg.cellSize)
                let path = finder.findPath(srcPoint.x, srcPoint.y, destPoint.x, destPoint.y, gridClone)
                let linePoints = _normalizeGridPath(path, cfg.cellSize)

                if (linePoints.length > 2) {
                    let alreadyOnTarget = false
                    let dropIndex = -1

                    for (let i = 1; i < linePoints.length - 1; i++) {
                        if (_rectangleContainsPoint(targetBounds, linePoints[i].x, linePoints[i].y)) {
                            if (alreadyOnTarget)
                                dropIndex = i

                            alreadyOnTarget = true
                        }
                    }

                    if (dropIndex != -1) {
                        linePoints = linePoints.slice(0, dropIndex)
                    }
                } else if (linePoints.length == 0) {
                    linePoints.push({ x: itineraryInfo.start.x, y: itineraryInfo.start.y })
                    linePoints.push({ x: itineraryInfo.end.x, y: itineraryInfo.end.y })
                }

                for (let j = 1; j < linePoints.length; j++) {
                    let lineData = `<line x1="${linePoints[j - 1].x}" y1="${linePoints[j - 1].y}" x2="${linePoints[j].x}" y2="${linePoints[j].y}" stroke="black" /> `
                    relBuffer.push(lineData)

                    if (drawLineArrows && (j == (linePoints.length - 1))) {
                        let arrowPath = _lineArrow(linePoints[j - 1].x, linePoints[j - 1].y, linePoints[j].x, linePoints[j].y)
                        relBuffer.push(arrowPath)
                    }
                }

                let relText = e.labelValue.length ? e.labelValue : e.name

                if (relText.length != 0) {
                    let relTextWidth = strings.pixelWidth(relText)

                    let relTextPoint = {
                        x: (linePoints[0].x + linePoints[linePoints.length - 1].x) / 2 - (relTextWidth / 2),
                        y: (linePoints[0].y + linePoints[linePoints.length - 1].y) / 2
                    }

                    relTextPoint.y = (sourceBounds.y > targetBounds.y) ? (relTextPoint.y + 8) :  (relTextPoint.y - 8)
                    let textData = ''
                    let pos = 0

                    for (let relLineText of relText.replaceAll("&", "&amp;").split("\n")) {
                        textData = textData + `<tspan x="${relTextPoint.x}" dy="${pos}">${relLineText}</tspan>`
                        pos += cfg.lineHeight
                    }

                    let lineText = `<text x="${relTextPoint.x}" y="${relTextPoint.y}" fill="blue">${textData}</text>`
                    relBuffer.push(lineText)
                }
            })

            return relBuffer
        }

        function _distanceBetweenPoints (x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
        }

        function _rectanglePoints (r) {
            // let preferredInternal = 2
            // if (r.width > preferredInternal && r.height > preferredInternal) {
            //     let result = new Array()

            //     for (let i = r.x; i <= r.x + r.width; i+= preferredInternal) {
            //         result.push({ x: i, y: r.y })
            //         result.push({ x: i, y: r.y + r.height })
            //     }

            //     for (let j = r.y + preferredInternal; j < r.y + r.height; j+= preferredInternal) {
            //         result.push({ x: r.x, y: j })
            //         result.push({ x: r.x + r.width, y: j })
            //     }

            //     return result
            // } else {
                return [
                    { x: r.x,               y: r. y},
                    { x: r.x,               y: r.y + r.height},
                    { x: r.x + r.width,     y: r. y},
                    { x: r.x + r.width,     y: r.y + r.height},
                    { x: r.x + r.width / 2, y: r.y},
                    { x: r.x,               y: r.y + r.height / 2},
                    { x: r.x + r.width / 2, y: r.y + r.height },
                    { x: r.x + r.width,     y: r.y + r.height / 2}
                ]
            //}
        }

        function _bestCoordinates (r1, r2) {
            let rp1 = _rectanglePoints(r1)
            let rp2 = _rectanglePoints(r2)

            // improve visuals when 1 rectangle contains the other one (vertically or horizontally)
            // r1 contains r2 horizontally or vice-versa
            if (  (r1.x <= r2.x && r1.x + r1.width >= r2.x + r2.width) || (r2.x <= r1.x && r2.x + r2.width >= r1.x + r1.width)) {
                if (r1.x <= r2.x && r1.x + r1.width >= r2.x + r2.width) { // r1 contains r2 horizontally
                    if (r2.y > r1.y) { // if r1 is above r2
                        rp1.push({x : r2.x + r2.width / 2, y: r1.y + r1.height})
                    } else { // r2 is below r1
                        rp1.push({x : r2.x + r2.width / 2, y: r1.y})
                    }
                } else { // r2 contains r1 horizontally
                    if (r2.y > r1.y) { // if r1 is above r2
                        rp2.push({x: rp1.x + rp1.width / 2, y: r2.y})
                    } else { // r1 is below r2
                        rp2.push({x: rp1.x + rp1.width / 2, y: r2.y + r2.height})
                    }
                }
            } else if ( (r1.y <= r2.y && r1.y + r1.height >= r2.y + r2.height) || (r2.y <= r1.y && r2.y + r2.height > r1.y + r1.height)) { // vertical checks
                if (r2.y <= r1.y && r2.y + r2.height > r1.y + r1.height) { // r2 contains r1 vertically
                    if (r1.x > r2.x) { // r2 is left of r1
                        rp2.push({x: r2.x + r2.width, y: r1.y + r1.height})
                    } else { // r2 is right of r1
                        rp2.push({x: r2.x, y: r1.y + r1.height / 2})
                    }
                } else { // r1 contains r2 vertically
                    if (r1.x < r2.x) { // r1 is left of r2
                        rp1.push({x: r1.x + r1.width, y: r2.y + r2.height / 2})
                    } else { // r1 is right of r2
                        rp1.push({x: r1.x, y: r2.y + r2.height / 2})
                    }
                }
            }

            let minDistance = Number.MAX_SAFE_INTEGER
            let result = { x1: 0, y1: 0, x2: 0, y2: 0 }

            for (let i = 0; i < rp1.length; i++) {
                for (let j = 0; j < rp2.length; j++) {
                    let d = _distanceBetweenPoints(rp1[i].x, rp1[i].y, rp2[j].x, rp2[j].y)

                    if (d <= minDistance) {
                        minDistance = d
                        result = { x1: rp1[i].x, y1: rp1[i].y, x2: rp2[j].x, y2: rp2[j].y }
                    }
                }
            }

            return result
        }

        function _itinerary (sourceBounds, targetBounds, layoutGapTolerance) {
            let coords  = _bestCoordinates(sourceBounds, targetBounds)

            if (Math.abs(sourceBounds.x - targetBounds.x) <= layoutGapTolerance) {
                coords.x1 = coords.x2 = (sourceBounds.x + Math.min(sourceBounds.width, targetBounds.width) / 2)
            }

            if (Math.abs(sourceBounds.y - targetBounds.y) <= layoutGapTolerance) {
                coords.y1 = coords.y2 = (sourceBounds.y + Math.min(sourceBounds.height, targetBounds.height) / 2)
            }

            return {
                start: {
                    x: coords.x1, y: coords.y1
                },
                end: {
                    x: coords.x2, y: coords.y2
                }
            }
        }

        if (! currentView)
            throw new Error("> No view selected: exiting.")

        let cfg = {
            layoutGapTolerance : 5,
            svgWidth : 100,
            svgHeight : 100,
            padding : 5,
            imageMargin : 50,
            cellSize : 2,
            lineHeight: strings.pixelHeight(),
            elementBoundsById : new Map(),
            obstaclesSet : new Set()
        }

        let imageSize = _calcImageSize(currentView)
        cfg.svgWidth = Math.max(cfg.svgWidth, imageSize.width) + cfg.imageMargin
        cfg.svgHeight = Math.max(cfg.svgHeight, imageSize.height) + cfg.imageMargin

        let svgText = `<svg width='${cfg.svgWidth}' height='${cfg.svgHeight}' style="background-color:white" xmlns='http://www.w3.org/2000/svg'>\n`

        let buffer = _drawVertices(currentView, cfg)
        let relBuffer = _drawEdges(currentView, cfg)

        svgText = svgText + buffer.join("\n")
        svgText = svgText + relBuffer.join("\n")
        svgText = svgText + "\n</svg>"

        let svgToPngJarPath = __SCRIPTS_DIR__ + "lib/svgtopng.jar"
        console.log(`Exporting view(id:${currentView.id}, name:${currentView.name}) to png image`)

        return reflections.invokeMethodFromJar(svgToPngJarPath, "SvgToPng", "toPngBase64FromString", [svgText])
    }

}
