import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ucyzrcm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let expensesCollection;

// Connect to MongoDB
async function run() {
  try {
    await client.connect();
    const db = client.db("expenseTracker"); // Database name
    expensesCollection = db.collection("expenses"); // Collection name
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}
run().catch(console.dir);

// ==================== Routes ====================

// GET all expenses
app.get("/expenses", async (req, res) => {
  try {
    const expenses = await expensesCollection.find({}).sort({ date: -1 }).toArray();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /expenses?category=Food&start=2025-08-01&end=2025-08-15
app.get("/expenses", async (req, res) => {
  const { category, start, end } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (start || end) filter.date = {};
  if (start) filter.date.$gte = new Date(start);
  if (end) filter.date.$lte = new Date(end);

  const expenses = await Expense.find(filter).sort({ date: -1 });
  res.json(expenses);
});


// POST new expense
app.post("/expenses", async (req, res) => {
  try {
    const { title, amount, category, date } = req.body;

    // Validation
    if (!title || title.length < 3) {
      return res.status(400).json({ error: "Title is required and must be at least 3 characters." });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Amount is required and must be greater than 0." });
    }
    if (!date || isNaN(new Date(date))) {
      return res.status(400).json({ error: "Valid date is required." });
    }

    const expense = {
      title,
      amount: Number(amount),
      category: category || "Others",
      date: new Date(date),
    };

    const result = await expensesCollection.insertOne(expense);
    res.status(201).json({ _id: result.insertedId, ...expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/expenses/:id", async (req, res) => {
  const { id } = req.params;
  const { title, amount, category, date } = req.body;
  console.log("this is id", id)

  // Validation
  if (!title || title.length < 3) return res.status(400).json({ error: "Title invalid" });
  if (!amount || amount <= 0) return res.status(400).json({ error: "Amount invalid" });
  if (!date) return res.status(400).json({ error: "Date required" });

  const expensesCollection = client.db("expenseTracker").collection("expenses");

  try {
    // ✅ Convert string id to ObjectId
    const objectId = new ObjectId(id);
    console.log("object ID", objectId);
    
    const result = await expensesCollection.updateOne(
      { _id: objectId },
      { $set: { title, amount, category, date } }
    );
    console.log("result", result);
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ message: "Expense updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// DELETE expense
app.delete("/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await expensesCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Expense not found." });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
