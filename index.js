require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY;


const PORT = 3005;
let db1, db2;
let bookingCollectionObj, usersCollectionObj, ordersCollection, cartCollectionObj, wishListCollectionObj, productsCollectionObj;

app.use(express.json());
app.use(cors({ origin: '*' }));

const uri = 'mongodb+srv://charan333gt:dxIFPPQ3MDGcc4DZ@cluster0.ezgqv.mongodb.net/';
const client = new MongoClient(uri);


const axios = require('axios');

async function callApi() {
  try {
    const response = await axios.get('https://bookingsapi-wxkr.onrender.com/bookings');
    // console.log('API Response:', response.data);
  } catch (error) {
    console.error('Error calling API:', error);
  }
}

setInterval(callApi, 840000);

callApi();


client.connect()
  .then((client) => {
    db1 = client.db('MovieBookingDB');
    bookingCollectionObj = db1.collection('bookings');
    usersCollectionObj = db1.collection('users');
    db2 = client.db('ZenmartDB');
    usersCollectionObj = db2.collection('users');
    ordersCollection = db2.collection('orders');
    cartCollectionObj = db2.collection('cart');
    wishListCollectionObj = db2.collection('wishlist');
    productsCollectionObj = db2.collection('products');
    console.log('Connected to MongoDB database');
  })
  .catch((error) => {
    console.error('Error connecting to the database:', error);
  });

// GET Endpoint: Fetch all bookings
app.get('/bookings', async (req, res) => {
  try {
    const bookings = await bookingCollectionObj.find().toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

// POST Endpoint: Create a new booking
app.post('/bookings', async (req, res) => {
  const { userid, date, slotid, movieId, seatid, theatreId } = req.body;

  // Validation
  if (!userid || !date || !slotid || !movieId || !seatid || !theatreId) {
    res.status(400).send({ message: 'All fields are required' });
    return;
  }

  try {
    const result = await bookingCollectionObj.insertOne({ userid, date, slotid, movieId, seatid, theatreId });
    res.status(201).json({ id: result.insertedId, userid, date, slotid, movieId, seatid, theatreId });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

// ////get booked seats for particular date,movie,theatre,slot
// app.get('/bookings/:activemovie/:date/:slotId/:theatreid', async (req, res) => {
//   try {
//     const { activemovie, date, slotId, theatreid } = req.params;
//     const query = { movieid: activemovie, date, slotid: slotId, theatreId: theatreid };
    
//     const bookings = await Booking.find(query);
//     res.json(bookings);
//   } catch (error) {
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// GET Endpoint: Fetch bookings for a specific user
app.get('/bookings/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const bookings = await bookingCollectionObj.find({ userid: userId }).toArray();
    if (bookings.length === 0) {
      res.status(404).send({ message: 'No bookings found for the given user' });
      return;
    }
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

// GET Endpoint: Fetch bookings based on movieId, date, slotId, seatId, and theatreId
app.get('/bookings/filter', async (req, res) => {
  const { movieid, date, slotid, seatid, theatreid } = req.query;

  let filter = {};

  if (movieid) filter.movieId = movieid;
  if (date) filter.date = date;
  if (slotid) filter.slotid = slotid;
  if (seatid) filter.seatid = seatid;
  if (theatreid) filter.theatreId = theatreid;

  try {
    const bookings = await bookingCollectionObj.find(filter).toArray();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});


///users
app.get('/users', async (req, res) => {
  try {
    const users = await usersCollectionObj.find().toArray();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


//__________________________________________________________________________

// User Registration
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await usersCollectionObj.insertOne({ username, email, password: hashedPassword });
    const token = jwt.sign({ id: result.insertedId, username }, SECRET_KEY, { expiresIn: '30d' });
    res.status(201).json({id: result.insertedId, message: 'Account created successfully', jwt_token: token });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Error creating account' });
  }
});


app.post('/api/login', async (req, res) => {
  console.log("Received Request Body:", req.body);  // Debugging

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ message: "Invalid JSON format" });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await usersCollectionObj.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY, { expiresIn: '30d' });

    return res.status(200).json({
      id: user._id,
      message: 'Login successful',
      jwt_token: token
    });
  } catch (err) {
    console.error('Error logging in:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});








//_______________________________________________________________________


// Place an order
app.post('/api/orders', async (req, res) => {
  const { user_id, product_ids, total_cost, address } = req.body;

  if (!user_id || !product_ids || !total_cost || !address) {
    return res.status(400).json({ error: 'Missing required fields: user_id, product_ids, total_cost, or address' });
  }

  try {
    const result = await ordersCollection.insertOne({
      user_id,
      product_ids,
      total_cost,
      address,
      order_date: new Date()
    });
    res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get orders by user ID
app.get('/api/orders/:user_id', async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ error: 'Invalid or missing user_id' });
  }

  try {
    const orders = await ordersCollection.find({ user_id }).sort({ order_date: -1 }).toArray();
    if (orders.length === 0) {
      return res.status(200).json({ message: 'No orders found.' });
    }
    res.status(200).json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// Clear all orders (admin-level operation)
app.delete('/api/orders', async (req, res) => {
  try {
    const result = await ordersCollection.deleteMany({});
    res.status(200).json({ message: 'All orders cleared', result });
  } catch (err) {
    console.error('Error clearing orders:', err);
    res.status(500).json({ error: 'Failed to clear orders' });
  }
});




//___________________________________________________________________________________________



// 1. GET all products with filtering and sorting
app.get("/api/products", async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "price", sortOrder = "asc", category, title_search, rating } = req.query;

    // Build the filters object dynamically based on the query parameters
    const filters = {};

    // Filter by category
    if (category) {
      filters.category = category;
    }

    // Filter by title search (case-insensitive)
    if (title_search) {
      filters.title = { $regex: new RegExp(title_search, "i") }; // Case-insensitive regex search
    }

    // Filter by rating
    if (rating) {
      filters.rating = { $gte: Number(rating) }; // Assume rating is a numeric value
    }

    // Set up pagination and sorting
    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Query the products collection
    const products = await productsCollectionObj.find(filters)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort)
      .toArray();

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    // Send the response
    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});



// 2. POST multiple new products
app.post("/api/products", async (req, res) => {
  try {
      const products = await productsCollectionObj.insertMany(req.body);
      res.status(201).json({ message: "Products added", products });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// 3. UPDATE a product by ID


app.put("/api/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const result = await productsCollectionObj.updateOne(
      { _id: new ObjectId(productId) }, // Convert string ID to ObjectId
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE a product by ID
app.delete("/api/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const result = await productsCollectionObj.deleteOne({ _id: new ObjectId(productId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. GET a product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await productsCollectionObj.findOne({ _id: new ObjectId(productId) });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



//_______________________________________________________________________




// 1️⃣ Add product to cart (If exists, increase quantity)
// 1️⃣ Add product to cart (If exists, increase quantity)
app.post("/api/cart", async (req, res) => {
  const { user_id, product_id, title, product_image, quantity, price } = req.body;

  if (!user_id || !product_id || !quantity || !price) {
    return res.status(400).json({ error: "Missing required fields: user_id, product_id, quantity, or price" });
  }

  try {
    const existingItem = await cartCollectionObj.findOne({ user_id: parseInt(user_id), product_id });

    if (existingItem) {
      await cartCollectionObj.updateOne(
        { _id: existingItem._id },
        { $inc: { quantity } }
      );
      return res.status(200).json({ message: "Product quantity updated", cartItem: { ...existingItem, quantity: existingItem.quantity + quantity } });
    }

    const newCartItem = {
      user_id: parseInt(user_id),
      product_id,
      title,
      product_image,
      quantity,
      price,
      added_at: new Date()
    };

    const result = await cartCollectionObj.insertOne(newCartItem);
    if (!result.insertedId) {
      return res.status(500).json({ error: "Failed to add product to cart" });
    }

    res.status(201).json({ message: "Product added to cart", cartItem: newCartItem });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product to cart" });
  }
});


app.get("/api/cart/:user_id", async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id);
    const cartItems = await cartCollectionObj.find({ user_id: userId }).toArray();

    if (cartItems.length === 0) {
      return res.status(200).json({ message: "No items in cart" });
    }

    res.status(200).json(cartItems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cart items" });
  }
});


app.delete("/api/cart/:id", async (req, res) => {
  try {
    const itemId = new ObjectId(req.params.id);
    const result = await cartCollectionObj.deleteOne({ _id: itemId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    res.status(200).json({ message: "Product removed from cart" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove product from cart" });
  }
});



app.put("/api/cart/:id", async (req, res) => {
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid quantity. Quantity must be greater than zero." });
  }

  try {
    const cartId = new ObjectId(req.params.id); // Convert string to ObjectId
    console.log("Updating cart item with ID:", cartId); // Debugging

    const updatedItem = await cartCollectionObj.findOneAndUpdate(
      { _id: cartId },
      { $set: { quantity } },
      { returnDocument: "after" } // Ensure updated value is returned
    );
    console.log(updatedItem)
    if (!updatedItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    res.status(200).json({ message: "Quantity updated successfully", cartItem: updatedItem.value });
  } catch (err) {
    console.error("Error updating quantity:", err);
    res.status(500).json({ error: "Failed to update quantity" });
  }
});


app.delete("/api/cart/user/:user_id", async (req, res) => {
  const userId = parseInt(req.params.user_id);

  if (!userId) {
    return res.status(400).json({ error: "Invalid or missing user_id" });
  }

  try {
    const result = await cartCollectionObj.deleteMany({ user_id: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No products found in cart for this user" });
    }

    res.status(200).json({ message: "All products removed from cart" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear cart" });
  }
});


app.delete("/api/cart", async (req, res) => {
  try {
    await cartCollectionObj.deleteMany({});
    res.status(200).json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear cart" });
  }
});


app.get("/api/cart/:user_id/:product_id", async (req, res) => {
  let { user_id, product_id } = req.params;
  console.log("Received params:", { user_id, product_id });

  try {
    const query = {
      user_id: parseInt(user_id), // Ensure integer user_id
      product_id: parseInt(product_id) // Use as string unless stored as ObjectId
    };
    const cartItem = await cartCollectionObj.findOne(query);
    if (!cartItem) {
      return res.status(404).json({ message: "Product not found in cart" });
    }
    res.status(200).json(cartItem);
  } catch (err) {
    console.error("Error fetching cart item:", err);
    res.status(500).json({ error: "Failed to fetch cart item" });
  }
});




// __________________________________________________________________________



// Add item to wishlist
app.post('/api/wishlist', async (req, res) => {
  const { user_id, product_id, title, price, product_image } = req.body;
  
  // Validate required fields
  if (!user_id || !product_id || !title || !price || !product_image) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if product is already in the wishlist
    const existingItem = await wishListCollectionObj.findOne({ user_id, product_id });

    if (existingItem) {
      // Update existing wishlist item
      await wishListCollectionObj.updateOne(
        { user_id, product_id },
        { $set: { title, price, product_image } }
      );
      return res.status(200).json({ message: "Product updated in wishlist" });
    }

    // Add new item to wishlist
    const newItem = {
      user_id,
      product_id,
      title,
      price,
      product_image,
    };

    await wishListCollectionObj.insertOne(newItem);
    res.status(201).json({ message: "Product added to wishlist", newItem });
  } catch (err) {
    console.error("Error adding product to wishlist:", err);
    res.status(500).json({ error: "Failed to add product to wishlist" });
  }
});


// Get all items in the wishlist for a specific user
app.get('/api/wishlist/:user_id', async (req, res) => {
  let userId = req.params.user_id; // Get user_id from URL parameters
  console.log(userId)

  if (!userId) {
    return res.status(400).json({ error: 'Invalid or missing user_id' });
  }

  try {
    // Ensure `user_id` is stored in the correct data type (e.g., Number)
    

    // Fetch wishlist items
    const wishlistItems = await wishListCollectionObj.find({ user_id: userId }).toArray(); // Convert cursor to array

    if (wishlistItems.length === 0) {
      return res.status(200).json({ message: 'No items in wishlist' });
    }

    return res.status(200).json(wishlistItems); // Send the results as JSON response
  } catch (err) {
    console.error('Error fetching wishlist items:', err);
    return res.status(500).json({ error: 'Failed to fetch wishlist items' });
  }
});


// Remove an item from wishlist
app.delete('/api/wishlist-item/:id', async (req, res) => {
  try {
    const itemId = req.params.id;

    if (!ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const result = await wishListCollectionObj.deleteOne({ _id: new ObjectId(itemId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(200).json({ message: 'Product removed from wishlist' });
  } catch (err) {
    console.error('Error removing product from wishlist:', err);
    res.status(500).json({ error: 'Failed to remove product from wishlist' });
  }
});

// Clear the entire wishlist for a user
// Clear the entire wishlist for a user



app.delete('/api/wishlist/:user_id', async (req, res) => {
  const userId = req.params.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'Invalid or missing user_id' });
  }

  try {
    // Convert userId to an integer (if it's not already)
    const userIdentifier = parseInt(userId);

    // Check if the conversion resulted in a valid integer
    if (isNaN(userIdentifier)) {
      return res.status(400).json({ error: 'Invalid user_id format. Expected an integer.' });
    }

    // Perform the delete operation using the integer user_id
    const result = await wishListCollectionObj.deleteMany({ user_id: userIdentifier });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No items found to clear' });
    }

    res.status(200).json({ message: 'Wishlist cleared', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error clearing the wishlist:', err);
    res.status(500).json({ error: 'Failed to clear wishlist' });
  }
});


