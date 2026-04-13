import { Star, MapPin, Heart, ArrowRight, Eye, Navigation } from "lucide-react";
import { Restaurant } from "../types";
import { Link } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";
import { motion } from "motion/react";

interface RestaurantCardProps {
  key?: string;
  restaurant: Restaurant;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  distance?: number;
}

export default function RestaurantCard({ restaurant, isFavorite, onToggleFavorite, distance }: RestaurantCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="group relative bg-white rounded-[32px] overflow-hidden border border-orange-100 shadow-xl shadow-orange-100/50 transition-all duration-300 h-full flex flex-col"
    >
      <div className="relative aspect-[4/3] overflow-hidden shrink-0">
        <img 
          src={restaurant.image || `https://picsum.photos/seed/${restaurant.name}/800/600`} 
          alt={restaurant.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <button 
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite?.(restaurant.id);
          }}
          className={cn(
            "absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 z-10",
            isFavorite ? "bg-red-500 text-white" : "bg-white/40 text-white hover:bg-white/60"
          )}
        >
          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </button>

        <div className="absolute top-4 left-4 flex flex-wrap gap-2 pr-16">
          <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-orange-900/20">
            {restaurant.price_range}
          </span>
          {restaurant.rating >= 4.5 && (
            <span className="px-3 py-1 bg-yellow-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-yellow-900/20">
              Top Rated
            </span>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-grow min-w-0">
            <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors truncate">
              {restaurant.name}
            </h3>
            <div className="flex items-center text-gray-400 text-[10px] mt-1.5 font-medium">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate">{restaurant.location.address}</span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100">
              <Star className="w-3.5 h-3.5 text-orange-600 fill-current mr-1" />
              <span className="text-sm font-black text-orange-900">{restaurant.rating}</span>
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
              {restaurant.reviewCount} reviews
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {restaurant.categories.slice(0, 3).map((cat) => (
            <span key={cat} className="text-[9px] font-bold text-orange-600/60 bg-orange-50/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {cat}
            </span>
          ))}
          {restaurant.categories.length > 3 && (
            <span className="text-[9px] font-bold text-gray-400 px-2 py-0.5 uppercase tracking-wider">
              +{restaurant.categories.length - 3}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 font-medium leading-relaxed flex-grow">
          {restaurant.description}
        </p>

        <div className="pt-4 flex items-center justify-between border-t border-orange-50 mt-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              <span>{restaurant.views} views</span>
            </div>
            {distance !== undefined && (
              <div className="flex items-center text-orange-600 text-[10px] font-bold uppercase tracking-widest">
                <Navigation className="w-3.5 h-3.5 mr-1.5" />
                <span>{distance.toFixed(1)} km</span>
              </div>
            )}
          </div>
          <Link 
            to={`/restaurant/${restaurant.id}`}
            className="inline-flex items-center text-orange-600 font-bold text-xs hover:translate-x-1 transition-transform"
          >
            <span>Details</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
