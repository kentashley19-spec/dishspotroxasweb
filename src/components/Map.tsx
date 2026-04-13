import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Restaurant } from '../types';
import L from 'leaflet';
import { Star, MapPin, Navigation, Phone, Mail, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn, calculateDistance } from '../lib/utils';

// Fix for default marker icons in Leaflet with React
const markerIcon2x = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const markerIcon = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const markerShadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapProps {
  restaurants: Restaurant[];
  center?: [number, number];
  zoom?: number;
  selectedRestaurantId?: string;
}

export default function Map({ restaurants, center = [12.5833, 121.5167], zoom = 14, selectedRestaurantId }: MapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(selectedRestaurantId || null);

  useEffect(() => {
    if (selectedRestaurantId && map) {
      const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
      if (restaurant) {
        setSelectedId(selectedRestaurantId);
        map.flyTo([restaurant.location.lat, restaurant.location.lng], 16);
      }
    }
  }, [selectedRestaurantId, map, restaurants]);

  const getDirectionsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        map?.flyTo([latitude, longitude], 16);
        setIsLocating(false);
        toast.success("Location found!");
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to retrieve your location");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      });
    }
  }, []);

  const filteredRestaurants = useMemo(() => {
    let result = restaurants;
    if (showNearbyOnly && userLocation) {
      result = restaurants.filter(r => {
        const dist = calculateDistance(userLocation[0], userLocation[1], r.location.lat, r.location.lng);
        return dist <= 5; // 5km radius
      });
    }
    
    if (userLocation) {
      return [...result].sort((a, b) => {
        const distA = calculateDistance(userLocation[0], userLocation[1], a.location.lat, a.location.lng);
        const distB = calculateDistance(userLocation[0], userLocation[1], b.location.lat, b.location.lng);
        return distA - distB;
      });
    }
    return result;
  }, [restaurants, showNearbyOnly, userLocation]);

  const userIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const handleRestaurantClick = (r: Restaurant) => {
    setSelectedId(r.id);
    map?.flyTo([r.location.lat, r.location.lng], 16);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
      {/* Sidebar */}
      <div className="w-full lg:w-80 flex flex-col bg-white rounded-[40px] border border-orange-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-orange-50 bg-orange-50/30">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
            Nearby <span className="text-orange-600 italic font-serif lowercase">Spots</span>
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {filteredRestaurants.length} restaurants found
          </p>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredRestaurants.map((r) => {
            const distance = userLocation ? calculateDistance(userLocation[0], userLocation[1], r.location.lat, r.location.lng) : null;
            return (
              <button
                key={r.id}
                onClick={() => handleRestaurantClick(r)}
                className={cn(
                  "w-full text-left p-4 rounded-3xl border transition-all duration-300 group",
                  selectedId === r.id 
                    ? "bg-orange-600 border-orange-600 shadow-lg shadow-orange-200" 
                    : "bg-white border-orange-50 hover:border-orange-200 hover:bg-orange-50/50"
                )}
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-orange-100">
                    <img 
                      src={r.image || `https://picsum.photos/seed/${r.name}/200/200`} 
                      alt={r.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className={cn(
                      "text-sm font-bold truncate",
                      selectedId === r.id ? "text-white" : "text-gray-900"
                    )}>
                      {r.name}
                    </h4>
                    <div className="flex items-center mt-1">
                      <Star className={cn("w-3 h-3 fill-current mr-1", selectedId === r.id ? "text-orange-200" : "text-orange-600")} />
                      <span className={cn("text-xs font-black", selectedId === r.id ? "text-white" : "text-orange-900")}>
                        {r.rating}
                      </span>
                    </div>
                    {distance !== null && (
                      <div className={cn(
                        "flex items-center text-[10px] font-bold mt-1 uppercase tracking-widest",
                        selectedId === r.id ? "text-orange-100" : "text-gray-400"
                      )}>
                        <Navigation className="w-2.5 h-2.5 mr-1" />
                        <span>{distance.toFixed(1)} km away</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="flex-grow relative rounded-[40px] overflow-hidden border border-orange-100 shadow-2xl shadow-orange-100/50">
        <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
          <button 
            onClick={handleLocate}
            disabled={isLocating}
            className="bg-white p-4 rounded-2xl shadow-xl border border-orange-100 text-orange-600 hover:bg-orange-50 transition-all active:scale-95 disabled:opacity-50"
            title="Find my location"
          >
            <Navigation className={cn("w-6 h-6", isLocating && "animate-spin")} />
          </button>
          
          {userLocation && (
            <button 
              onClick={() => setShowNearbyOnly(!showNearbyOnly)}
              className={cn(
                "p-4 rounded-2xl shadow-xl border transition-all active:scale-95 flex items-center justify-center",
                showNearbyOnly 
                  ? "bg-orange-600 border-orange-600 text-white" 
                  : "bg-white border-orange-100 text-orange-600 hover:bg-orange-50"
              )}
              title={showNearbyOnly ? "Show all restaurants" : "Show nearby only (5km)"}
            >
              <MapPin className="w-6 h-6" />
            </button>
          )}
        </div>

        <MapContainer 
          center={center} 
          zoom={zoom} 
          scrollWheelZoom={true} 
          className="w-full h-full"
          ref={setMap}
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
          
          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="p-1 font-bold text-blue-600">You are here</div>
              </Popup>
            </Marker>
          )}

          {filteredRestaurants.map((restaurant, index) => (
            <Marker 
              key={restaurant.id || (restaurant as any)._id || index} 
              position={[restaurant.location.lat, restaurant.location.lng]}
              eventHandlers={{
                click: () => setSelectedId(restaurant.id)
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[220px] space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                    <img 
                      src={restaurant.image || `https://picsum.photos/seed/${restaurant.name}/400/300`} 
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 flex items-center bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-orange-100">
                      <Star className="w-3 h-3 text-orange-600 fill-current mr-1" />
                      <span className="text-[10px] font-bold text-orange-900">{restaurant.rating}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">{restaurant.name}</h4>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-start text-gray-600 text-[10px]">
                        <MapPin className="w-2.5 h-2.5 mr-1.5 mt-0.5 shrink-0" />
                        <span>{restaurant.location.address}</span>
                      </div>

                      {restaurant.phone && (
                        <div className="flex items-center text-gray-600 text-[10px]">
                          <Phone className="w-2.5 h-2.5 mr-1.5 shrink-0" />
                          <a href={`tel:${restaurant.phone}`} className="hover:text-orange-600 transition-colors">
                            {restaurant.phone}
                          </a>
                        </div>
                      )}

                      {restaurant.email && (
                        <div className="flex items-center text-gray-600 text-[10px]">
                          <Mail className="w-2.5 h-2.5 mr-1.5 shrink-0" />
                          <a href={`mailto:${restaurant.email}`} className="hover:text-orange-600 transition-colors truncate">
                            {restaurant.email}
                          </a>
                        </div>
                      )}

                      <a 
                        href={getDirectionsUrl(restaurant.location.lat, restaurant.location.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-orange-600 text-[10px] font-bold hover:underline"
                      >
                        <ExternalLink className="w-2.5 h-2.5 mr-1.5 shrink-0" />
                        Get Directions
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-orange-50">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                      {restaurant.price_range}
                    </span>
                    <Link 
                      to={`/restaurant/${restaurant.id}`}
                      className="inline-flex items-center text-orange-600 font-bold text-[10px] hover:translate-x-1 transition-transform"
                    >
                      <span>View Details</span>
                      <Navigation className="w-2.5 h-2.5 ml-1" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
