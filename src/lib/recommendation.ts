import { Restaurant, UserPreferences } from "../types";
import { calculateDistance } from "./utils";

export function getRecommendations(
  restaurants: Restaurant[],
  preferences: UserPreferences | null,
  userLocation?: { lat: number; lng: number }
) {
  if (!preferences && !userLocation) {
    // If no preferences or location, return restaurants sorted by rating and views
    return [...restaurants].sort((a, b) => (b.rating * 0.7 + b.views * 0.3) - (a.rating * 0.7 + a.views * 0.3));
  }

  const scoredRestaurants = restaurants.map((restaurant) => {
    let score = 0;

    // 1. Price Match (Weight: 30)
    if (preferences?.budget === restaurant.price_range) {
      score += 30;
    } else if (
      (preferences?.budget === 'budget' && restaurant.price_range === 'moderate') ||
      (preferences?.budget === 'moderate' && (restaurant.price_range === 'budget' || restaurant.price_range === 'premium')) ||
      (preferences?.budget === 'premium' && restaurant.price_range === 'moderate')
    ) {
      score += 15;
    }

    // 2. Category Match (Weight: 40)
    if (preferences?.categories && preferences.categories.length > 0) {
      const matchCount = restaurant.categories.filter(cat => preferences.categories.includes(cat)).length;
      const matchRatio = matchCount / preferences.categories.length;
      score += matchRatio * 40;
    }

    // 3. Rating (Weight: 20)
    score += (restaurant.rating / 5) * 20;

    // 4. Distance (Weight: 10)
    if (userLocation) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        restaurant.location.lat,
        restaurant.location.lng
      );
      // Assume 5km is "close" for Roxas
      const distanceScore = Math.max(0, (5 - distance) / 5) * 10;
      score += distanceScore;
    }

    return { ...restaurant, recommendationScore: score };
  });

  return scoredRestaurants.sort((a, b) => b.recommendationScore - a.recommendationScore);
}
