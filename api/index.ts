import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Connection Helper
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return true;
  
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("localhost") || uri.includes("127.0.0.1")) {
    console.warn("⚠️ MONGODB_URI is not configured or pointing to a local instance. Please provide a remote MongoDB URI (e.g., MongoDB Atlas) in the Secrets panel.");
    return false;
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log("✅ Connected to MongoDB");
    return true;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    return false;
  }
};

// Initial connection attempt
connectDB();

// Mongoose Schemas
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  price_range: { type: String, enum: ["budget", "moderate", "premium"] },
  categories: [String],
  rating: { type: Number, default: 0 },
  image: String,
  description: String,
  views: { type: Number, default: 0 },
  phone: String,
  email: String,
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  }
});

const RestaurantModel = mongoose.models.Restaurant || mongoose.model("Restaurant", restaurantSchema);

const dishSchema = new mongoose.Schema({
  restaurant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
  name: { type: String, required: true },
  price: Number,
  tags: [String],
  image: String,
  isTrending: { type: Boolean, default: false }
});

const DishModel = mongoose.models.Dish || mongoose.model("Dish", dishSchema);

const reviewSchema = new mongoose.Schema({
  restaurant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  }
});

const ReviewModel = mongoose.models.Review || mongoose.model("Review", reviewSchema);

async function createServerApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json());

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API routes
  app.get("/api/health", async (req, res) => {
    const dbStatus = await connectDB();
    res.json({ status: "ok", database: dbStatus ? "connected" : "disconnected" });
  });

  // Restaurants API
  app.get("/api/restaurants", async (req, res) => {
    console.log("📥 GET /api/restaurants");
    try {
      if (!(await connectDB())) {
        return res.status(503).json({ 
          error: "Database not configured. Please add MONGODB_URI to your Vercel environment variables.",
          code: "DB_NOT_CONFIGURED"
        });
      }
      
      let restaurants = await (RestaurantModel as any).find().sort({ rating: -1 });
      
      // Auto-seed if empty
      if (restaurants.length === 0) {
        console.log("📭 Database empty, triggering auto-seed...");
        const sampleRestaurants = [
          {
            name: "Red Tomato Resto Farm",
            description: "Red Tomato Resto Farm serves The Modern Italian Restaurant in Town of Roxas.",
            image: "https://lakbay-v3.poggerss.com/places/652/gallery/20251213104116_73bc3830.jpg",
            location: { lat: 12.58950139, lng: 121.5136021, address: "25, LEUTERIO STREET PACLASAN ROXAS ORIENTAL MINDORO , ROXAS" },
            price_range: "moderate",
            categories: ["Italian", "Modern", "Farm-to-table"],
            rating: 4.5,
            reviewCount: 2,
            views: 1250,
            email: "redtomatorestofarmph@gmail.com"
          },
          {
            name: "Tita Cor's Restaurant",
            description: "Tita Cor's Restaurant serves home-style Filipino cooking with motherly care.",
            image: "https://lakbay-v3.poggerss.com/places/777/gallery/20251212053441_118e3a8d.jpg",
            location: { lat: 12.58865321, lng: 121.5189684, address: "Odiong, Roxas, Oriental Mindoro" },
            price_range: "budget",
            categories: ["Filipino", "Home-style"],
            rating: 4.5,
            reviewCount: 2,
            views: 890,
            phone: "9224269315",
            email: "mangyancuboolculturalboothoflove@gmail.com"
          },
          {
            name: "Vi-King Grill and Resto Bar",
            description: "Fine Dining Resto Bar",
            image: "https://lakbay-v3.poggerss.com/places/801/gallery/20251212061417_c4dec3d4.jpg",
            location: { lat: 12.5919076, lng: 121.5177919, address: "Kings Court 15 Morente St. Bagumbayan, Roxas, Philippines" },
            price_range: "premium",
            categories: ["Grill", "Bar", "Fine Dining"],
            rating: 4.5,
            reviewCount: 2,
            views: 1100,
            phone: "9292229817",
            email: "kingpeter@gmail.com"
          },
          {
            name: "Casa Gracia's Garden Restaurant",
            description: "Casa Gracia's Garden Restaurant features garden dining with elegant atmosphere.",
            image: "https://lakbay-v3.poggerss.com/places/216/gallery/20251211052532_147e69b0.jpg",
            location: { lat: 12.58663658, lng: 121.5238036, address: "Bagumbayan, Roxas, Oriental Mindoro" },
            price_range: "moderate",
            categories: ["Garden", "Filipino", "Elegant"],
            rating: 4.5,
            reviewCount: 2,
            views: 950,
            phone: "0949-729-7876",
            email: "rheasapungan5o8@gmail.com"
          },
          {
            name: "De Calidad Restaurant",
            description: "De Calidad Restaurant serves quality Filipino and international cuisine.",
            image: "https://lakbay-v3.poggerss.com/places/255/gallery/20251211055933_539cb96b.jpg",
            location: { lat: 12.59042188, lng: 121.5209597, address: "Bagumbayan, Roxas, Oriental Mindoro" },
            price_range: "moderate",
            categories: ["Filipino", "International"],
            rating: 4.5,
            reviewCount: 2,
            views: 780,
            phone: "0949-439-1112"
          }
        ];

        const createdRestaurants = await (RestaurantModel as any).insertMany(sampleRestaurants);
        
        const sampleDishes = [
          {
            restaurant_id: createdRestaurants[0]._id,
            name: "Sisig",
            price: 250,
            tags: ["Filipino", "Sizzling", "Pork"],
            image: "https://picsum.photos/seed/sisig/800/600",
            isTrending: true
          },
          {
            restaurant_id: createdRestaurants[1]._id,
            name: "Halo-halo",
            price: 120,
            tags: ["Dessert", "Filipino", "Cold"],
            image: "https://picsum.photos/seed/halohalo/800/600",
            isTrending: true
          },
          {
            restaurant_id: createdRestaurants[2]._id,
            name: "Premium Chicken",
            price: 450,
            tags: ["Chicken", "Premium", "Roasted"],
            image: "https://picsum.photos/seed/chicken/800/600",
            isTrending: true
          },
          {
            restaurant_id: createdRestaurants[3]._id,
            name: "Pansit Palabok",
            price: 180,
            tags: ["Noodles", "Filipino", "Classic"],
            image: "https://picsum.photos/seed/palabok/800/600",
            isTrending: true
          }
        ];

        await (DishModel as any).insertMany(sampleDishes);

        // Add sample reviews
        const sampleReviews = [];
        for (const restaurant of createdRestaurants) {
          sampleReviews.push({
            restaurant_id: restaurant._id,
            user_id: "seed_user_1",
            user_name: "Juan Dela Cruz",
            rating: 5,
            comment: "Amazing food and great atmosphere! Highly recommended.",
            createdAt: new Date()
          });
          sampleReviews.push({
            restaurant_id: restaurant._id,
            user_id: "seed_user_2",
            user_name: "Maria Clara",
            rating: 4,
            comment: "Good service, but the waiting time was a bit long.",
            createdAt: new Date()
          });
        }
        await (ReviewModel as any).insertMany(sampleReviews);

        restaurants = await (RestaurantModel as any).find().sort({ rating: -1 });
        io.emit("restaurants:reloaded");
      }

      res.json(restaurants);
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      if (!(await connectDB())) return res.status(503).json({ error: "DB not connected" });
      const restaurant = await (RestaurantModel as any).findById(req.params.id);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      
      // Increment views
      restaurant.views += 1;
      await restaurant.save();
      
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  // Dishes API
  app.get("/api/dishes", async (req, res) => {
    try {
      if (!(await connectDB())) {
        return res.status(503).json({ 
          error: "Database not configured. Please add MONGODB_URI to your Vercel environment variables.",
          code: "DB_NOT_CONFIGURED"
        });
      }
      const dishes = await (DishModel as any).find().populate("restaurant_id", "name");
      const formattedDishes = dishes.map((d: any) => ({
        id: d._id.toString(),
        restaurant_id: d.restaurant_id?._id?.toString(),
        restaurant: (d.restaurant_id as any)?.name || "Unknown Restaurant",
        name: d.name,
        price: d.price,
        tags: d.tags,
        image: d.image,
        isTrending: d.isTrending
      }));
      res.json(formattedDishes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dishes" });
    }
  });

  app.get("/api/dishes/trending", async (req, res) => {
    try {
      if (!(await connectDB())) {
        return res.status(503).json({ 
          error: "Database not configured. Please add MONGODB_URI to your Vercel environment variables.",
          code: "DB_NOT_CONFIGURED"
        });
      }
      const dishes = await (DishModel as any).find({ isTrending: true }).populate("restaurant_id", "name");
      const formattedDishes = dishes.map((d: any) => ({
        id: d._id.toString(),
        restaurant_id: d.restaurant_id?._id?.toString(),
        restaurant: (d.restaurant_id as any)?.name || "Unknown Restaurant",
        name: d.name,
        price: d.price,
        tags: d.tags,
        image: d.image,
        isTrending: d.isTrending
      }));
      res.json(formattedDishes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trending dishes" });
    }
  });

  app.post("/api/dishes", async (req, res) => {
    try {
      if (!(await connectDB())) throw new Error("DB not connected");
      const dish = new (DishModel as any)(req.body);
      await dish.save();
      const populatedDish = await (DishModel as any).findById(dish._id).populate("restaurant_id", "name");
      io.emit("dish:created", populatedDish);
      res.status(201).json(populatedDish);
    } catch (error) {
      res.status(400).json({ error: "Failed to create dish" });
    }
  });

  app.patch("/api/dishes/:id", async (req, res) => {
    try {
      if (!(await connectDB())) throw new Error("DB not connected");
      const dish = await (DishModel as any).findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("restaurant_id", "name");
      if (!dish) return res.status(404).json({ error: "Dish not found" });
      io.emit("dish:updated", dish);
      res.json(dish);
    } catch (error) {
      res.status(400).json({ error: "Failed to update dish" });
    }
  });

  app.delete("/api/dishes/:id", async (req, res) => {
    try {
      if (!(await connectDB())) throw new Error("DB not connected");
      const dish = await (DishModel as any).findByIdAndDelete(req.params.id);
      if (!dish) return res.status(404).json({ error: "Dish not found" });
      io.emit("dish:deleted", req.params.id);
      res.json({ message: "Dish deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dish" });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      if (!(await connectDB())) throw new Error("DB not connected");
      const restaurant = new (RestaurantModel as any)(req.body);
      await restaurant.save();
      io.emit("restaurant:created", restaurant);
      res.status(201).json(restaurant);
    } catch (error) {
      res.status(400).json({ error: "Failed to create restaurant" });
    }
  });

  app.patch("/api/restaurants/:id", async (req, res) => {
    try {
      if (!(await connectDB())) throw new Error("DB not connected");
      const restaurant = await (RestaurantModel as any).findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      io.emit("restaurant:updated", restaurant);
      res.json(restaurant);
    } catch (error) {
      res.status(400).json({ error: "Failed to update restaurant" });
    }
  });

  app.delete("/api/restaurants/:id", async (req, res) => {
    console.log(`🗑️ DELETE /api/restaurants/${req.params.id}`);
    try {
      if (!(await connectDB())) {
        console.error("❌ DB not connected for deletion");
        throw new Error("DB not connected");
      }
      
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        console.error(`❌ Invalid ID format: ${req.params.id}`);
        return res.status(400).json({ error: "Invalid restaurant ID format" });
      }

      const restaurant = await (RestaurantModel as any).findByIdAndDelete(req.params.id);
      if (!restaurant) {
        console.warn(`⚠️ Restaurant not found for deletion: ${req.params.id}`);
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      // Also delete associated dishes and reviews
      await (DishModel as any).deleteMany({ restaurant_id: req.params.id });
      await (ReviewModel as any).deleteMany({ restaurant_id: req.params.id });
      
      console.log(`✅ Restaurant deleted: ${req.params.id}`);
      io.emit("restaurant:deleted", req.params.id);
      res.json({ message: "Restaurant deleted" });
    } catch (error) {
      console.error("❌ Failed to delete restaurant:", error);
      res.status(500).json({ error: "Failed to delete restaurant" });
    }
  });

  // Reviews API
  app.get("/api/restaurants/:id/reviews", async (req, res) => {
    try {
      if (!(await connectDB())) return res.json([]);
      const reviews = await (ReviewModel as any).find({ restaurant_id: req.params.id }).sort({ createdAt: -1 });
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/restaurants/:id/reviews", async (req, res) => {
    try {
      if (!(await connectDB())) throw new Error("DB not connected");
      
      const { user_id, user_name, rating, comment } = req.body;
      const review = new (ReviewModel as any)({
        restaurant_id: req.params.id,
        user_id,
        user_name,
        rating,
        comment
      });
      await review.save();

      // Update restaurant rating and review count
      const reviews = await (ReviewModel as any).find({ restaurant_id: req.params.id });
      const avgRating = reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / reviews.length;
      
      await (RestaurantModel as any).findByIdAndUpdate(req.params.id, {
        rating: Number(avgRating.toFixed(1)),
        reviewCount: reviews.length
      });

      io.emit("review:created", { restaurant_id: req.params.id, review });
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ error: "Failed to create review" });
    }
  });

  // Analytics API (Real-time stats)
  app.get("/api/stats", async (req, res) => {
    try {
      if (!(await connectDB())) {
        return res.json({ totalViews: 0, totalRestaurants: 0, avgRating: 0, warning: "DB not configured" });
      }
      const totalViews = await (RestaurantModel as any).aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]);
      const totalRestaurants = await (RestaurantModel as any).countDocuments();
      const avgRating = await (RestaurantModel as any).aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]);
      
      res.json({
        totalViews: totalViews[0]?.total || 0,
        totalRestaurants,
        avgRating: avgRating[0]?.avg?.toFixed(1) || 0
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Seed API
  app.post("/api/seed", async (req, res) => {
    try {
      if (!(await connectDB())) {
        return res.status(503).json({ error: "Database not configured. Please add MONGODB_URI to Secrets." });
      }
      
      const restaurantsCount = await (RestaurantModel as any).countDocuments();
      const force = req.body.force === true;
      
      if (restaurantsCount > 0 && !force) {
        return res.json({ message: "Database already seeded. Use force: true to reset." });
      }

      if (force) {
        console.log("🧹 Force reset requested. Clearing database...");
        await (RestaurantModel as any).deleteMany({});
        await (DishModel as any).deleteMany({});
      }

      const sampleRestaurants = [
        {
          name: "Red Tomato Resto Farm",
          description: "Red Tomato Resto Farm serves The Modern Italian Restaurant in Town of Roxas.",
          image: "https://lakbay-v3.poggerss.com/places/652/gallery/20251213104116_73bc3830.jpg",
          location: { lat: 12.58950139, lng: 121.5136021, address: "25, LEUTERIO STREET PACLASAN ROXAS ORIENTAL MINDORO , ROXAS" },
          price_range: "moderate",
          categories: ["Italian", "Modern", "Farm-to-table"],
          rating: 4.8,
          views: 1250,
          email: "redtomatorestofarmph@gmail.com"
        },
        {
          name: "Tita Cor's Restaurant",
          description: "Tita Cor's Restaurant serves home-style Filipino cooking with motherly care.",
          image: "https://lakbay-v3.poggerss.com/places/777/gallery/20251212053441_118e3a8d.jpg",
          location: { lat: 12.58865321, lng: 121.5189684, address: "Odiong, Roxas, Oriental Mindoro" },
          price_range: "budget",
          categories: ["Filipino", "Home-style"],
          rating: 4.5,
          views: 890,
          phone: "9224269315",
          email: "mangyancuboolculturalboothoflove@gmail.com"
        },
        {
          name: "Vi-King Grill and Resto Bar",
          description: "Fine Dining Resto Bar",
          image: "https://lakbay-v3.poggerss.com/places/801/gallery/20251212061417_c4dec3d4.jpg",
          location: { lat: 12.5919076, lng: 121.5177919, address: "Kings Court 15 Morente St. Bagumbayan, Roxas, Philippines" },
          price_range: "premium",
          categories: ["Grill", "Bar", "Fine Dining"],
          rating: 4.7,
          views: 1100,
          phone: "9292229817",
          email: "kingpeter@gmail.com"
        },
        {
          name: "Casa Gracia's Garden Restaurant",
          description: "Casa Gracia's Garden Restaurant features garden dining with elegant atmosphere.",
          image: "https://lakbay-v3.poggerss.com/places/216/gallery/20251211052532_147e69b0.jpg",
          location: { lat: 12.58663658, lng: 121.5238036, address: "Bagumbayan, Roxas, Oriental Mindoro" },
          price_range: "moderate",
          categories: ["Garden", "Filipino", "Elegant"],
          rating: 4.6,
          views: 950,
          phone: "0949-729-7876",
          email: "rheasapungan5o8@gmail.com"
        },
        {
          name: "De Calidad Restaurant",
          description: "De Calidad Restaurant serves quality Filipino and international cuisine.",
          image: "https://lakbay-v3.poggerss.com/places/255/gallery/20251211055933_539cb96b.jpg",
          location: { lat: 12.59042188, lng: 121.5209597, address: "Bagumbayan, Roxas, Oriental Mindoro" },
          price_range: "moderate",
          categories: ["Filipino", "International"],
          rating: 4.4,
          views: 780,
          phone: "0949-439-1112"
        }
      ];

      const createdRestaurants = await (RestaurantModel as any).insertMany(sampleRestaurants);
      
      const sampleDishes = [
        {
          restaurant_id: createdRestaurants[0]._id,
          name: "Sisig",
          price: 250,
          tags: ["Filipino", "Sizzling", "Pork"],
          image: "https://picsum.photos/seed/sisig/800/600",
          isTrending: true
        },
        {
          restaurant_id: createdRestaurants[1]._id,
          name: "Halo-halo",
          price: 120,
          tags: ["Dessert", "Filipino", "Cold"],
          image: "https://picsum.photos/seed/halohalo/800/600",
          isTrending: true
        },
        {
          restaurant_id: createdRestaurants[2]._id,
          name: "Premium Chicken",
          price: 450,
          tags: ["Chicken", "Premium", "Roasted"],
          image: "https://picsum.photos/seed/chicken/800/600",
          isTrending: true
        },
        {
          restaurant_id: createdRestaurants[3]._id,
          name: "Pansit Palabok",
          price: 180,
          tags: ["Noodles", "Filipino", "Classic"],
          image: "https://picsum.photos/seed/palabok/800/600",
          isTrending: true
        }
      ];

      await (DishModel as any).insertMany(sampleDishes);
      
      // Add sample reviews
      const sampleReviews = [];
      for (const restaurant of createdRestaurants) {
        sampleReviews.push({
          restaurant_id: restaurant._id,
          user_id: "seed_user_1",
          user_name: "Juan Dela Cruz",
          rating: 5,
          comment: "Amazing food and great atmosphere! Highly recommended.",
          createdAt: new Date()
        });
        sampleReviews.push({
          restaurant_id: restaurant._id,
          user_id: "seed_user_2",
          user_name: "Maria Clara",
          rating: 4,
          comment: "Good service, but the waiting time was a bit long.",
          createdAt: new Date()
        });
      }
      await (ReviewModel as any).insertMany(sampleReviews);

      io.emit("restaurants:reloaded");
      res.json({ message: "Database seeded successfully with new restaurants, dishes, and reviews" });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed database" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return { app, httpServer };
}

const { app, httpServer } = await createServerApp();

export default app;

if (!process.env.VERCEL) {
  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server successfully started on http://localhost:${PORT}`);
  });
}
