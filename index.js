const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
var jwt = require("jsonwebtoken");

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
const userCollection = client.db("peakBook").collection("allUser");
const bookCategoriesCollection = client.db("peakBook").collection("categories");
const singleBookCategoriesCollection = client
  .db("peakBook")
  .collection("bookCategories");
const buyingBookCollection = client.db("peakBook").collection("buyingBook");

async function run() {
  try {
    await client.connect();
    console.log("Database Connected".yellow);
  } catch (error) {
    console.log(error.name.bgRed, error.message.bold, error.stack);
  }
}
run();

// JWT Verification Function
function verifyJWT(req, res, next) {
  console.log("Token Inside JWt", req.headers.authorization);
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

// NOTE: Make sure you use VerifyAdmin after VerifyJWT
const verifyAdmin = async (req, res, next) => {
  console.log("Inside verifyAdmin", req.decoded.email);
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await userCollection.findOne(query);

  if (user?.role !== "Admin") {
    return res.status(403).send({ message: "Forbidden Access" });
  }
  next();
};
//Get Buying books data using query
app.get("/buyingBooks", async (req, res) => {
  const email = req.query.email;

  const query = { email: email };
  const buyingBooks = await buyingBookCollection.find(query).toArray();
  res.send(buyingBooks);
});

//Get All User From MongoDb & send Client
app.get("/users", async (req, res) => {
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

//Get All Sellers Data from mongoDb
app.get("/users/sellers", async (req, res) => {
  const query = { role: "Seller" };
  const sellers = await userCollection.find(query).toArray();
  res.send(sellers);
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
  const books = await singleBookCategoriesCollection.find(query).toArray();
  res.send(books);
});

//Get Book categories by Id data from mongoDb & send to client
app.get("/category/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { category_id: id };
    const bookCategory = await singleBookCategoriesCollection
      .find(query)
      .toArray();
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
app.post("/users", async (req, res) => {
  try {
    const user = await userCollection.insertOne(req.body);
    console.log(user);
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
  const result = await singleBookCategoriesCollection.insertOne(book);
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

// //Update user(Admin) role for authorization & send to mongoDB
// app.put("/users/admin/:id", verifyAdmin, async (req, res) => {
//   const id = req.params.id;
//   const filter = { _id: ObjectId(id) };
//   const options = { upsert: true };
//   const updatedDoc = {
//     $set: {
//       role: "admin",
//     },
//   };
//   const result = await userCollection.updateOne(filter, updatedDoc, options);
//   res.send(result);
// });

//Generate Token to user Access
app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const user = await userCollection.findOne({ email: email });
  if (user) {
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
      expiresIn: "30d",
    });
    return res.send({ accessToken: token });
  }
  res.status(403).send({ accessToken: "" });
});

app.get("/", async (req, res) => {
  res.send("Peak Book Server is Running ");
});

app.listen(port, () =>
  console.log(`Peak Book server is running on Port: ${port}`)
);
