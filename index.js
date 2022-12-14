const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
console.log(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 4500;
const app = express();

//MiddleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ypkp6ia.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// JWT Verification Function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized Access");
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

const userCollection = client.db("peakBook").collection("allUser");
const bookCategoriesCollection = client.db("peakBook").collection("categories");
const booksCollection = client.db("peakBook").collection("bookCategories");
const buyingBookCollection = client.db("peakBook").collection("buyingBook");
const paymentsCollection = client.db("peakBook").collection("payments");

async function run() {
  try {
    await client.connect();
    console.log("Database Connected".yellow);
  } catch (error) {
    console.log(error.name.bgRed, error.message.bold, error.stack);
  }
}
run();

/* ====================
Verify All Users Function Start
=======================*/

// Verify Admin from mongo db
const verifyAdmin = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await userCollection.findOne(query);

  if (user?.role !== "Admin") {
    return res.status(403).send({ message: "Forbidden Access" });
  }
  next();
};

// Verify Seller from mongoDB
const verifySeller = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await userCollection.findOne(query);

  if (user?.role !== "Seller") {
    return res.status(403).send({ message: "Forbidden Access" });
  }
  next();
};

/* ====================
Verify All Users Function Start
=======================*/

//Get Buying books data using query
app.get("/buyingBooks", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const buyingBooks = await buyingBookCollection.find(query).toArray();
  res.send(buyingBooks);
});

app.get("/payment/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const query = { _id: ObjectId(id) };
  const buyingBooks = await buyingBookCollection.findOne(query);
  res.send(buyingBooks);
});

//Get Buying books data using query
app.get("/my-products", async (req, res) => {
  const query = { seller_email: req.query.email };
  const myProducts = await booksCollection.find(query).toArray();
  res.send(myProducts);
});

// //get the advertised products and make sure the product is available
app.get("/advertised-products", async (req, res) => {
  try {
    const query = {
      $and: [
        {
          advertise: true,
        },
        {
          salesStatus: false,
        },
      ],
    };
    const adsProducts = await booksCollection.find(query).toArray();
    res.send({
      status: true,
      adsProducts,
    });
  } catch (error) {
    res.send({
      status: false,
      error: error.message,
    });
  }
});

//Product Sale status  set on MongoDB
app.put("/my-products/:id", async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      salesStatus: status,
    },
  };
  const result = await booksCollection.updateOne(filter, updatedDoc, options);
  console.log(result);
  res.send(result);
});

//Advertise  product set on MongoDB
app.put("/my-products/ad/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      advertise: true,
    },
  };
  const result = await booksCollection.updateOne(filter, updatedDoc, options);
  res.send(result);
});

// Get reported product from mongoDB & sent client
app.get("/reported-products", async (req, res) => {
  const query = { reported: true };
  const reportedBook = await booksCollection.find(query).toArray();
  res.send(reportedBook);
});

//Reported  product set on MongoDB
app.put("/reported-product/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      reported: true,
    },
  };
  const result = await booksCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

//Get All User From MongoDb & send Client
app.get("/users", verifyJWT, async (req, res) => {
  try {
    const query = {};
    const users = await userCollection.find(query).toArray();
    res.send({
      status: true,
      users,
    });
  } catch {
    res.send({
      status: false,
      error: error,
    });
  }
});

/* ====================
User Verification Start
=======================*/

//Get Admin from mongoDb
app.get("/users/admin/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await userCollection.findOne(query);
  res.send({ isAdmin: user?.role === "Admin" });
});

//Get seller from mongoDb
app.get("/users/seller/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await userCollection.findOne(query);
  res.send({
    isSeller: user?.role === "Seller",
    isSellerVerified: user?.isSellerVerified,
  });
});

//Get Buyer from mongoDb
app.get("/users/buyer/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await userCollection.findOne(query);
  res.send({ isBuyer: user?.role === "Buyer" });
});

/* ====================
User Verification Start
=======================*/

//Get All Sellers Data from mongoDb
app.get("/users/sellers", async (req, res) => {
  const query = { role: "Seller" };
  const sellers = await userCollection.find(query).toArray();
  res.send(sellers);
});

//make the seller verified //should be verifyAdmin
app.patch("/seller/:id", verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const status = req.body.status;
    console.log("inside", id, status);
    const query = { _id: ObjectId(id) };
    const updatedDoc = {
      $set: {
        isSellerVerified: status,
      },
    };
    const result = await userCollection.updateOne(query, updatedDoc);
    const bookResult = await booksCollection.updateOne(query, updatedDoc);

    res.send({
      status: true,
      message: `You have successfully verified the seller!`,
    });
  } catch (error) {
    res.send({
      status: false,
      error: error.message,
    });
  }
});

//Get All Buyers Data from mongoDb
app.get("/users/buyers", async (req, res) => {
  const query = { role: "Buyer" };
  const buyers = await userCollection.find(query).toArray();
  res.send(buyers);
});

//Get categories data from mongoDb & send to client
app.get("/categories", async (req, res) => {
  try {
    const query = {};
    const bookCategories = await bookCategoriesCollection.find(query).toArray();
    res.send({
      status: true,
      bookCategories,
    });
  } catch {
    res.send({
      status: false,
      error: error,
    });
  }
});

//Get All Book Data from MongoDB and send to Client
app.get("/bookCategories", async (req, res) => {
  const query = {};
  const books = await booksCollection.find(query).toArray();
  res.send(books);
});

//Get Book categories by Id data from mongoDb & send to client
app.get("/category/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $and: [
        {
          category_id: id,
        },
        {
          salesStatus: false,
        },
      ],
    };
    const bookCategory = await booksCollection.find(query).toArray();
    res.send({
      status: true,
      bookCategory,
    });
  } catch {
    res.send({
      status: false,
      error: error,
    });
  }
});

//Get Buying books data using query
app.get("/categories", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const decodedEmail = req.decoded.email;

  if (email !== decodedEmail) {
    return res.status(403).send({ message: "Forbidden Access" });
  }

  const query = { email: email };
  const buyingBooks = await buyingBookCollection.find(query).toArray();
  res.send(buyingBooks);
});

// Add User to MongoDB
app.post("/users", verifyJWT, async (req, res) => {
  try {
    const user = await userCollection.insertOne(req.body);
    res.send({
      status: true,
      message: `User successfully SignUp`,
    });
  } catch (error) {
    console.log(error.name, error.message);
    res.send({
      status: false,
      error: error,
    });
  }
});

// Post Buying Book data to MongoDb from client
app.post("/buyingBooks", async (req, res) => {
  const buyingBooks = req.body;
  const result = await buyingBookCollection.insertOne(buyingBooks);
  res.send(result);
});

//Add doctor data tp mongoDb & show it to the client
app.post("/bookCategories", async (req, res) => {
  const book = req.body;
  const result = await booksCollection.insertOne(book);
  res.send(result);
});

// Post Your payment to MongoDB
app.post("/create-payment-intent", async (req, res) => {
  const booking = req.body;
  const price = booking.bookPrice;
  const amount = price * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    currency: "usd",
    amount: amount,
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// Payment Collection Info
app.post("/payments", async (req, res) => {
  const payment = req.body;
  const result = await paymentsCollection.insertOne(payment);
  const id = payment.paymentId;
  const filter = { _id: ObjectId(id) };
  const updatedDoc = {
    $set: {
      salesStatus: true,
      transactionId: payment.transactionId,
    },
  };
  const updatedResult = await buyingBookCollection.updateOne(
    filter,
    updatedDoc
  );
  res.send(result);
});

// Save user email when user login with Google email
app.put("/user/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const user = req.body;
    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: user,
    };
    const result = await userCollection.updateOne(filter, updateDoc, options);

    // token generate
    const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
      expiresIn: "30d",
    });
    res.send({
      status: "success",
      message: "Token Created Successfully",
      data: token,
    });
  } catch (err) {
    console.log(err);
  }
});

//Update user(Admin) role for authorization & send to mongoDB
app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: "Admin",
    },
  };
  const result = await userCollection.updateOne(filter, updatedDoc, options);
  res.send(result);
});

//Update user(Admin) role for authorization & send to mongoDB
app.put("/users/seller/:id", verifyJWT, verifySeller, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: "Seller",
    },
  };
  const result = await userCollection.updateOne(filter, updatedDoc, options);
  res.send(result);
});

//Generate Token to user Access
app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user) {
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
      expiresIn: "30d",
    });
    return res.send({ accessToken: token });
  }
  res.status(403).send({ accessToken: "" });
});

// Post JWT Token
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
    expiresIn: "30d",
  });
  res.send({ token });
});

// delete the product from my-products route
app.delete("/my-products/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await booksCollection.deleteOne(query);
  res.send({
    ...result,
    status: true,
    message: "The product has been deleted",
  });
});

// Delete Users form MongoDB
app.delete("/user/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send({
    ...result,
    status: true,
    message: "The User has been deleted",
  });
});

// Delete Sellers form MongoDb
app.delete("/seller/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send({
    ...result,
    status: true,
    message: "The Seller has been deleted",
  });
});

// Delete Buyers form MongoDb
app.delete("/buyer/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send({
    ...result,
    status: true,
    message: "The Buyer has been deleted",
  });
});

// Delete Reported form MongoDB
app.delete("/reported-item/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await booksCollection.deleteOne(query);
  res.send({
    ...result,
    status: true,
    message: "The Book has been deleted",
  });
});

app.get("/", async (req, res) => {
  res.send("Peak Book Server is Running ");
});

app.listen(port, () =>
  console.log(`Peak Book server is running on Port: ${port}`)
);
