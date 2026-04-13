import { Search, MapPin, Navigation, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    navigate(`/restaurants?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[80vh] flex items-start justify-center bg-orange-50 pt-40 pb-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500 via-transparent to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-center space-x-2 text-orange-600 font-bold uppercase tracking-widest text-xs">
            <MapPin className="w-4 h-4" />
            <span>Roxas, Oriental Mindoro, Philippines</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight tracking-tighter uppercase">
            Eateries <br />
            of <span className="text-orange-600 italic font-serif lowercase">Roxas</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-gray-600 font-medium">
            Your centralized hub for discovering, exploring, and recommending local food establishments in Roxas, Oriental Mindoro — from street-side carinderias to coastal seafood dining.
          </p>

          <div className="max-w-3xl mx-auto mt-12 bg-white p-2 rounded-2xl shadow-2xl shadow-orange-200 border border-orange-100 flex flex-col md:flex-row items-center gap-2">
            <div className="flex-1 flex items-center px-4 w-full">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Search Restaurants, Cuisine, or Dishes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none font-medium"
              />
            </div>
            <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
            <div className="flex-1 flex items-center px-4 w-full relative">
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-4 text-gray-900 bg-transparent focus:outline-none font-medium appearance-none cursor-pointer pr-10"
              >
                <option value="">All Cuisines</option>
                <option value="Filipino">Filipino</option>
                <option value="Seafood">Seafood</option>
                <option value="Grill">Grill</option>
                <option value="Italian">Italian</option>
                <option value="Chinese">Chinese</option>
                <option value="International">International</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <button 
              onClick={handleSearch}
              className="w-full md:w-auto bg-orange-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link 
              to="/restaurants?sort=nearby"
              className="flex items-center space-x-2 px-6 py-2 rounded-full bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
            >
              <Navigation className="w-4 h-4" />
              <span>Find Nearby</span>
            </Link>
            {['Popular', 'Seafood', 'Grilled', 'Filipino', 'Italian', 'Grill'].map((tag) => (
              <button 
                key={tag}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (tag === 'Popular') {
                    params.set("sort", "rating");
                  } else {
                    params.set("category", tag);
                  }
                  navigate(`/restaurants?${params.toString()}`);
                }}
                className="px-4 py-1.5 rounded-full border border-orange-200 text-xs font-semibold text-orange-800 hover:bg-orange-600 hover:text-white transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Floating Elements */}
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 left-10 hidden xl:block"
      >
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-orange-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <span className="text-orange-600 font-bold">148+</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Registered</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Establishments</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-40 right-10 hidden xl:block"
      >
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-orange-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <span className="text-green-600 font-bold">3.2K</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Verified</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Reviews</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
