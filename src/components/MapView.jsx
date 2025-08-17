import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Satellite, Layers } from 'lucide-react'

const MapView = ({ userLocation, onBuildingSelect, selectedBuilding }) => {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapStyle, setMapStyle] = useState('satellite-v9')

  // Your Mapbox token from .env file
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

  useEffect(() => {
    // Check if Mapbox token exists
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not found! Check your .env file')
      return
    }

    // Initialize Mapbox map
    if (window.mapboxgl && mapContainer.current && !mapRef.current) {
      window.mapboxgl.accessToken = MAPBOX_TOKEN

      mapRef.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: `mapbox://styles/mapbox/${mapStyle}`,
        center: [userLocation.lng, userLocation.lat],
        zoom: userLocation.zoom || 15,
        pitch: 45, // 3D tilt for better building view
        bearing: 0
      })

      // Add navigation controls
      mapRef.current.addControl(new window.mapboxgl.NavigationControl(), 'top-right')

      // Add current location marker
      new window.mapboxgl.Marker({
        color: '#3b82f6'
      })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new window.mapboxgl.Popup({ offset: 25 })
        .setHTML('<h3>Your Location</h3><p>Click on any building to analyze solar potential</p>'))
      .addTo(mapRef.current)

      // Handle map clicks for building selection
      mapRef.current.on('click', (e) => {
        const { lng, lat } = e.lngLat
        
        // Simulate building detection (we'll make this real later)
        const mockBuilding = {
          id: `building_${Date.now()}`,
          coordinates: [lng, lat],
          area: Math.floor(Math.random() * 200) + 50, // Random area between 50-250 m²
          address: `Building at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          roofType: 'flat' // or 'pitched'
        }

        // Add building marker
        const buildingMarker = new window.mapboxgl.Marker({
          color: '#10b981'
        })
        .setLngLat([lng, lat])
        .setPopup(new window.mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-green-600">Building Selected</h3>
              <p class="text-sm">Area: ~${mockBuilding.area} m²</p>
              <p class="text-sm text-gray-600">Analyzing solar potential...</p>
            </div>
          `))
        .addTo(mapRef.current)

        // Trigger solar analysis
        onBuildingSelect(mockBuilding)
      })

      mapRef.current.on('load', () => {
        setMapLoaded(true)
        console.log('Map loaded successfully!')
      })

      mapRef.current.on('error', (e) => {
        console.error('Map error:', e)
      })
    }
  }, [MAPBOX_TOKEN, userLocation, mapStyle])

  // Update map center when user location changes
  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: userLocation.zoom || 15,
        duration: 2000
      })
    }
  }, [userLocation])

  // Map style options
  const mapStyles = [
    { id: 'satellite-v9', name: 'Satellite', icon: Satellite },
    { id: 'streets-v12', name: 'Streets', icon: MapPin },
    { id: 'outdoors-v12', name: 'Outdoors', icon: Layers }
  ]

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full mapbox-container"
        style={{ minHeight: '400px' }}
      />

      {/* Map Style Selector */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 space-y-1">
          {mapStyles.map((style) => {
            const Icon = style.icon
            return (
              <button
                key={style.id}
                onClick={() => {
                  setMapStyle(style.id)
                  if (mapRef.current) {
                    mapRef.current.setStyle(`mapbox://styles/mapbox/${style.id}`)
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full ${
                  mapStyle === style.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{style.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Map Loading Indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading satellite imagery...</p>
          </div>
        </div>
      )}

      {/* Instructions Overlay */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 max-w-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          How to Use:
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Click on any building to analyze</li>
          <li>• Use satellite view for best results</li>
          <li>• Zoom in for more accuracy</li>
          <li>• Switch map styles using controls</li>
        </ul>
      </div>

      {/* Mapbox Token Warning */}
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md text-center shadow-xl">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Mapbox Token Required
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please check your .env file and make sure VITE_MAPBOX_TOKEN is set correctly.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Current token: {MAPBOX_TOKEN ? 'Found' : 'Missing'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapView