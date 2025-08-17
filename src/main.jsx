import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
}

function SolarVisionApp() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [solarData, setSolarData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 40.7128, lng: -74.0060 }); 
  const [tokenStatus, setTokenStatus] = useState('checking');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [solarSettings, setSolarSettings] = useState({
    panelEfficiency: 20,
    systemLosses: 14,
    electricityRate: 0.12
  });
  
  // Add mobile detection
  const isMobile = useIsMobile();

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZ2lzLWRldmVsb3BlciIsImEiOiJjbWRwYjM4eTgwYWcxMm1xdXdkMng0MXB3In0.xAeE2WPjWTKvH--oBmeLug';

  useEffect(() => {
    if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
      setTokenStatus(MAPBOX_TOKEN ? 'invalid' : 'missing');
      return;
    }
    setTokenStatus('valid');
  }, [MAPBOX_TOKEN]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log('Using default location')
      );
    }
  }, []);

  useEffect(() => {
    if (tokenStatus !== 'valid') return;

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.onload = () => {
      window.mapboxgl.accessToken = MAPBOX_TOKEN;
      setMapLoaded(true);
    };
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      // Clean up if component unmounts
      if (script.parentNode) script.parentNode.removeChild(script);
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, [tokenStatus, MAPBOX_TOKEN]);

  const analyzeSolar = async (lat, lng) => {
    setIsAnalyzing(true);
    setSelectedLocation({ lat, lng });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const roofArea = Math.round(120 + Math.random() * 80);
    const usableArea = Math.round(roofArea * 0.8);
    const systemSize = Math.round(usableArea * solarSettings.panelEfficiency / 100);
    const annualProduction = Math.round(systemSize * 1300 * (1 - solarSettings.systemLosses / 100));
    const monthlySavings = Math.round(annualProduction * solarSettings.electricityRate / 12);
    
    const mockData = {
      roofArea,
      usableArea,
      annualSolarIrradiance: 1500 + Math.round(Math.random() * 300),
      systemSize,
      annualProduction,
      co2Savings: Math.round(annualProduction * 0.4),
      monthlySavings,
      paybackPeriod: Math.round((systemSize * 2500) / (monthlySavings * 12) * 10) / 10
    };
    
    setSolarData(mockData);
    setIsAnalyzing(false);
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Check if input is coordinates format (latitude, longitude)
      const coordsRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
      const coordsMatch = searchQuery.match(coordsRegex);
      
      if (coordsMatch) {
        // Direct coordinate input
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[3]);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setUserLocation({ lat, lng });
          setSearchQuery('');
          setIsSearching(false);
          return;
        }
      }
      
      // If not coordinates, use Mapbox geocoding
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setUserLocation({ lat, lng });
        setSearchQuery('');
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const generatePDFReport = () => {
    if (!solarData || !selectedLocation) return;

    const reportContent = `SOLAR ANALYSIS REPORT
Generated by SolarVision AI

LOCATION DETAILS
Coordinates: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}
Analysis Date: ${new Date().toLocaleDateString()}

ROOF ANALYSIS
Total Roof Area: ${solarData.roofArea} m²
Usable Area: ${solarData.usableArea} m²
Roof Utilization: ${Math.round((solarData.usableArea / solarData.roofArea) * 100)}%

SYSTEM SPECIFICATIONS
Recommended System Size: ${solarData.systemSize} kW
Panel Efficiency: ${solarSettings.panelEfficiency}%
System Losses: ${solarSettings.systemLosses}%
Solar Irradiance: ${solarData.annualSolarIrradiance} kWh/m²/year

ENERGY PRODUCTION
Annual Production: ${solarData.annualProduction.toLocaleString()} kWh
Monthly Average: ${Math.round(solarData.annualProduction / 12).toLocaleString()} kWh
Daily Average: ${Math.round(solarData.annualProduction / 365)} kWh

FINANCIAL ANALYSIS
Monthly Savings: $${solarData.monthlySavings}
Annual Savings: $${solarData.monthlySavings * 12}
Payback Period: ${solarData.paybackPeriod} years
Electricity Rate: $${solarSettings.electricityRate}/kWh

ENVIRONMENTAL IMPACT
Annual CO₂ Savings: ${solarData.co2Savings} kg
Equivalent Trees Planted: ${Math.round(solarData.co2Savings / 22)} trees
Carbon Footprint Reduction: ${Math.round(solarData.co2Savings / 1000 * 100) / 100} tons

RECOMMENDATIONS
• Install ${solarData.systemSize} kW solar system
• Expected ROI: ${Math.round(10000 / solarData.paybackPeriod)}% annually
• Optimal panel orientation: South-facing
• Consider battery storage for maximum efficiency

Report generated by SolarVision AI
Professional Solar Analysis Platform`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Solar_Report_${selectedLocation.lat.toFixed(4)}_${selectedLocation.lng.toFixed(4)}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    alert('📄 Solar report downloaded successfully!');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (tokenStatus === 'missing' || tokenStatus === 'invalid') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '1.5rem',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '2rem',
          boxShadow: '0 25px 50px -12px rgba(109, 40, 217, 0.3)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔑</div>
          <h2 style={{ color: '#6D28D9', marginBottom: '1rem', fontSize: '1.8rem', fontWeight: 'bold' }}>
            Mapbox Token {tokenStatus === 'missing' ? 'Missing' : 'Invalid'}
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Your Mapbox access token is required to load satellite imagery and maps.
          </p>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
              <strong>Current token:</strong><br />
              <code style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {MAPBOX_TOKEN || 'Not found in .env file'}
              </code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: darkMode 
        ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)'
        : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
    }}>
      
      {/* Header */}
      <header style={{
        background: darkMode 
          ? 'rgba(30, 27, 75, 0.95)' 
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        padding: '1rem 2rem',
        borderBottom: darkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(109, 40, 217, 0.4)'
          }}>☀️</div>
          <div>
            <h1 style={{ 
              margin: 0, 
              color: darkMode ? '#f8fafc' : '#1e293b', 
              fontSize: '1.75rem', 
              fontWeight: '800'
            }}>
              SolarVision AI
            </h1>
            <p style={{ 
              margin: 0, 
              color: darkMode ? '#94a3b8' : '#64748b', 
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Professional Solar Analysis Platform
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ 
            fontSize: '0.8rem', 
            color: darkMode ? '#94a3b8' : '#64748b',
            textAlign: 'right'
          }}>
            <div>📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</div>
            <div>🔑 Token: {tokenStatus === 'valid' ? '✅ Active' : '❌ Invalid'}</div>
          </div>
          
          <button
            onClick={toggleDarkMode}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              background: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem'
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        display: 'flex', 
        position: 'relative',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        
        {/* LEFT SIDEBAR - MEDIUM SIZE or FULL WIDTH ON MOBILE */}
        <div style={{
          width: isMobile ? '100%' : '320px',
          height: isMobile ? 'auto' : '100%',
          background: darkMode 
            ? 'rgba(30, 27, 75, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: !isMobile && (darkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)'),
          borderBottom: isMobile && (darkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)'),
          padding: isMobile ? '1rem' : '1.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '1.25rem' : '1.75rem',
          boxShadow: darkMode ? 'none' : (isMobile ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '4px 0 6px -1px rgba(0, 0, 0, 0.1)'),
          zIndex: 10
        }}>
          
          {/* Location Search */}
          <div>
            <h3 style={{ 
              margin: '0 0 1rem', 
              color: darkMode ? '#f8fafc' : '#1e293b', 
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: '700'
            }}>
              🔍 Search Location
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Address, city, or coordinates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isSearching && searchLocation()}
                disabled={isSearching}
                style={{
                  flex: 1,
                  padding: isMobile ? '0.75rem' : '1rem',
                  border: darkMode ? '2px solid #4c1d95' : '2px solid #8b5cf6',
                  borderRadius: '0.75rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: darkMode ? '#1E1B4B' : '#ffffff',
                  color: darkMode ? '#f9fafb' : '#1f2937'
                }}
              />
              <button
                onClick={searchLocation}
                disabled={isSearching || !searchQuery.trim()}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.85rem 1.25rem',
                  background: isSearching 
                    ? (darkMode ? '#374151' : '#9ca3af')
                    : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  minWidth: isMobile ? '60px' : '70px',
                  boxShadow: '0 4px 6px -1px rgba(109, 40, 217, 0.3)'
                }}
              >
                {isSearching ? '⏳' : 'Go'}
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
              Examples: "New York" or "28.2995, 70.1142"
            </div>
          </div>

          {/* Show Quick Locations only on larger screens or if not analyzing on mobile */}
          {(!isMobile || !isAnalyzing) && (
            <>
              {/* Quick Locations */}
              <div>
                <h3 style={{ 
                  margin: '0 0 1rem', 
                  color: darkMode ? '#f8fafc' : '#1e293b', 
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: '600'
                }}>
                  📍 Quick Locations
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : '1fr',
                  gap: '0.75rem' 
                }}>
                  {[
                    { name: '🗽 New York', lat: 40.7128, lng: -74.0060 },
                    { name: '🌴 Los Angeles', lat: 34.0522, lng: -118.2437 },
                    { name: '🏰 London', lat: 51.5074, lng: -0.1278 },
                    { name: '🗼 Tokyo', lat: 35.6762, lng: 139.6503 },
                    { name: isMobile ? '🦘 Sydney' : '🦘 Sydney, AU', lat: -33.8688, lng: 151.2093 },
                    { name: '🕌 Dubai', lat: 25.2048, lng: 55.2708 }
                  ].map((location) => (
                    <button
                      key={location.name}
                      onClick={() => setUserLocation({ lat: location.lat, lng: location.lng })}
                      style={{
                        padding: '0.75rem 1rem',
                        background: darkMode 
                          ? 'rgba(139, 92, 246, 0.1)' 
                          : 'rgba(139, 92, 246, 0.1)',
                        border: darkMode ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: darkMode ? '#c4b5fd' : '#6d28d9',
                        textAlign: 'left',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) {
                          e.target.style.background = darkMode 
                            ? 'rgba(139, 92, 246, 0.2)' 
                            : 'rgba(139, 92, 246, 0.2)';
                          e.target.style.transform = 'translateX(5px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) {
                          e.target.style.background = darkMode 
                            ? 'rgba(139, 92, 246, 0.1)' 
                            : 'rgba(139, 92, 246, 0.1)';
                          e.target.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solar Settings */}
              <div>
                <h3 style={{ 
                  margin: '0 0 1.25rem', 
                  color: darkMode ? '#f8fafc' : '#1e293b', 
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: '600'
                }}>
                  ⚙️ Solar Configuration
                </h3>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      color: darkMode ? '#d1d5db' : '#4b5563', 
                      marginBottom: '0.75rem',
                      fontWeight: '500'
                    }}>
                      Panel Efficiency: {solarSettings.panelEfficiency}%
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="25"
                      value={solarSettings.panelEfficiency}
                      onChange={(e) => setSolarSettings({...solarSettings, panelEfficiency: parseInt(e.target.value)})}
                      style={{ 
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: `linear-gradient(90deg, #8B5CF6 0%, #8B5CF6 ${((solarSettings.panelEfficiency - 15) / 10) * 100}%, #DDD6FE ${((solarSettings.panelEfficiency - 15) / 10) * 100}%, #DDD6FE 100%)`,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      color: darkMode ? '#d1d5db' : '#4b5563', 
                      marginBottom: '0.75rem',
                      fontWeight: '500'
                    }}>
                      System Losses: {solarSettings.systemLosses}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      value={solarSettings.systemLosses}
                      onChange={(e) => setSolarSettings({...solarSettings, systemLosses: parseInt(e.target.value)})}
                      style={{ 
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: `linear-gradient(90deg, #8B5CF6 0%, #8B5CF6 ${((20 - solarSettings.systemLosses) / 10) * 100}%, #DDD6FE ${((20 - solarSettings.systemLosses) / 10) * 100}%, #DDD6FE 100%)`,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      color: darkMode ? '#d1d5db' : '#4b5563', 
                      marginBottom: '0.75rem',
                      fontWeight: '500'
                    }}>
                      Electricity Rate: ${solarSettings.electricityRate.toFixed(2)}/kWh
                    </label>
                    <input
                      type="range"
                      min="0.08"
                      max="0.30"
                      step="0.01"
                      value={solarSettings.electricityRate}
                      onChange={(e) => setSolarSettings({...solarSettings, electricityRate: parseFloat(e.target.value)})}
                      style={{ 
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: `linear-gradient(90deg, #8B5CF6 0%, #8B5CF6 ${((solarSettings.electricityRate - 0.08) / 0.22) * 100}%, #DDD6FE ${((solarSettings.electricityRate - 0.08) / 0.22) * 100}%, #DDD6FE 100%)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Instructions - Only show on desktop or if not analyzing */}
              <div style={{
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                border: darkMode ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '1rem',
                padding: '1.25rem'
              }}>
                <h4 style={{ 
                  margin: '0 0 0.75rem', 
                  color: darkMode ? '#c4b5fd' : '#6d28d9', 
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  🎯 How to Use
                </h4>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '1.25rem', 
                  fontSize: '0.875rem', 
                  color: darkMode ? '#d1d5db' : '#374151',
                  lineHeight: '1.6'
                }}>
                  <li>Search for any location using the search bar</li>
                  <li>Click on buildings in the satellite map</li>
                  <li>Adjust solar panel settings for accuracy</li>
                  <li>View detailed analysis in the results panel</li>
                  <li>Download professional PDF reports</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* MAP AREA */}
        <div style={{ 
          flex: 1, 
          position: 'relative',
          height: isMobile ? 'calc(100vh - 74px - 190px)' : 'auto',
          minHeight: isMobile ? '400px' : 'auto'
        }}>
          {mapLoaded ? (
            <MapComponent 
              userLocation={userLocation}
              onLocationSelect={analyzeSolar}
              selectedLocation={selectedLocation}
              mapboxToken={MAPBOX_TOKEN}
              darkMode={darkMode}
              isMobile={isMobile}
            />
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: darkMode 
                ? 'rgba(30, 27, 75, 0.5)' 
                : 'rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ textAlign: 'center', color: darkMode ? '#f8fafc' : 'white' }}>
                <div style={{
                  width: isMobile ? '50px' : '60px',
                  height: isMobile ? '50px' : '60px',
                  border: darkMode ? '4px solid rgba(248, 250, 252, 0.3)' : '4px solid rgba(255, 255, 255, 0.3)',
                  borderTop: darkMode ? '4px solid #f8fafc' : '4px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1.5rem'
                }}></div>
                <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Loading Satellite Imagery
                </h3>
                <p style={{ opacity: 0.8, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                  Initializing high-resolution maps...
                </p>
              </div>
            </div>
          )}

          {/* Analysis Overlay */}
          {isAnalyzing && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(49, 46, 129, 0.95) 100%)' 
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
                backdropFilter: 'blur(12px)',
                padding: isMobile ? '2rem' : '3rem',
                borderRadius: '1.5rem',
                textAlign: 'center',
                maxWidth: isMobile ? '300px' : '400px',
                boxShadow: '0 25px 50px -12px rgba(109, 40, 217, 0.3)'
              }}>
                <div style={{
                  width: isMobile ? '40px' : '50px',
                  height: isMobile ? '40px' : '50px',
                  border: darkMode ? '4px solid rgba(139, 92, 246, 0.3)' : '4px solid rgba(139, 92, 246, 0.3)',
                  borderTop: '4px solid #8B5CF6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1.5rem'
                }}></div>
                <h3 style={{ 
                  margin: '0 0 1rem', 
                  color: darkMode ? '#f9fafb' : '#1f2937',
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700'
                }}>
                  Analyzing Solar Potential
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: darkMode ? '#d1d5db' : '#6b7280', 
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  lineHeight: '1.6'
                }}>
                  Processing satellite imagery and calculating optimal solar configuration...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RESULTS SIDEBAR - MEDIUM SIZE on desktop, full width on mobile */}
        {solarData && (
          <div style={{
            width: isMobile ? '100%' : '350px',
            height: isMobile ? 'auto' : '100%',
            background: darkMode 
              ? 'rgba(30, 27, 75, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: !isMobile && (darkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)'),
            borderTop: isMobile && (darkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)'),
            overflowY: 'auto',
            boxShadow: darkMode ? 'none' : (isMobile ? '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' : '-4px 0 6px -1px rgba(0, 0, 0, 0.1)'),
            animation: isMobile ? 'slideInUp 0.3s ease-out' : 'slideInRight 0.3s ease-out',
            maxHeight: isMobile ? '60vh' : 'none',
            zIndex: 20
          }}>
            <SolarResults 
              data={solarData} 
              location={selectedLocation} 
              darkMode={darkMode}
              isMobile={isMobile}
              onClose={() => {
                setSolarData(null);
                setSelectedLocation(null);
              }}
              onDownloadReport={generatePDFReport}
            />
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
        }
      `}} />
    </div>
  );
}

// Map Component
function MapComponent({ userLocation, onLocationSelect, selectedLocation, mapboxToken, darkMode, isMobile }) {
  const mapContainer = React.useRef(null);
  const map = React.useRef(null);

  React.useEffect(() => {
    if (map.current || !mapContainer.current || !window.mapboxgl) return;

    try {
      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/satellite-v9',
        center: [userLocation.lng, userLocation.lat],
        zoom: 16,
        pitch: 45,
        accessToken: mapboxToken
      });

      map.current.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

      // Enhanced marker with animation
      const userMarkerEl = document.createElement('div');
      userMarkerEl.style.cssText = `
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 8px rgba(109, 40, 217, 0.4);
        animation: pulse 2s infinite;
      `;
      
      new window.mapboxgl.Marker({
        element: userMarkerEl
      })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);

      // Enhanced map click handler
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        
        // Add visual feedback
        const ripple = document.createElement('div');
        ripple.className = 'map-click-ripple';
        ripple.style.cssText = `
          position: absolute;
          width: 30px;
          height: 30px;
          border: 3px solid #8B5CF6;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.2);
          transform: translate(-50%, -50%);
          animation: ripple 1.5s ease-out;
          pointer-events: none;
          z-index: 1000;
        `;
        
        const point = map.current.project([lng, lat]);
        ripple.style.left = point.x + 'px';
        ripple.style.top = point.y + 'px';
        mapContainer.current.appendChild(ripple);
        
        setTimeout(() => {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        }, 1500);
        
        onLocationSelect(lat, lng);
      });

      map.current.on('mouseenter', () => {
        map.current.getCanvas().style.cursor = 'crosshair';
      });

      map.current.on('mouseleave', () => {
        map.current.getCanvas().style.cursor = '';
      });

      console.log('✅ Enhanced map initialized successfully');

    } catch (error) {
      console.error('❌ Map initialization failed:', error);
    }

  }, [userLocation, onLocationSelect, mapboxToken, darkMode]);

  React.useEffect(() => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 16,
        duration: 2000
      });
    }
  }, [userLocation]);

  React.useEffect(() => {
    if (selectedLocation && map.current) {
      // Enhanced selected location marker
      const analysisMarkerEl = document.createElement('div');
      analysisMarkerEl.style.cssText = `
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 6px 12px rgba(109, 40, 217, 0.5);
        animation: pulse 2s infinite;
      `;
      
      new window.mapboxgl.Marker({
        element: analysisMarkerEl
      })
      .setLngLat([selectedLocation.lng, selectedLocation.lat])
      .addTo(map.current);
    }
  }, [selectedLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      {/* Map Instructions Overlay - Smaller on mobile */}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? '10px' : '20px',
        left: isMobile ? '10px' : '20px',
        background: darkMode 
          ? 'rgba(30, 27, 75, 0.85)' 
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: isMobile ? '0.75rem' : '1rem',
        borderRadius: '1rem',
        maxWidth: isMobile ? '200px' : '280px',
        fontSize: isMobile ? '0.75rem' : '0.875rem',
        boxShadow: darkMode 
          ? '0 4px 6px rgba(0, 0, 0, 0.2)' 
          : '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: darkMode 
          ? '1px solid rgba(139, 92, 246, 0.2)' 
          : '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <h4 style={{ 
          margin: '0 0 0.5rem', 
          color: darkMode ? '#c4b5fd' : '#6d28d9',
          fontSize: isMobile ? '0.85rem' : '1rem',
          fontWeight: '600'
        }}>
          🎯 Map Instructions
        </h4>
        <p style={{ 
          margin: 0, 
          color: darkMode ? '#d1d5db' : '#4b5563',
          lineHeight: '1.5',
          fontSize: isMobile ? '0.75rem' : '0.8rem'
        }}>
          Click any building to analyze solar potential.
        </p>
      </div>
    </div>
  );
}

// SolarResults Component
function SolarResults({ data, location, darkMode, isMobile, onClose, onDownloadReport }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Close Button */}
      <div style={{
        padding: isMobile ? '1rem 1rem 0.75rem 1rem' : '1.5rem 1.5rem 1rem 1.5rem',
        borderBottom: darkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(229, 231, 235, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: darkMode 
          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
      }}>
        <div>
          <h2 style={{ 
            margin: '0 0 0.5rem', 
            color: darkMode ? '#f8fafc' : '#1e293b', 
            fontSize: isMobile ? '1.1rem' : '1.3rem',
            fontWeight: '700'
          }}>
            ⚡ Solar Analysis Results
          </h2>
          <div style={{ 
            fontSize: isMobile ? '0.7rem' : '0.8rem', 
            color: darkMode ? '#c4b5fd' : '#7c3aed',
            fontWeight: '500'
          }}>
            📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </div>
        </div>
        
        <button
          onClick={onClose}
          style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: isMobile ? '0.85rem' : '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.target.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.target.style.transform = 'scale(1)';
            }
          }}
          title="Close Results Panel"
        >
          ✕
        </button>
      </div>

      {/* Results Content - More compact on mobile */}
      <div style={{ 
        flex: 1, 
        padding: isMobile ? '1rem' : '1.5rem', 
        overflowY: 'auto'
      }}>
        <div style={{ 
          display: 'grid', 
          gap: isMobile ? '1rem' : '1.25rem',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : '1fr', // 2 columns on mobile
        }}>
          <ResultCard 
            icon="🏠" 
            title="Roof Analysis" 
            value={`${data.roofArea} m²`}
            subtitle={`${data.usableArea} m² usable (${Math.round((data.usableArea / data.roofArea) * 100)}% efficiency)`}
            darkMode={darkMode}
            isMobile={isMobile}
          />
          
          <ResultCard 
            icon="⚡" 
            title="System Capacity" 
            value={`${data.systemSize} kW`}
            subtitle={`${data.annualSolarIrradiance} kWh/m²/year solar irradiance`}
            darkMode={darkMode}
            isMobile={isMobile}
          />
          
          <ResultCard 
            icon="🔋" 
            title="Annual Production" 
            value={`${data.annualProduction.toLocaleString()} kWh`}
            subtitle={`${Math.round(data.annualProduction / 12).toLocaleString()} kWh/month average`}
            darkMode={darkMode}
            isMobile={isMobile}
          />
          
          <ResultCard 
            icon="💰" 
            title="Financial Benefits" 
            value={`${data.monthlySavings}/month`}
            subtitle={`${(data.monthlySavings * 12).toLocaleString()}/year • ${data.paybackPeriod} year ROI`}
            darkMode={darkMode}
            isMobile={isMobile}
          />
          
          <ResultCard 
            icon="🌍" 
            title="Environmental Impact" 
            value={`${(data.co2Savings / 1000).toFixed(1)} tons CO₂/year`}
            subtitle={`Equivalent to planting ${Math.round(data.co2Savings / 22)} trees annually`}
            darkMode={darkMode}
            isMobile={isMobile}
          />

          {/* Performance Metrics - Full width on mobile */}
          <div style={{
            gridColumn: isMobile ? '1 / span 2' : 'auto', // Make it full width on mobile
            background: darkMode 
              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
            border: darkMode ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '1rem',
            padding: isMobile ? '1rem' : '1.25rem'
          }}>
            <h4 style={{
              margin: '0 0 0.75rem',
              color: darkMode ? '#c4b5fd' : '#7c3aed',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: '600'
            }}>
              📊 Performance Metrics
            </h4>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: darkMode ? '#d1d5db' : '#374151' }}>Daily Average Output:</span>
                <strong style={{ color: darkMode ? '#f8fafc' : '#1f2937' }}>
                  {Math.round(data.annualProduction / 365)} kWh
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: darkMode ? '#d1d5db' : '#374151' }}>Peak Sun Hours:</span>
                <strong style={{ color: darkMode ? '#f8fafc' : '#1f2937' }}>
                  {(data.annualSolarIrradiance / 365).toFixed(1)} hours/day
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: darkMode ? '#d1d5db' : '#374151' }}>System Efficiency:</span>
                <strong style={{ color: darkMode ? '#f8fafc' : '#1f2937' }}>
                  {Math.round((data.usableArea / data.roofArea) * 100)}%
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: darkMode ? '#d1d5db' : '#374151' }}>25-Year Savings:</span>
                <strong style={{ color: darkMode ? '#a5b4fc' : '#4f46e5' }}>
                  ${(data.monthlySavings * 12 * 25).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Download Button - Full width */}
        <button 
          onClick={onDownloadReport}
          style={{
            width: '100%',
            padding: isMobile ? '0.85rem' : '1rem',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: isMobile ? '1rem' : '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 6px rgba(109, 40, 217, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) { // Only apply hover effects on desktop
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 10px rgba(109, 40, 217, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) { // Only apply hover effects on desktop
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 6px rgba(109, 40, 217, 0.3)';
            }
          }}
        >
          📄 Download Report
        </button>
      </div>
    </div>
  );
}

// ResultCard Component
function ResultCard({ icon, title, value, subtitle, darkMode, isMobile }) {
  return (
    <div style={{
      background: darkMode 
        ? 'rgba(30, 27, 75, 0.6)' 
        : 'rgba(255, 255, 255, 0.8)',
      padding: isMobile ? '0.85rem' : '1.25rem',
      borderRadius: '0.75rem',
      border: darkMode ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
      boxShadow: darkMode 
        ? 'none' 
        : '0 2px 4px rgba(109, 40, 217, 0.1)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.2s ease',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}
    onMouseEnter={(e) => {
      if (!isMobile) { // Only apply hover effects on desktop
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = darkMode 
          ? '0 4px 6px rgba(0, 0, 0, 0.2)' 
          : '0 4px 8px rgba(109, 40, 217, 0.2)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isMobile) { // Only apply hover effects on desktop
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = darkMode 
          ? 'none' 
          : '0 2px 4px rgba(109, 40, 217, 0.1)';
      }
    }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        marginBottom: isMobile ? '0.5rem' : '0.75rem' 
      }}>
        <div style={{
          width: isMobile ? '24px' : '32px',
          height: isMobile ? '24px' : '32px',
          borderRadius: '0.5rem',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? '1rem' : '1.25rem'
        }}>
          {icon}
        </div>
        <strong style={{ 
          color: darkMode ? '#f8fafc' : '#1e293b', 
          fontSize: isMobile ? '0.85rem' : '0.95rem',
          fontWeight: '600'
        }}>
          {title}
        </strong>
      </div>
      <div style={{ 
        fontSize: isMobile ? '1.1rem' : '1.5rem', 
        fontWeight: '700', 
        color: darkMode ? '#c4b5fd' : '#6d28d9', 
        marginBottom: isMobile ? '0.35rem' : '0.5rem'
      }}>
        {value}
      </div>
      <div style={{ 
        fontSize: isMobile ? '0.75rem' : '0.875rem', 
        color: darkMode ? '#a5b4fc' : '#7c3aed',
        fontWeight: '500',
        marginTop: 'auto' // Push to bottom
      }}>
        {subtitle}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SolarVisionApp />
  </React.StrictMode>
);