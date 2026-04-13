import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { LogIn, LogOut, User, LayoutDashboard, Heart } from "lucide-react";
import { cn } from "../lib/utils";

export default function Navbar() {
  const [user] = useAuthState(auth);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              DishSpot<span className="text-orange-600">Roxas</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Home</Link>
            <Link to="/restaurants" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Restaurants</Link>
            <Link to="/restaurants?sort=nearby" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Nearby</Link>
            <Link to="/map" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Map Explorer</Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/favorites" className="p-2 text-gray-500 hover:text-orange-600 transition-colors">
                  <Heart className="w-5 h-5" />
                </Link>
                <Link to="/admin" className="p-2 text-gray-500 hover:text-orange-600 transition-colors">
                  <LayoutDashboard className="w-5 h-5" />
                </Link>
                <div className="flex items-center space-x-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                  <User className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-900">{user.displayName?.split(' ')[0]}</span>
                </div>
                <button 
                  onClick={() => auth.signOut()}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login"
                className="inline-flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
