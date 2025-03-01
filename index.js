require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");


const SECRET_KEY = process.env.SECRET_KEY;


const PORT = 3005;
let db1, db2,db3;
let bookingCollectionObj, usersCollectionObj, usersCollectionObj_GrapherHire, ordersCollection, cartCollectionObj, wishListCollectionObj, productsCollectionObj,UnionDBCollectionObj;

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
    //usersCollectionObj_Zenmart = db2.collection('users'); // ✅ Store ZenmartDB users separately

    db2 = client.db('ZenmartDB');
    usersCollectionObj = db2.collection('users');
    //usersCollectionObj_Zenmart = db2.collection('users'); // ✅ Store ZenmartDB users separately
    ordersCollection = db2.collection('orders');
    cartCollectionObj = db2.collection('cart');
    wishListCollectionObj = db2.collection('wishlist');
    productsCollectionObj = db2.collection('products');

    db3 = client.db('GrapherHireDB');
    usersCollectionObj_GrapherHire = db3.collection('users');
    UnionDBCollectionObj = db3.collection('UnionDB');

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



const client = require("./config/redisClient"); // Import Redis client

app.get("/api/products", async (req, res) => {
  try {
    const { page = 1, limit = 100, sortBy = "PRICE_HIGH", category, title_search, rating } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (title_search) filters.$text = { $search: title_search }; // Faster search using text index
    if (rating && !isNaN(rating)) filters.rating = { $gte: parseFloat(rating) };

    const sortOptions = {
      PRICE_HIGH: { price: -1 },
      PRICE_LOW: { price: 1 },
      RATING_HIGH: { rating: -1 },
      RATING_LOW: { rating: 1 },
      RELEVANT: { score: { $meta: "textScore" } }
    };
    const sort = sortOptions[sortBy] || { price: -1 };
    const skip = (Number(page) - 1) * Number(limit);

    // 🔹 Check Redis Cache First
    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("✅ Cache Hit");
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 🔹 Fetch from MongoDB
    const products = await productsCollectionObj.find(filters)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort)
      .toArray();

    // 🔹 Store in Redis Cache (Expires in 1 Hour)
    await client.setex(cacheKey, 3600, JSON.stringify(products));

    res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});


//___________________________________________________________________________________
app.get('/api/fix-products-data', async (req, res) => {
  try {
    const result = await productsCollectionObj.updateMany(
      { 
        price: { $type: "string" }, 
        rating: { $type: "string" } 
      }, // Only update if they are strings
      [
        { 
          $set: { 
            price: { $toDouble: "$price" },  // ✅ Convert price to Double (decimal)
            rating: { $toDouble: "$rating" } // ✅ Convert rating to Double (decimal)
          } 
        }
      ]
    );

    res.json({ message: `Updated ${result.modifiedCount} products` });
  } catch (error) {
    console.error('Error updating product data types:', error);
    res.status(500).json({ error: 'Failed to update products' });
  }
});


//______________________________________________________________________________




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
  console.log(typeof(userId),userId,"-")

  if (!userId) {
    return res.status(400).json({ error: 'Invalid or missing user_id' });
  }

  try {
    // Fetch wishlist items
    const wishlistItems = await wishListCollectionObj.find({ user_id: userId }).toArray(); 

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
//___________________________________________________________________________________

// User Registration
app.post('/apigh/register', async (req, res) => {
  const { name, email, password, mobile, district, unionId, role, organizationName, typeOfGrapher } = req.body;
  
  if (!name || !email || !password || !mobile || !district || !unionId || !role) {
      return res.status(400).json({ message: 'All fields are required' });
  }
  
  try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
          name,
          email,
          password: hashedPassword,
          mobile,
          district,
          unionId,
          role,
          organizationName: role === 'organizer' ? organizationName : null,
          typeOfGrapher: role === 'grapher' ? typeOfGrapher : null
      };
      console.log(newUser)
      
      const result = await usersCollectionObj_GrapherHire.insertOne(newUser);
      
      const token = jwt.sign({ id: result.insertedId, name, role }, SECRET_KEY, { expiresIn: '30d' });
      
      res.status(201).json({
          id: result.insertedId,
          role,
          message: 'Account created successfully',
          jwt_token: token
      });
  } catch (err) {
      console.error('Error registering user:', err);
      res.status(500).json({ message: 'Error creating account' });
  }
});


// User Login
app.post('/apigh/login', async (req, res) => {
  console.log("Received Request Body:", req.body);

  if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: "Invalid JSON format" });
  }

  const { mobile, password } = req.body;

  if (!mobile || !password) {
      return res.status(400).json({ message: 'Mobile and password are required' });
  }

  try {
      const user = await usersCollectionObj_GrapherHire.findOne({ mobile: mobile });

      if (!user) {
          return res.status(401).json({ message: 'Invalid mobile number or password' });
      }

      console.log("Stored Hashed Password:", user.password);
      console.log("Entered Password:", password);

      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password Match:", isMatch);

      if (!isMatch) {
          return res.status(401).json({ message: 'Invalid mobile number or password' });
      }

      const token = jwt.sign({ id: user._id, name:user.name, role: user.role }, SECRET_KEY, { expiresIn: '30d' });

      return res.status(200).json({
          id: user._id,
          role: user.role,
          name:user.name,
          message: 'Login successful',
          jwt_token: token
      });
  } catch (err) {
      console.error('Error logging in:', err);
      return res.status(500).json({ message: 'Internal server error' });
  }
});








//_______________________________________________________________________________________________


// Fetch users by role
app.get("/api/users/:role", async (req, res) => {
  try {
      const { role } = req.params;
      console.log(role)
      const users = await usersCollectionObj_GrapherHire.find({ role }).toArray(); // Convert cursor to array
      res.status(200).json(users);
  } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ message: "Server Error", error });
  }
});


//______________________________________________________________________________________---

// Fetch members from UnionDBCollectionObj
app.get('/api/members', async (req, res) => {
  const { unionId, mobile } = req.query;
  console.log(unionId,mobile)
  if (!unionId || !mobile) {
      return res.status(400).json({ message: 'Union ID and mobile are required' });
  }
  console.log("Querying MongoDB with:", { UnionId: typeof(unionId), Mobile: typeof(mobile) });

  try {
      const member = await UnionDBCollectionObj.findOne({ UnionId:unionId, Mobile:  mobile });
      
      if (!member) { 
          return res.status(404).json({ message: 'Member not found' });
      }
      
      res.status(200).json(member);
  } catch (err) {
      console.error('Error fetching member:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
});

//_______________________________________________________________--

// Booking Request API
// Booking Request API
app.post('/api/bookings/request', async (req, res) => {
  const { grapherId, organizerName, date } = req.body;

  if (!grapherId || !organizerName || !date) {
      return res.status(400).json({ message: "All fields are required" });
  }

  try {
      const grapher = await usersCollectionObj_GrapherHire.findOne({ _id: new ObjectId(grapherId), role: "grapher" });

      if (!grapher) {
          return res.status(404).json({ message: "Grapher not found" });
      }

      // Generate a unique ID for the request
      const requestId = new ObjectId();

      // Add the booking request to the grapher's request list with an ID
      await usersCollectionObj_GrapherHire.updateOne(
          { _id: new ObjectId(grapherId) },
          { $push: { requests: { _id: requestId, organizerName, date } } }
      );

      res.status(200).json({ message: "Booking request sent successfully", requestId });

  } catch (error) {
      console.error("Error processing booking request:", error);
      res.status(500).json({ message: "Internal server error" });
  }
});

//_____________________________________________________________

// Fetch job requests for a specific grapher
app.get('/api/grapher/job-requests', async (req, res) => {
  const { grapherId } = req.query;
  if (!grapherId) {
      return res.status(400).json({ message: 'Grapher ID is required' });
  }
  try {
      const grapher = await usersCollectionObj_GrapherHire.findOne({ _id: new ObjectId(grapherId) });
      if (!grapher) {
          return res.status(404).json({ message: 'Grapher not found' });
      }
      res.status(200).json(grapher.requests || []);
  } catch (err) {
      console.error('Error fetching job requests:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
});

//_______________________________________________________________________________

// Handle job response (Accept/Reject)
app.post('/api/grapher/job-response', async (req, res) => {
  const { id, status } = req.body;
  const grapherId = req.headers['grapher-id']; // Get grapher ID from request header

  if (!id || !status || !grapherId) {
      return res.status(400).json({ message: "Job ID, status, and grapher ID are required" });
  }

  try {
      // Find the grapher in the database
      const grapher = await usersCollectionObj_GrapherHire.findOne({ _id: new ObjectId(grapherId) });
      if (!grapher) {
          return res.status(404).json({ message: "Grapher not found" });
      }

      // Find the job request by ID
      const jobRequest = grapher.requests.find(request => request._id.toString() === id);
      if (!jobRequest) {
          return res.status(404).json({ message: "Job request not found" });
      }

      const { organizerName, date } = jobRequest;
      console.log(organizerName)
      

      // Find the organizer in the database
      const organizer = await usersCollectionObj_GrapherHire.findOne({ name: organizerName });
      if (!organizer) {
          return res.status(404).json({ message: "Organizer not found" });
      }
      

      if (status === "accepted") {
          // Add booking details to the organizer's data
          await usersCollectionObj_GrapherHire.updateOne(
              { _id: new ObjectId(organizer._id) },
              { $push: { bookings: { id: new ObjectId(id), date, grapher: grapher.name } } }
          );

          // Add confirmed job to the grapher's data
          await usersCollectionObj_GrapherHire.updateOne(
              { _id: new ObjectId(grapherId) },
              { $push: { confirmedJobs: { id: new ObjectId(id), date, organizer: organizer.organizationName } } }
          );
      }
      console.log(organizer)
      // Remove the job request from the grapher's list
      await usersCollectionObj_GrapherHire.updateOne(
          { _id: new ObjectId(grapherId) },
          { $pull: { requests: { _id: new ObjectId(id) } } }
      );

      res.status(200).json({ message: `Job request ${status} successfully` });
  } catch (err) {
      console.error("Error handling job response:", err);
      res.status(500).json({ message: "Internal server error" });
  }
});


//________________________________________________________________


// Fetch upcoming bookings for a specific grapher
app.get('/api/grapher/bookings', async (req, res) => {
  const grapherId = req.headers['grapher-id'];
  if (!grapherId) {
      return res.status(400).json({ message: 'Grapher ID is required' });
  }
  try {
      const grapher = await usersCollectionObj_GrapherHire.findOne({ _id: new ObjectId(grapherId) });
      if (!grapher) {
          return res.status(404).json({ message: 'Grapher not found' });
      }
      res.status(200).json(grapher.confirmedJobs || []);
  } catch (err) {
      console.error('Error fetching bookings:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
});



//_________________________________________________________________

app.get('/api/organizer/booked-graphers', async (req, res) => {
  console.log("Received Headers:", req.headers); // Debugging
  const organizerName = req.headers['organizer-name']; // Retrieve organizer name

  if (!organizerName) {
      return res.status(400).json({ message: "Organizer name is required" });
  }

  console.log("Organizer Name:", organizerName.replace(/^"|"$/g, ''));

  try {
      const organizer = await usersCollectionObj_GrapherHire.findOne({
          name: organizerName.replace(/^"|"$/g, ''),
          role: "organizer"
      });

      if (!organizer) {
          return res.status(404).json({ message: "Organizer not found" });
      }

      res.status(200).json(organizer.bookings || []);
  } catch (err) {
      console.error("Error fetching booked photographers:", err);
      res.status(500).json({ message: "Internal server error" });
  }
});

//______________________________________________________________________--

// Fetch booked dates for a specific grapher
app.get('/api/:grapherId/booked-dates', async (req, res) => {
  const { grapherId } = req.params;
  if (!grapherId) {
      return res.status(400).json({ message: 'Grapher ID is required' });
  }
  try {
      const grapher = await usersCollectionObj_GrapherHire.findOne({ _id: new ObjectId(grapherId) });
      if (!grapher) {
          return res.status(404).json({ message: 'Grapher not found' });
      }
      const bookedDates = grapher.confirmedJobs?.map(job => job.date) || [];
      res.status(200).json(bookedDates);
  } catch (err) {
      console.error('Error fetching booked dates:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
});

//________________________________________________________________

// Add Photographer's Portfolio and Instagram
// Add Photographer's Portfolio and Instagram
app.post('/api/grapher/update', async (req, res) => {
  const { grapherId, portfolio, instagram } = req.body;
  
  if (!grapherId) {
      return res.status(400).json({ message: 'Grapher ID is required' });
  }

  try {
      const objectId = new ObjectId(grapherId);

      // Ensure the fields exist as arrays
      await usersCollectionObj_GrapherHire.updateOne(
          { _id: objectId },
          {
              $setOnInsert: { portfolio: [], instagram: [] }
          },
          { upsert: true }
      );

      // Prepare update fields
      const updateFields = {};
      if (portfolio) updateFields.portfolio = portfolio;
      if (instagram) updateFields.instagram = instagram;

      // Update Grapher's profile
      const updatedGrapher = await usersCollectionObj_GrapherHire.findOneAndUpdate(
          { _id: grapherId },
          { 
              $push: {
                  ...(portfolio ? { portfolio: portfolio } : {}),
                  ...(instagram ? { instagram: instagram } : {})
              }
          },
          { returnDocument: 'after' }
      );

      if (!updatedGrapher.value) {
          return res.status(404).json({ message: 'Grapher not found' });
      }

      res.status(200).json(updatedGrapher.value);
  } catch (err) {
      console.error('Error updating profile:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
});



//___________________________________________________________________

// Fetch Photographer's Profile
app.get('/api/grapher/profile', async (req, res) => {
  const { grapherId } = req.query;
  if (!grapherId) {
      return res.status(400).json({ message: 'Grapher ID is required' });
  }
  try {
      const grapher = await usersCollectionObj_GrapherHire.findOne({ _id: new ObjectId(grapherId) });
      if (!grapher) {
          return res.status(404).json({ message: 'Grapher not found' });
      }
      res.status(200).json(grapher);
  } catch (err) {
      console.error('Error fetching profile:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
});

//_________________________________________________________________________________________

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL, // Your Gmail
    pass: process.env.PASSWORD, // Your App Password
  },
});

// Contact form route
app.post("/send", async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: email,
    to: process.env.EMAIL, // Your Email
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Email not sent" });
  }
});

