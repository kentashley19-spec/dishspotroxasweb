export type PriceRange = 'budget' | 'moderate' | 'premium';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Restaurant {
  id: string;
  name: string;
  location: Location;
  price_range: PriceRange;
  categories: string[];
  rating: number;
  image: string;
  description: string;
  views: number;
  phone?: string;
  email?: string;
  reviewCount: number;
  createdAt: string;
}

export interface Dish {
  id: string;
  restaurant_id: string;
  restaurant?: string;
  name: string;
  price: number;
  tags: string[];
  image: string;
  isTrending: boolean;
}

export interface UserPreferences {
  budget: PriceRange;
  categories: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  favorites: string[];
  preferences: UserPreferences;
  role?: 'admin' | 'user';
}

export interface Review {
  id: string;
  restaurant_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  createdAt: string;
}
