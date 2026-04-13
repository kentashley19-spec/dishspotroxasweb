import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo, FormEvent } from "react";
import { auth, db } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, setDoc, updateDoc, increment, getDocFromServer } from "firebase/firestore";
import { Restaurant, Dish, UserProfile, UserPreferences, Review } from "./types";
import { getRecommendations } from "./lib/recommendation";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Search, MapPin, Star, Heart, ArrowRight, Eye, LayoutDashboard, LogIn, LogOut, User, Filter, Map as MapIcon, TrendingUp, UtensilsCrossed, ChevronRight, Info, Phone, Clock, Globe, Facebook, Instagram, Twitter, Youtube, Mail, Github, Navigation, ChevronDown, MessageSquare, Calendar, Database, X, Plus, Target, Edit, Trash2 } from "lucide-react";
import socket from "./lib/socket";

// Components
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import RestaurantCard from "./components/RestaurantCard";
import Map from "./components/Map";
import { cn, formatCurrency, calculateDistance, geocodeAddress } from "./lib/utils";
import LocationPicker from "./components/LocationPicker";

function Login() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user profile in Firestore if it doesn't exist
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          name: user.displayName,
          email: user.email,
          favorites: [],
          preferences: {
            budget: "moderate",
            categories: []
          },
          role: "user"
        });
      }
      
      toast.success(`Welcome, ${user.displayName}!`);
      navigate("/");
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/30 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-orange-100/50 border border-orange-100"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Sign <span className="text-orange-600 italic font-serif lowercase">In</span></h1>
          <p className="text-gray-500 font-medium mt-2">Join DishSpot Roxas to discover and save your favorite spots.</p>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center space-x-4 bg-white border-2 border-gray-100 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          <span>Continue with Google</span>
        </button>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 font-medium">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </motion.div>
    </div>
  );
}

function Home({ restaurants, loading, userLocation }: { restaurants: Restaurant[]; loading: boolean; userLocation: [number, number] | null }) {
  const [user] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
      });
    }
  }, [user]);

  const nearbyRestaurants = useMemo(() => {
    if (!userLocation) return [];
    return [...restaurants]
      .map(r => ({
        ...r,
        distance: calculateDistance(userLocation[0], userLocation[1], r.location.lat, r.location.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [restaurants, userLocation]);

  const [trendingDishes, setTrendingDishes] = useState<Dish[]>([]);

  useEffect(() => {
    const fetchTrendingDishes = async () => {
      try {
        const res = await fetch("/api/dishes/trending");
        const data = await res.json();
        if (data.error) {
          console.error("Trending dishes error:", data.error);
        } else {
          setTrendingDishes(data);
        }
      } catch (error) {
        console.error("Failed to fetch trending dishes:", error);
      }
    };

    fetchTrendingDishes();
    socket.on("restaurants:reloaded", fetchTrendingDishes);
    return () => {
      socket.off("restaurants:reloaded", fetchTrendingDishes);
    };
  }, []);

  const trendingRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => b.views - a.views).slice(0, 3);
  }, [restaurants]);

  return (
    <div className="min-h-screen bg-white">
      <Hero />

      {/* Stats Section */}
      <section className="bg-orange-600 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">{restaurants.length}+</p>
              <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Registered Establishments</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">3,240</p>
              <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Verified Reviews</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">12</p>
              <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Cuisine Categories</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">8,500+</p>
              <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Monthly Active Users</p>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Section */}
      {userLocation && nearbyRestaurants.length > 0 && (
        <section className="py-24 bg-orange-50/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-orange-600">
                  <Target className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Near You</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter">Nearby <span className="text-orange-600 italic font-serif lowercase">Eateries</span></h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {nearbyRestaurants.map((restaurant, index) => (
                <RestaurantCard 
                  key={restaurant.id || index} 
                  restaurant={restaurant} 
                  distance={(restaurant as any).distance}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-orange-600">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Hot Now</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter">Trending <span className="text-orange-600 italic font-serif lowercase">Spots</span></h2>
            </div>
            <Link to="/restaurants" className="hidden md:flex items-center space-x-2 text-gray-400 hover:text-orange-600 font-bold transition-colors group">
              <span>View All</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-[400px] bg-orange-50 rounded-[40px] animate-pulse" />)
            ) : (
              trendingRestaurants.map((restaurant, index) => (
                <RestaurantCard 
                  key={restaurant.id || index} 
                  restaurant={restaurant} 
                  distance={userLocation ? calculateDistance(userLocation[0], userLocation[1], restaurant.location.lat, restaurant.location.lng) : undefined}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Map Explorer Preview */}
      <section className="py-24 bg-orange-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex items-center space-x-2 text-orange-600 font-bold uppercase tracking-widest text-xs">
                <MapIcon className="w-4 h-4" />
                <span>Interactive Explorer</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-none uppercase tracking-tighter">
                Explore the <br />
                <span className="text-orange-600 italic font-serif lowercase">Local Map</span>
              </h2>
              <p className="text-lg text-gray-600 font-medium">
                Find eateries near you with our interactive map. Get real-time directions, check distances, and discover hidden gems in every corner of Roxas.
              </p>
              <div className="space-y-4">
                {[
                  { title: "Real-time Proximity", desc: "See exactly how far you are from the best food." },
                  { title: "Category Filtering", desc: "Filter by cuisine directly on the map view." },
                  { title: "Quick Previews", desc: "Tap any marker to see ratings, prices, and photos." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link 
                to="/map"
                className="inline-flex items-center space-x-3 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-gray-200"
              >
                <span>Open Map Explorer</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-orange-100 rounded-[40px] transform rotate-2"></div>
              <div className="relative z-10 bg-white p-4 rounded-[48px] shadow-2xl border border-orange-50">
                <div className="h-[400px] rounded-[36px] overflow-hidden">
                  <Map restaurants={restaurants.slice(0, 5)} zoom={13} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Dishes */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-orange-500 font-bold uppercase tracking-widest text-xs">
                <UtensilsCrossed className="w-4 h-4" />
                <span>What's Hot Right Now</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black leading-none uppercase tracking-tighter">
                Trending <br />
                <span className="text-orange-500 italic font-serif lowercase">Dishes</span>
              </h2>
            </div>
            <Link to="/restaurants" className="text-orange-500 font-bold flex items-center hover:translate-x-2 transition-transform">
              View All Restaurants <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {trendingDishes.map((dish, i) => (
              <motion.div 
                key={dish.id}
                whileHover={{ y: -10 }}
                className="group relative aspect-[3/4] rounded-[40px] overflow-hidden"
              >
                <img 
                  src={dish.image} 
                  alt={dish.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8 space-y-2">
                  <p className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">{dish.restaurant}</p>
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none">{dish.name}</h3>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xl font-bold">{formatCurrency(dish.price)}</span>
                    <Link 
                      to={`/map?restaurantId=${dish.restaurant_id}`}
                      className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-24 pb-12 border-t border-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">D</span>
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  DishSpot<span className="text-orange-600">Roxas</span>
                </span>
              </Link>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                The centralized digital hub for discovering and recommending local food establishments in Roxas, Oriental Mindoro. A thesis research project supporting local food entrepreneurs and the community.
              </p>
              <div className="flex space-x-4">
                {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 hover:bg-orange-600 hover:text-white transition-all">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-xs">Platform</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-500">
                <li><Link to="/restaurants" className="hover:text-orange-600 transition-colors">Browse Restaurants</Link></li>
                <li><Link to="/map" className="hover:text-orange-600 transition-colors">Map Explorer</Link></li>
                <li><Link to="/top-rated" className="hover:text-orange-600 transition-colors">Top Rated</Link></li>
                <li><Link to="/newly-added" className="hover:text-orange-600 transition-colors">Newly Added</Link></li>
                <li><Link to="/promo-deals" className="hover:text-orange-600 transition-colors">Promo Deals</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-xs">For Owners</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-500">
                <li><Link to="/admin" className="hover:text-orange-600 transition-colors">List Your Restaurant</Link></li>
                <li><Link to="/admin" className="hover:text-orange-600 transition-colors">Business Dashboard</Link></li>
                <li><Link to="/admin" className="hover:text-orange-600 transition-colors">Manage Reviews</Link></li>
                <li><Link to="/admin" className="hover:text-orange-600 transition-colors">Update Menu</Link></li>
                <li><Link to="/advertise" className="hover:text-orange-600 transition-colors">Advertise</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-xs">Information</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-500">
                <li><Link to="/about" className="hover:text-orange-600 transition-colors">About This Project</Link></li>
                <li><Link to="/research" className="hover:text-orange-600 transition-colors">Research Paper</Link></li>
                <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-orange-600 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-orange-600 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-orange-50 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              © 2026 DishSpotRoxas. All Rights Reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-xs font-bold text-gray-400 hover:text-orange-600 uppercase tracking-widest transition-colors">Sitemap</a>
              <a href="#" className="text-xs font-bold text-gray-400 hover:text-orange-600 uppercase tracking-widest transition-colors">Cookies</a>
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span>Built with</span>
                <Heart className="w-3 h-3 text-red-500 fill-current" />
                <span>in Mindoro</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username === "dishspotroxas2026" && password === "dishspotroxas2026") {
      sessionStorage.setItem("admin_auth", "true");
      toast.success("Welcome back, Admin!");
      navigate("/admin");
    } else {
      toast.error("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/30 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-orange-100/50 border border-orange-100"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Admin <span className="text-orange-600 italic font-serif lowercase">Login</span></h1>
          <p className="text-gray-500 font-medium mt-2">Enter your credentials to access the dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-6 py-4 bg-orange-50/50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-medium text-gray-900"
              placeholder="dishspotroxas2026"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-orange-50/50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-medium text-gray-900"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function RestaurantModal({ isOpen, onClose, restaurant }: { isOpen: boolean; onClose: () => void; restaurant?: Restaurant | null }) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    lat: 12.5855,
    lng: 121.5167,
    price_range: "moderate",
    categories: "",
    image: "",
    description: "",
    phone: "",
    email: ""
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        address: restaurant.location.address,
        lat: restaurant.location.lat,
        lng: restaurant.location.lng,
        price_range: restaurant.price_range,
        categories: restaurant.categories.join(", "),
        image: restaurant.image,
        description: restaurant.description,
        phone: restaurant.phone || "",
        email: restaurant.email || ""
      });
    } else {
      setFormData({
        name: "",
        address: "",
        lat: 12.5855,
        lng: 121.5167,
        price_range: "moderate",
        categories: "",
        image: "",
        description: "",
        phone: "",
        email: ""
      });
    }
  }, [restaurant, isOpen]);

  const handleSearchAddress = async () => {
    if (!formData.address) {
      toast.error("Please enter an address first");
      return;
    }
    setIsGeocoding(true);
    const coords = await geocodeAddress(formData.address);
    setIsGeocoding(false);
    
    if (coords) {
      setFormData({ ...formData, lat: coords.lat, lng: coords.lng });
      toast.success("Location found!");
    } else {
      toast.error("Could not find coordinates for this address. Try being more specific.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = restaurant ? `/api/restaurants/${restaurant.id}` : "/api/restaurants";
      const method = restaurant ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          location: {
            lat: Number(formData.lat),
            lng: Number(formData.lng),
            address: formData.address
          },
          categories: formData.categories.split(",").map(c => c.trim()),
          rating: restaurant?.rating || 0,
          views: restaurant?.views || 0,
          reviewCount: restaurant?.reviewCount || 0
        })
      });
      if (res.ok) {
        toast.success(restaurant ? "Restaurant updated successfully!" : "Restaurant added successfully!");
        onClose();
      } else {
        toast.error(restaurant ? "Failed to update restaurant" : "Failed to add restaurant");
      }
    } catch (error) {
      toast.error(restaurant ? "Error updating restaurant" : "Error adding restaurant");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-orange-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
            {restaurant ? "Edit" : "Add New"} <span className="text-orange-600 italic font-serif lowercase">Restaurant</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Restaurant Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" placeholder="e.g. Roxas Grill" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price Range</label>
              <select value={formData.price_range} onChange={e => setFormData({...formData, price_range: e.target.value as any})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500">
                <option value="budget">Budget</option>
                <option value="moderate">Moderate</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Address</label>
              <div className="flex gap-2">
                <input 
                  required 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  className="flex-grow px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" 
                  placeholder="Full address in Roxas" 
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isGeocoding}
                  className="px-6 bg-orange-100 text-orange-600 rounded-2xl font-bold hover:bg-orange-200 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {isGeocoding ? (
                    <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span className="hidden sm:inline">Search</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Location Preview & Adjustment</label>
              <div className="relative">
                <LocationPicker 
                  lat={formData.lat} 
                  lng={formData.lng} 
                  onChange={(lat, lng) => setFormData({ ...formData, lat, lng })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Latitude</label>
              <input type="number" step="any" required value={formData.lat} onChange={e => setFormData({...formData, lat: Number(e.target.value)})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Longitude</label>
              <input type="number" step="any" required value={formData.lng} onChange={e => setFormData({...formData, lng: Number(e.target.value)})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Categories (comma separated)</label>
              <input required value={formData.categories} onChange={e => setFormData({...formData, categories: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" placeholder="e.g. Filipino, Seafood, Grill" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Image URL</label>
              <input required value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" placeholder="https://..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500 h-32" placeholder="Tell us about this place..." />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200">
            {restaurant ? "Update" : "Create"} Establishment
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  restaurantName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  restaurantName: string;
}) {
  console.log("🗑️ DeleteConfirmModal render - isOpen:", isOpen, "name:", restaurantName);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 text-center"
      >
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
          <Trash2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">Delete Establishment?</h2>
        <p className="text-gray-500 font-medium mb-8">
          Are you sure you want to delete <span className="text-red-600 font-bold">{restaurantName}</span>? This action cannot be undone.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onClose}
            className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DishModal({ 
  isOpen, 
  onClose, 
  dish,
  restaurants
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  dish: Dish | null;
  restaurants: Restaurant[];
}) {
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    tags: "",
    image: "",
    restaurant_id: "",
    isTrending: true
  });

  useEffect(() => {
    if (dish) {
      setFormData({
        name: dish.name,
        price: dish.price,
        tags: dish.tags.join(", "),
        image: dish.image,
        restaurant_id: dish.restaurant_id || "",
        isTrending: dish.isTrending
      });
    } else {
      setFormData({
        name: "",
        price: 0,
        tags: "",
        image: "",
        restaurant_id: restaurants[0]?.id || "",
        isTrending: true
      });
    }
  }, [dish, isOpen, restaurants]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = dish ? `/api/dishes/${dish.id}` : "/api/dishes";
      const method = dish ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          tags: formData.tags.split(",").map(t => t.trim())
        })
      });
      if (res.ok) {
        toast.success(dish ? "Dish updated successfully!" : "Dish added successfully!");
        onClose();
      } else {
        toast.error(dish ? "Failed to update dish" : "Failed to add dish");
      }
    } catch (error) {
      toast.error(dish ? "Error updating dish" : "Error adding dish");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-orange-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
            {dish ? "Edit" : "Add New"} <span className="text-orange-600 italic font-serif lowercase">Dish</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Dish Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" placeholder="e.g. Special Sisig" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price</label>
              <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Restaurant</label>
              <select required value={formData.restaurant_id} onChange={e => setFormData({...formData, restaurant_id: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500">
                <option value="">Select a restaurant</option>
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tags (comma separated)</label>
              <input required value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" placeholder="e.g. Filipino, Pork, Sizzling" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Image URL</label>
              <input required value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500" placeholder="https://..." />
            </div>
            <div className="flex items-center space-x-3 md:col-span-2">
              <input type="checkbox" id="isTrending" checked={formData.isTrending} onChange={e => setFormData({...formData, isTrending: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
              <label htmlFor="isTrending" className="text-sm font-bold text-gray-700">Mark as Trending</label>
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200">
            {dish ? "Update" : "Create"} Dish
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AdminDashboard({ restaurants, loading }: { restaurants: Restaurant[]; loading: boolean }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalViews: 0, totalRestaurants: 0, avgRating: 0, warning: "" });
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDishDeleteModalOpen, setIsDishDeleteModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [dishToDelete, setDishToDelete] = useState<Dish | null>(null);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("admin_auth") === "true";
    if (!isAdmin) {
      navigate("/admin/login");
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    const fetchDishes = async () => {
      try {
        const res = await fetch("/api/dishes");
        const data = await res.json();
        setDishes(data);
      } catch (error) {
        console.error("Failed to fetch dishes:", error);
      }
    };

    fetchStats();
    fetchDishes();

    socket.on("restaurant:created", () => fetchStats());
    socket.on("restaurant:updated", () => fetchStats());
    socket.on("restaurant:deleted", () => fetchStats());
    socket.on("restaurants:reloaded", () => {
      fetchStats();
      fetchDishes();
    });
    socket.on("dish:created", fetchDishes);
    socket.on("dish:updated", fetchDishes);
    socket.on("dish:deleted", fetchDishes);

    return () => {
      socket.off("restaurant:created");
      socket.off("restaurant:updated");
      socket.off("restaurant:deleted");
      socket.off("restaurants:reloaded");
      socket.off("dish:created");
      socket.off("dish:updated");
      socket.off("dish:deleted");
    };
  }, [navigate]);

  const handleDelete = (r: Restaurant) => {
    setRestaurantToDelete(r);
    setIsDeleteModalOpen(true);
  };

  const handleDishDelete = (d: Dish) => {
    setDishToDelete(d);
    setIsDishDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!restaurantToDelete) return;
    const id = restaurantToDelete.id || (restaurantToDelete as any)._id;
    try {
      const res = await fetch(`/api/restaurants/${id}`, { method: "DELETE" });
      if (res.ok) toast.success("Restaurant deleted successfully");
    } catch (error) {
      toast.error("Error deleting restaurant");
    } finally {
      setIsDeleteModalOpen(false);
      setRestaurantToDelete(null);
    }
  };

  const confirmDishDelete = async () => {
    if (!dishToDelete) return;
    try {
      const res = await fetch(`/api/dishes/${dishToDelete.id}`, { method: "DELETE" });
      if (res.ok) toast.success("Dish deleted successfully");
    } catch (error) {
      toast.error("Error deleting dish");
    } finally {
      setIsDishDeleteModalOpen(false);
      setDishToDelete(null);
    }
  };

  const isDisconnected = stats.warning === "DB not configured";

  return (
    <div className="pt-32 pb-12 min-h-screen bg-orange-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isDisconnected && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-3xl flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-red-900">MongoDB Not Configured</h3>
                <p className="text-sm text-red-700">Please provide a remote `MONGODB_URI` in the Secrets panel to enable real-time features.</p>
              </div>
            </div>
            <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all">
              Get Atlas URI
            </a>
          </div>
        )}

        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-orange-100/50 border border-orange-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Admin <span className="text-orange-600 italic font-serif lowercase">Dashboard</span></h1>
              <p className="text-gray-500 font-medium">Real-time management powered by MongoDB.</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={async () => {
                  if (window.confirm("This will delete all current data and reset to sample restaurants and dishes. Continue?")) {
                    try {
                      const res = await fetch("/api/seed", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ force: true })
                      });
                      const data = await res.json();
                      if (data.error) throw new Error(data.error);
                      toast.success("Database reset successfully!");
                    } catch (error) {
                      console.error("Reset error:", error);
                      toast.error("Failed to reset database");
                    }
                  }
                }}
                className="flex items-center space-x-2 bg-orange-50 text-orange-600 px-6 py-3 rounded-2xl font-bold hover:bg-orange-100 transition-all"
              >
                <Database className="w-5 h-5" />
                <span>Reset Data</span>
              </button>
              <button 
                onClick={() => {
                  sessionStorage.removeItem("admin_auth");
                  toast.success("Logged out successfully");
                  navigate("/admin/login");
                }}
                className="flex items-center space-x-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold hover:bg-red-100 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
              <button 
                onClick={() => {
                  setEditingRestaurant(null);
                  setIsModalOpen(true);
                }}
                className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
              >
                Add New Restaurant
              </button>
            </div>
          </div>

          <RestaurantModal 
            isOpen={isModalOpen} 
            onClose={() => {
              setIsModalOpen(false);
              setEditingRestaurant(null);
            }} 
            restaurant={editingRestaurant}
          />

          <DishModal 
            isOpen={isDishModalOpen}
            onClose={() => {
              setIsDishModalOpen(false);
              setEditingDish(null);
            }}
            dish={editingDish}
            restaurants={restaurants}
          />

          <DeleteConfirmModal 
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setRestaurantToDelete(null);
            }}
            onConfirm={confirmDelete}
            restaurantName={restaurantToDelete?.name || ""}
          />

          <DeleteConfirmModal 
            isOpen={isDishDeleteModalOpen}
            onClose={() => {
              setIsDishDeleteModalOpen(false);
              setDishToDelete(null);
            }}
            onConfirm={confirmDishDelete}
            restaurantName={dishToDelete?.name || ""}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { label: "Total Views", value: stats.totalViews.toLocaleString(), trend: "Real-time", color: "bg-blue-50 text-blue-600" },
              { label: "Establishments", value: stats.totalRestaurants, trend: "Live", color: "bg-red-50 text-red-600" },
              { label: "Avg Rating", value: stats.avgRating, trend: "Global", color: "bg-yellow-50 text-yellow-600" }
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-3xl border border-orange-50 bg-white shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", stat.color)}>{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Your Establishments</h3>
                <button 
                  onClick={() => {
                    setEditingRestaurant(null);
                    setIsModalOpen(true);
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-md shadow-orange-100"
                >
                  Add Restaurant
                </button>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-12 text-center text-gray-400 font-bold animate-pulse">LOADING DATA...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-orange-50">
                        <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Restaurant</th>
                        <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</th>
                        <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Views</th>
                        <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50">
                      {restaurants.map((r: Restaurant) => (
                        <tr key={r.id} className="group hover:bg-orange-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center space-x-4">
                              <img src={r.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                              <span className="font-bold text-gray-900">{r.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-500 font-medium">{r.categories[0]}</td>
                          <td className="py-4">
                            <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-widest rounded-full">Active</span>
                          </td>
                          <td className="py-4 text-sm font-bold text-gray-900">{r.views}</td>
                          <td className="py-4">
                            <div className="flex items-center justify-end space-x-2">
                              <Link to={`/restaurant/${r.id}`} className="p-2 text-gray-400 hover:text-orange-600 transition-colors" title="View Details"><Eye className="w-4 h-4" /></Link>
                              <button 
                                onClick={() => {
                                  setEditingRestaurant(r);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit Restaurant"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(r)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete Restaurant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {restaurants.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400 font-medium italic">
                            {isDisconnected ? "Database not connected." : "No restaurants found."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Trending Dishes</h3>
                <button 
                  onClick={() => {
                    setEditingDish(null);
                    setIsDishModalOpen(true);
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-md shadow-orange-100"
                >
                  Add Dish
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-orange-50">
                      <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dish</th>
                      <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Restaurant</th>
                      <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</th>
                      <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trending</th>
                      <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-50">
                    {dishes.map((d: Dish) => (
                      <tr key={d.id} className="group hover:bg-orange-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center space-x-4">
                            <img src={d.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                            <span className="font-bold text-gray-900">{d.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-gray-500 font-medium">{d.restaurant}</td>
                        <td className="py-4 text-sm font-bold text-gray-900">{formatCurrency(d.price)}</td>
                        <td className="py-4">
                          {d.isTrending ? (
                            <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded-full">Yes</span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest rounded-full">No</span>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => {
                                setEditingDish(d);
                                setIsDishModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit Dish"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDishDelete(d)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Dish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dishes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 font-medium italic">
                          No dishes found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RestaurantDetail() {
  const { id } = useParams<{ id: string }>();
  const [user] = useAuthState(auth);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/restaurants/${id}/reviews`);
      const data = await res.json();
      setReviews(data);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    }
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (!res.ok) throw new Error("Restaurant not found");
        const data = await res.json();
        setRestaurant(data);
      } catch (error) {
        console.error("Failed to fetch restaurant:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
    fetchReviews();
  }, [id]);

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to leave a review");
      return;
    }
    if (!reviewComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/restaurants/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.uid,
          user_name: user.displayName || "Anonymous",
          rating: reviewRating,
          comment: reviewComment
        })
      });

      if (res.ok) {
        toast.success("Review submitted successfully!");
        setReviewComment("");
        setReviewRating(5);
        fetchReviews();
        // Refresh restaurant to get updated rating/count
        const restRes = await fetch(`/api/restaurants/${id}`);
        if (restRes.ok) {
          const restData = await restRes.json();
          setRestaurant(restData);
        }
      } else {
        toast.error("Failed to submit review");
      }
    } catch (error) {
      toast.error("Error submitting review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) return <div className="pt-32 text-center font-bold animate-pulse">LOADING...</div>;

  if (!restaurant) {
    return (
      <div className="pt-32 pb-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Restaurant not found</h2>
        <Link to="/" className="text-orange-600 font-bold hover:underline mt-4 inline-block">Back to Home</Link>
      </div>
    );
  }

  const getDirectionsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  return (
    <div className="pt-32 pb-12 min-h-screen bg-orange-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] overflow-hidden shadow-2xl shadow-orange-100/50 border border-orange-100"
        >
          <div className="relative h-[400px]">
            <img 
              src={restaurant.image} 
              alt={restaurant.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-8 left-8 right-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {restaurant.categories.map((cat, i) => (
                  <span key={`${cat}-${i}`} className="px-3 py-1 bg-orange-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {cat}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2">
                {restaurant.name}
              </h1>
              <div className="flex items-center text-orange-200 font-medium">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{restaurant.location.address}</span>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">About the <span className="text-orange-600 italic font-serif lowercase">Establishment</span></h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {restaurant.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-orange-50/50 border border-orange-100">
                  <Star className="w-6 h-6 text-orange-600 mb-2" />
                  <p className="text-2xl font-black text-gray-900">{restaurant.rating}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Average Rating</p>
                </div>
                <div className="p-6 rounded-3xl bg-orange-50/50 border border-orange-100">
                  <Eye className="w-6 h-6 text-orange-600 mb-2" />
                  <p className="text-2xl font-black text-gray-900">{restaurant.views}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Views</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-[32px] bg-gray-900 text-white space-y-6">
                <h3 className="text-xl font-bold uppercase tracking-tight">Contact <span className="text-orange-500 italic font-serif lowercase">Info</span></h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <MapPin className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Address</p>
                      <p className="text-sm font-medium">{restaurant.location.address}</p>
                    </div>
                  </div>

                  {restaurant.phone && (
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <Phone className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                        <a href={`tel:${restaurant.phone}`} className="text-sm font-medium hover:text-orange-500 transition-colors">
                          {restaurant.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {restaurant.email && (
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <Mail className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                        <a href={`mailto:${restaurant.email}`} className="text-sm font-medium hover:text-orange-500 transition-colors break-all">
                          {restaurant.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <a 
                  href={getDirectionsUrl(restaurant.location.lat, restaurant.location.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-900/20"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Get Directions</span>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reviews Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 space-y-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
              Customer <span className="text-orange-600 italic font-serif lowercase">Reviews</span>
            </h2>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-orange-100 shadow-sm">
              <Star className="w-5 h-5 text-orange-600 fill-current" />
              <span className="text-lg font-black text-gray-900">{restaurant.rating}</span>
              <span className="text-gray-400 font-bold">({restaurant.reviewCount} reviews)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Review Form */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[40px] border border-orange-100 shadow-xl shadow-orange-100/20 sticky top-32">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Leave a <span className="text-orange-600 italic font-serif lowercase">Review</span></h3>
                <form onSubmit={handleReviewSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Rating</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            reviewRating >= star ? "text-orange-600 bg-orange-50" : "text-gray-300 hover:text-orange-300"
                          )}
                        >
                          <Star className={cn("w-6 h-6", reviewRating >= star && "fill-current")} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your Comment</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience..."
                      className="w-full px-6 py-4 bg-orange-50/50 rounded-2xl focus:ring-2 focus:ring-orange-500 h-32 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-orange-200"
                  >
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              </div>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-6">
              {reviews.length === 0 ? (
                <div className="bg-white p-12 rounded-[40px] border border-orange-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto text-orange-600">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="text-gray-500 font-medium italic">No reviews yet. Be the first to share your experience!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-8 rounded-[40px] border border-orange-100 shadow-sm space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-black">
                          {review.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{review.user_name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 bg-orange-50 px-3 py-1 rounded-xl">
                        <Star className="w-3 h-3 text-orange-600 fill-current" />
                        <span className="text-xs font-black text-orange-900">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Restaurants({ restaurants, loading, userLocation }: { restaurants: Restaurant[]; loading: boolean; userLocation: [number, number] | null }) {
  const [searchParams] = useSearchParams();
  const initialSort = searchParams.get("sort") as any;
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || null;
  
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'newest' | 'nearby'>(initialSort || 'rating');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);

  const navigate = useNavigate();

  // Sync with URL params when they change
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const cat = searchParams.get("category") || null;
    const sort = searchParams.get("sort") || 'rating';
    
    if (q !== searchQuery) setSearchQuery(q);
    if (cat !== selectedCategory) setSelectedCategory(cat);
    if (sort !== sortBy) setSortBy(sort as any);
  }, [searchParams]);

  // Update URL params when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    if (sortBy !== 'rating') params.set("sort", sortBy);
    
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    
    if (newSearch !== currentSearch) {
      navigate(`/restaurants?${newSearch}`, { replace: true });
    }
  }, [searchQuery, selectedCategory, sortBy, navigate, searchParams]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    restaurants.forEach(r => r.categories.forEach(c => cats.add(c)));
    return Array.from(cats);
  }, [restaurants]);

  const sortedRestaurants = useMemo(() => {
    let filtered = restaurants.filter(r => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
                          (r.name?.toLowerCase().includes(searchLower) || false) ||
                          (r.categories?.some(c => c.toLowerCase().includes(searchLower)) || false) ||
                          (r.description?.toLowerCase().includes(searchLower) || false) ||
                          (r.location?.address?.toLowerCase().includes(searchLower) || false);
      const matchesCategory = !selectedCategory || (r.categories?.includes(selectedCategory) || false);
      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'nearby' && userLocation) {
        const distA = calculateDistance(userLocation[0], userLocation[1], a.location.lat, a.location.lng);
        const distB = calculateDistance(userLocation[0], userLocation[1], b.location.lat, b.location.lng);
        return distA - distB;
      }
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });
  }, [restaurants, sortBy, searchQuery, selectedCategory, userLocation]);

  if (loading) {
    return (
      <div className="pt-32 pb-12 min-h-screen bg-orange-50/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-orange-600 font-bold animate-pulse">Loading Restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-12 min-h-screen bg-orange-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter">
              Browse <span className="text-orange-600 italic font-serif lowercase">Restaurants</span>
            </h1>
            <p className="text-gray-500 font-medium max-w-2xl">
              Discover the finest dining spots in Roxas. Filter by cuisine, sort by popularity, and find your next favorite meal.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-white p-6 rounded-[32px] border border-orange-100 shadow-xl shadow-orange-100/20">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name, cuisine, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-orange-50/50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-medium text-gray-900 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-orange-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="relative">
                <select 
                  value={selectedCategory || ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="appearance-none pl-4 pr-10 py-3 bg-orange-50/50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-bold text-gray-900 text-sm cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex items-center bg-orange-50/50 rounded-2xl p-1">
                {[
                  { id: 'rating', label: 'Top Rated', icon: Star },
                  { id: 'reviews', label: 'Most Reviews', icon: MessageSquare },
                  { id: 'nearby', label: 'Nearby', icon: MapPin },
                  { id: 'newest', label: 'Newest', icon: Calendar }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (option.id === 'nearby' && !userLocation) {
                        toast.error("Please enable location to see nearby restaurants");
                        return;
                      }
                      setSortBy(option.id as any);
                    }}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      sortBy === option.id 
                        ? "bg-white text-orange-600 shadow-sm" 
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    <option.icon className="w-3.5 h-3.5" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {sortedRestaurants.map((restaurant, index) => (
              <motion.div
                key={restaurant.id || index}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <RestaurantCard 
                  restaurant={restaurant} 
                  distance={userLocation ? calculateDistance(userLocation[0], userLocation[1], restaurant.location.lat, restaurant.location.lng) : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {sortedRestaurants.length === 0 && (
          <div className="py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No restaurants found</h3>
            <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
            <button 
              onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
              className="text-orange-600 font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MapPage({ restaurants, loading, userLocation }: { restaurants: Restaurant[]; loading: boolean; userLocation: [number, number] | null }) {
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get("restaurantId");

  return (
    <div className="pt-32 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter">Map <span className="text-orange-600 italic font-serif lowercase">Explorer</span></h1>
        <p className="text-gray-500 font-medium">Discover eateries across Roxas, Oriental Mindoro.</p>
      </div>
      {loading ? (
        <div className="h-[700px] bg-orange-50 rounded-[40px] animate-pulse flex items-center justify-center">
          <p className="text-orange-600 font-bold">Loading Map...</p>
        </div>
      ) : (
        <Map 
          restaurants={restaurants} 
          zoom={restaurantId ? 16 : 14} 
          center={userLocation || [12.5833, 121.5167]} 
          selectedRestaurantId={restaurantId || undefined}
        />
      )}
    </div>
  );
}

export default function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      });
    }
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurants");
      const data = await res.json();
      if (data.error) {
        console.error("Backend error:", data.error);
        if (data.code === "DB_NOT_CONFIGURED" || data.error.includes("Database not configured")) {
          toast.error("Database not configured. Please add MONGODB_URI to your Vercel environment variables.", {
            duration: 10000,
            action: {
              label: "Help",
              onClick: () => window.open("https://vercel.com/docs/concepts/projects/environment-variables", "_blank")
            }
          });
        }
      } else {
        setRestaurants(data);
      }
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("restaurant:created", (newR) => {
      setRestaurants(prev => [newR, ...prev]);
    });

    socket.on("restaurant:updated", (updatedR) => {
      setRestaurants(prev => prev.map(r => r.id === updatedR.id ? updatedR : r));
    });

    socket.on("restaurant:deleted", (id) => {
      console.log("🗑️ Socket received deletion for ID:", id);
      setRestaurants(prev => prev.filter(r => r.id !== id));
    });

    socket.on("restaurants:reloaded", () => {
      fetchRestaurants();
    });

    socket.on("review:created", ({ restaurant_id, review }) => {
      setRestaurants(prev => prev.map(r => {
        if (r.id === restaurant_id) {
          const newReviewCount = (r.reviewCount || 0) + 1;
          const currentTotalRating = (r.rating || 0) * (r.reviewCount || 0);
          const newRating = Number(((currentTotalRating + review.rating) / newReviewCount).toFixed(1));
          return { ...r, rating: newRating, reviewCount: newReviewCount };
        }
        return r;
      }));
    });

    return () => {
      socket.off("connect");
      socket.off("restaurant:created");
      socket.off("restaurant:updated");
      socket.off("restaurant:deleted");
      socket.off("restaurants:reloaded");
      socket.off("review:created");
    };
  }, []);

  return (
    <Router>
      <div className="font-sans antialiased text-gray-900">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home restaurants={restaurants} loading={loading} userLocation={userLocation} />} />
            <Route path="/restaurants" element={<Restaurants restaurants={restaurants} loading={loading} userLocation={userLocation} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard restaurants={restaurants} loading={loading} />} />
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="/map" element={<MapPage restaurants={restaurants} loading={loading} userLocation={userLocation} />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" />
      </div>
    </Router>
  );
}
