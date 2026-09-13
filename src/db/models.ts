// Data models for PriceWise catalog & price sync

export interface IProduct {
  _id: string;
  name: string;
  barcode: string;
  image_url: string;
  category: string;
  created_at?: Date;
}

export interface IPrice {
  _id: string;
  productId: string;
  supermarketName: string;
  price: number;
  lastUpdated: Date;
}

// In-memory / storage collection handlers
const productsCollection: IProduct[] = [];
const pricesCollection: IPrice[] = [];

export const ProductModel = {
  find: async (query?: { barcode?: string }) => {
    if (!query) return [...productsCollection];
    if (query.barcode) {
      return productsCollection.filter(p => p.barcode === query.barcode);
    }
    return [...productsCollection];
  },
  create: async (data: Omit<IProduct, '_id'>) => {
    const newProduct: IProduct = {
      _id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      created_at: new Date()
    };
    productsCollection.push(newProduct);
    return newProduct;
  }
};

export const PriceModel = {
  find: async (query?: { productId?: string | { $in?: string[] }; supermarketName?: string }) => {
    if (!query) return [...pricesCollection];
    return pricesCollection.filter(p => {
      if (query.productId) {
        if (typeof query.productId === 'string') {
          if (p.productId !== query.productId) return false;
        } else if (query.productId.$in && Array.isArray(query.productId.$in)) {
          if (!query.productId.$in.includes(p.productId)) return false;
        }
      }
      if (query.supermarketName && p.supermarketName !== query.supermarketName) return false;
      return true;
    });
  },
  create: async (data: Omit<IPrice, '_id'>) => {
    const newPrice: IPrice = {
      _id: `price_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...data,
    };
    pricesCollection.push(newPrice);
    return newPrice;
  }
};
