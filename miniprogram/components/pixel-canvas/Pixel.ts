const PIXEL_MARGIN = 2

type Options = {
  x: number
  y: number
  width: number
  height: number
}

export type Point = {
  x: number
  y: number
}

export default class Pixel {
  x: number
  y: number
  width: number
  height: number
  pixelMinX
  pixelMinY
  pixelMaxX
  pixelMaxY
  constructor(options: Options) {
    this.x = options.x
    this.y = options.y
    this.width = options.width
    this.height = options.height

    this.pixelMinX = this.x
    this.pixelMinY = this.y
    this.pixelMaxX = this.x + this.width
    this.pixelMaxY = this.y + this.height
  }

  setMargin(topLeft: Point, topRight: Point, bottomRight: Point, bottomLeft: Point) {
    topLeft.x += PIXEL_MARGIN
    topLeft.y += PIXEL_MARGIN

    topRight.x -= PIXEL_MARGIN
    topRight.y += PIXEL_MARGIN

    bottomRight.x -= PIXEL_MARGIN
    bottomRight.y -= PIXEL_MARGIN

    bottomLeft.x += PIXEL_MARGIN
    bottomLeft.y -= PIXEL_MARGIN

    return [topLeft, topRight, bottomRight, bottomLeft]
  }

  getPoints(): [Point, Point, Point, Point] {
    const {pixelMinX, pixelMinY, pixelMaxX, pixelMaxY} = this
    const p1 = {x: pixelMinX, y: pixelMinY}
    const p2 = {x: pixelMaxX, y: pixelMinY}
    const p3 = {x: pixelMaxX, y: pixelMaxY}
    const p4 = {x: pixelMinX, y: pixelMaxY}
    return [p1, p2, p3, p4]
  }

  createPath(ctx: CanvasRenderingContext2D) {
    const points = this.setMargin(...this.getPoints())

    points.forEach(({x, y}, index) => {
      ctx[index === 0 ? 'moveTo' : 'lineTo'](x, y)
    })
    ctx.lineTo(points[0].x, points[0].y)
  }

  draw(ctx: CanvasRenderingContext2D, fillStyle = '#f3f3f3') {
    ctx.restore()
    ctx.save()
    ctx.fillStyle = fillStyle
    ctx.beginPath()
    this.createPath(ctx)
    ctx.fill()
    ctx.restore()
  }

  isPointInPixel(point: Point): boolean {
    const {x, y} = point
    const {pixelMinX, pixelMinY, pixelMaxX, pixelMaxY} = this
    return x > pixelMinX && x < pixelMaxX && y > pixelMinY && y < pixelMaxY
  }

  // 计算向量叉乘
  crossMul(v1: Point, v2: Point) {
    return v1.x * v2.y - v1.y * v2.x
  }
  // 判断两条线段是否相交
  checkCross(p1: Point, p2: Point, p3: Point, p4: Point) {
    let v1 = {x: p1.x - p3.x, y: p1.y - p3.y}
    let v2 = {x: p2.x - p3.x, y: p2.y - p3.y}
    let v3 = {x: p4.x - p3.x, y: p4.y - p3.y}
    const v = this.crossMul(v1, v3) * this.crossMul(v2, v3)
    v1 = {x: p3.x - p1.x, y: p3.y - p1.y}
    v2 = {x: p4.x - p1.x, y: p4.y - p1.y}
    v3 = {x: p2.x - p1.x, y: p2.y - p1.y}
    return v <= 0 && this.crossMul(v1, v3) * this.crossMul(v2, v3) <= 0 ? true : false
  }

  isPathInPixel(startPoint: Point, endPoint: Point) {
    if (this.isPointInPixel(startPoint) || this.isPointInPixel(endPoint)) {
      return true
    } else {
      const [p1, p2, p3, p4] = this.getPoints()
      const result =
        this.checkCross(p1, p3, startPoint, endPoint) ||
        this.checkCross(p2, p4, startPoint, endPoint)
      return result
    }
  }
}
