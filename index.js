const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
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

async function run() {
  try {
    await client.connect();
    console.log("Database Connected".yellow);
  } catch (error) {
    console.log(error.name.bgRed, error.message.bold, error.stack);
  }
}
run();

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

app.get("/", async (req, res) => {
  res.send("Peak Book Server is Running ");
});

app.listen(port, () =>
  console.log(`Peak Book server is running on Port: ${port}`)
);
