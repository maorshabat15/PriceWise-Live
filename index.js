import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();
app.use(cors());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;
let productsCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('pricewise');
    productsCollection = db.collection('products');
    console.log('Connected successfully to MongoDB Atlas');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  }
}
connectDB();

app.get('/', (req, res) => {
  res.send('PriceWise Supermarket API with MongoDB is running!');
});

app.get('/api/prices', async (req, res) => {
  const item = req.query.item;
  if (!item) {
    return res.status(400).json({ success: false, error: 'חסר שם מוצר לחיפוש (item)' });
  }

  const query = String(item).trim();
  console.log(`Searching MongoDB for: ${query}`);

  try {
    const results = await productsCollection
      .find({ name: { $regex: query, $options: 'i' } })
      .limit(5)
      .toArray();

    if (results && results.length > 0) {
      return res.json({
        success: true,
        query: item,
        count: results.length,
        products: results
      });
    }

    return res.json({
      success: true,
      query: item,
      count: 1,
      products: [
        {
          name: item,
          category: 'כללי',
          isEstimated: true,
          prices: [
            { chain: 'אושר עד', price: 11.90, note: 'הערכת שוק' },
            { chain: 'רמי לוי', price: 12.50, note: 'הערכת שוק' },
            { chain: 'יוחננוף', price: 12.90, note: 'הערכת שוק' },
            { chain: 'ויקטורי', price: 13.90, note: 'הערכת שוק' },
            { chain: 'שופרסל דיל', price: 14.90, note: 'הערכת שוק' }
          ]
        }
      ]
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: 'שגיאה בשליפת נתונים מ-MongoDB' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
