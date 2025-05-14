declare module 'react-simple-maps' {
  export interface GeographyProps {
    geography: {
      properties: {
        name?: string
        postal?: string
        state?: string
        district?: string
        DISTRICT?: string
      }
      id?: string | number
    }
    fill: string
    stroke: string
    strokeWidth: number
    style: {
      default: {
        outline: string
      }
      hover: {
        outline: string
        fill: string
      }
      pressed: {
        outline: string
        fill: string
      }
    }
    onClick?: () => void
    className?: string
  }

  export interface GeographyFeature {
    rsmKey: string
    properties: {
      name?: string
      postal?: string
      state?: string
      district?: string
      DISTRICT?: string
    }
    id?: string | number
  }

  export interface ZoomableGroupProps {
    zoom?: number
    center?: [number, number]
    minZoom?: number
    maxZoom?: number
    onMoveEnd?: (props: { zoom: number; coordinates: [number, number] }) => void
    children?: React.ReactNode
  }

  export const ComposableMap: React.FC<{
    projection?: string
    projectionConfig?: {
      scale?: number
      center?: [number, number]
    }
    className?: string
    children?: React.ReactNode
  }>

  export const Geographies: React.FC<{
    geography: string | object
    children: (props: { geographies: GeographyFeature[] }) => React.ReactNode
  }>

  export const Geography: React.FC<GeographyProps>

  export const ZoomableGroup: React.FC<ZoomableGroupProps>
}

declare module 'd3-scale' {
  export function scaleLinear<T = number>(): {
    domain(domain: number[]): any
    range(range: T[]): any
    clamp(clamp: boolean): any
  }
} 