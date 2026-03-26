import { useEffect, useRef } from 'react'
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'

function App() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const map = new Map({ basemap: 'dark-gray-vector' })
    const view = new MapView({
      container: mapRef.current!,
      map,
      center: [0, 0],
      zoom: 2,
    })
    return () => {
      view.destroy()
    }
  }, [])

  return <div ref={mapRef} style={{ width: '100vw', height: '100vh' }} />
}

export default App
