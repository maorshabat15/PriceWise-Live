import * as pako from 'pako';
import { XMLParser } from 'fast-xml-parser';

export interface GovChainInfo {
  id: string;
  name: string;
  code: string;
  url: string;
  color: string;
}

export const ISRAEL_GOV_CHAINS: GovChainInfo[] = [
  { id: 'shufersal', name: 'שופרסל (Shufersal)', code: '7290027600007', url: 'https://prices.shufersal.co.il/', color: '#ef4444' },
  { id: 'ramiLevy', name: 'רמי לוי (Rami Levy)', code: '7290058140886', url: 'https://url.publishedprices.co.il/', color: '#3b82f6' },
  { id: 'yohananof', name: 'יוחננוף (Yohananof)', code: '7290803800003', url: 'https://url.publishedprices.co.il/', color: '#f59e0b' },
  { id: 'victory', name: 'ויקטורי (Victory)', code: '7290696200003', url: 'https://matrixcatalog.co.il/', color: '#10b981' },
  { id: 'osherAd', name: 'אושר עד (Osher Ad)', code: '7290055700007', url: 'https://url.publishedprices.co.il/', color: '#8b5cf6' },
  { id: 'carrefour', name: 'קרפור / יינות ביתן (Carrefour)', code: '7290058179886', url: 'https://url.publishedprices.co.il/', color: '#06b6d4' },
  { id: 'tivTaam', name: 'טיב טעם (Tiv Taam)', code: '7290873255550', url: 'https://tivtaam.co.il/prices', color: '#ec4899' },
  { id: 'hatziHinam', name: 'חצי חינם (Hatzi Hinam)', code: '7290876100000', url: 'https://url.publishedprices.co.il/', color: '#eab308' },
];

export interface GovParsedItem {
  barcode: string;
  rawName: string;
  cleanName: string;
  price: number;
  unitOfMeasure: string;
  unitPrice?: number;
  manufacturerName?: string;
  chainName: string;
  chainId?: string;
  category: 'dairy' | 'meat' | 'produce' | 'dry' | 'beverages' | 'cleaning' | 'bakery' | 'other';
  isWeighted?: boolean;
  promoDescription?: string;
  updatedAt: string;
}

export interface GovParseResult {
  chainName: string;
  chainId: string;
  totalItems: number;
  items: GovParsedItem[];
  promosCount: number;
  errors: string[];
}

// Map chain code or filename to chain name
export function detectChainFromMetadata(fileName: string, contentSnippet: string): { chainName: string; chainId: string } {
  const lowerFile = fileName.toLowerCase();
  
  if (lowerFile.includes('shufersal') || lowerFile.includes('7290027600007') || contentSnippet.includes('7290027600007') || contentSnippet.includes('שופרסל')) {
    return { chainName: 'שופרסל', chainId: 'shufersal' };
  }
  if (lowerFile.includes('rami') || lowerFile.includes('7290058140886') || contentSnippet.includes('7290058140886') || contentSnippet.includes('רמי לוי')) {
    return { chainName: 'רמי לוי', chainId: 'ramiLevy' };
  }
  if (lowerFile.includes('yohan') || lowerFile.includes('7290803800003') || contentSnippet.includes('7290803800003') || contentSnippet.includes('יוחננוף')) {
    return { chainName: 'יוחננוף', chainId: 'yohananof' };
  }
  if (lowerFile.includes('victory') || lowerFile.includes('7290696200003') || contentSnippet.includes('7290696200003') || contentSnippet.includes('ויקטורי')) {
    return { chainName: 'ויקטורי', chainId: 'victory' };
  }
  if (lowerFile.includes('osher') || lowerFile.includes('7290055700007') || contentSnippet.includes('7290055700007') || contentSnippet.includes('אושר עד')) {
    return { chainName: 'אושר עד', chainId: 'osherAd' };
  }
  if (lowerFile.includes('carrefour') || lowerFile.includes('bitan') || lowerFile.includes('7290058179886') || contentSnippet.includes('קרפור')) {
    return { chainName: 'קרפור', chainId: 'carrefour' };
  }
  if (lowerFile.includes('tiv') || lowerFile.includes('7290873255550') || contentSnippet.includes('טיב טעם')) {
    return { chainName: 'טיב טעם', chainId: 'tivTaam' };
  }

  return { chainName: 'שופרסל', chainId: 'shufersal' };
}

// Fast Gzip decompression in browser or worker
export async function decompressGzipFile(file: File | ArrayBuffer): Promise<string> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const uint8 = new Uint8Array(buffer);
  
  // Check GZIP Magic number: 0x1f 0x8b
  if (uint8.length >= 2 && uint8[0] === 0x1f && uint8[1] === 0x8b) {
    try {
      const decompressed = pako.ungzip(uint8);
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(decompressed);
    } catch (err) {
      // Try Windows-1255 if UTF-8 fails
      try {
        const decompressed = pako.ungzip(uint8);
        const decoder = new TextDecoder('windows-1255');
        return decoder.decode(decompressed);
      } catch (err2) {
        throw new Error('שגיאה בפריקת קובץ GZ: הקובץ פגום או בפורמט לא נתמך');
      }
    }
  }

  // Not gzip, decode directly as plain text XML
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(uint8);
}

// Detect category based on product title
export function categorizeProduct(name: string): GovParsedItem['category'] {
  const n = name.toLowerCase();
  if (/חלב|גבינה|יוגורט|חמאה|קוטג|שמנת|ביצים|צהובה|לבנה|מוצרלה|פרמזן|פטה|קוטג'/i.test(n)) return 'dairy';
  if (/בשר|עוף|דג|בקר|טחון|נקניק|קבב|המבורגר|סינטה|אנטריקוט|סלמון|טונה|שניצל|כרעיים|חזה עוף/i.test(n)) return 'meat';
  if (/עגבנ|מלפפון|בצל|תפוח|בננה|לימון|תפוז|אבוקדו|חסה|גזר|פלפל|תות|פטריות|קישוא|חציל|תפוח אדמה/i.test(n)) return 'produce';
  if (/קולה|מים|מיץ|סודה|בירה|קפה|תה|משקה|יין|וודקה|נספרסו|תרכיז|פפסי|שוופס/i.test(n)) return 'beverages';
  if (/שמפו|סבון|מרכך|נייר|אקונומיקה|טואלט|משחת שיניים|אבקת כביסה|מרכך כביסה|מגבונים|דאודורנט/i.test(n)) return 'cleaning';
  if (/לחם|חלה|פיתה|לחמני|באגט|עוגה|עוגיות|קוראסון|רוגלך|טורטיה/i.test(n)) return 'bakery';
  if (/פסטה|אורז|שמן|קמח|סוכר|מלח|קטשופ|מיונז|שוקולד|שימורים|תירס|טחינה|חומוס|פתיתים|אטריות|שיבולת שועל/i.test(n)) return 'dry';
  return 'other';
}

// Clean raw supermarket receipt text / abbreviation
export function cleanRawSupermarketName(raw: string): string {
  if (!raw) return 'מוצר כללי';
  let clean = raw.trim();

  // Common supermarket POS abbreviations in Israel
  clean = clean
    .replace(/^ח[.]\s*/g, 'חלב ')
    .replace(/^גב[.]\s*/g, 'גבינה ')
    .replace(/^שוק[.]\s*/g, 'שוקולד ')
    .replace(/^מע[.]\s*/g, 'מעדן ')
    .replace(/^לח[.]\s*/g, 'לחם ')
    .replace(/\s+1ל\b/g, ' 1 ליטר')
    .replace(/\s+1\.5ל\b/g, ' 1.5 ליטר')
    .replace(/\s+2ל\b/g, ' 2 ליטר')
    .replace(/\s+200ג\b/g, ' 200 גרם')
    .replace(/\s+250ג\b/g, ' 250 גרם')
    .replace(/\s+500ג\b/g, ' 500 גרם')
    .replace(/\s+1קג\b/g, ' 1 ק"ג')
    .replace(/\s+1ק"ג\b/g, ' 1 ק"ג')
    .replace(/\s+/g, ' ');

  return clean;
}

// Main XML Parser for Israel Price Transparency
export function parseGovPricesXml(xmlContent: string, fileName: string = ''): GovParseResult {
  const { chainName, chainId } = detectChainFromMetadata(fileName, xmlContent.slice(0, 1000));
  const errors: string[] = [];
  const items: GovParsedItem[] = [];

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true,
  });

  try {
    const jsonObj = parser.parse(xmlContent);
    const root = jsonObj.Root || jsonObj.Prices || jsonObj.root || jsonObj.prices || jsonObj;

    // Detect Items array
    let rawItemsArray: any[] = [];
    if (root.Items && root.Items.Item) {
      rawItemsArray = Array.isArray(root.Items.Item) ? root.Items.Item : [root.Items.Item];
    } else if (root.Products && root.Products.Product) {
      rawItemsArray = Array.isArray(root.Products.Product) ? root.Products.Product : [root.Products.Product];
    } else if (root.Item) {
      rawItemsArray = Array.isArray(root.Item) ? root.Item : [root.Item];
    } else if (Array.isArray(root)) {
      rawItemsArray = root;
    }

    const now = new Date().toISOString();

    for (const raw of rawItemsArray) {
      const barcode = String(raw.ItemCode || raw.Barcode || raw.item_code || raw.itemCode || `bar_${Math.random().toString(36).substring(2, 8)}`);
      const rawName = String(raw.ItemName || raw.Name || raw.item_name || raw.itemName || 'מוצר ללא שם');
      const cleanName = cleanRawSupermarketName(rawName);
      const price = parseFloat(String(raw.ItemPrice || raw.Price || raw.item_price || raw.price || '0'));
      const unitOfMeasure = String(raw.UnitOfMeasure || raw.unit || 'יחידה');
      const unitPrice = raw.UnitOfMeasurePrice ? parseFloat(String(raw.UnitOfMeasurePrice)) : undefined;
      const manufacturerName = raw.ManufacturerName || raw.manufacturer;
      const isWeighted = raw.bIsWeighted === '1' || raw.bIsWeighted === 1 || raw.isWeighted === true;

      if (!isNaN(price) && price > 0) {
        items.push({
          barcode,
          rawName,
          cleanName,
          price,
          unitOfMeasure,
          unitPrice,
          manufacturerName: manufacturerName ? String(manufacturerName) : undefined,
          chainName,
          chainId,
          category: categorizeProduct(cleanName),
          isWeighted,
          updatedAt: now,
        });
      }
    }

    return {
      chainName,
      chainId,
      totalItems: items.length,
      items,
      promosCount: 0,
      errors,
    };
  } catch (err: any) {
    errors.push(`שגיאה בניתוח ה-XML: ${err?.message || String(err)}`);
    return {
      chainName,
      chainId,
      totalItems: 0,
      items: [],
      promosCount: 0,
      errors,
    };
  }
}

// Generate Realistic Sample Government Transparency XML for testing
export function generateSampleGovPriceXml(chain: GovChainInfo): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Root>
  <Header>
    <ChainId>${chain.code}</ChainId>
    <SubChainId>1</SubChainId>
    <StoreId>001</StoreId>
    <BikoretNo>1</BikoretNo>
    <PriceUpdateDate>${timestamp}</PriceUpdateDate>
  </Header>
  <Items>
    <Item>
      <PriceUpdateDate>${timestamp}</PriceUpdateDate>
      <ItemCode>7290000042456</ItemCode>
      <ItemType>1</ItemType>
      <ItemName>חלב תנובה 3% בקרטון 1 ליטר</ItemName>
      <ManufacturerName>תנובה</ManufacturerName>
      <ManufactureCountry>IL</ManufactureCountry>
      <ManufacturerItemDescription>חלב טרי מפוסטר</ManufacturerItemDescription>
      <UnitQty>1.00</UnitQty>
      <Quantity>1.00</Quantity>
      <UnitOfMeasure>ליטר</UnitOfMeasure>
      <bIsWeighted>0</bIsWeighted>
      <ItemPrice>${(chain.id === 'ramiLevy' || chain.id === 'osherAd') ? '6.80' : '7.10'}</ItemPrice>
      <UnitOfMeasurePrice>6.80</UnitOfMeasurePrice>
      <AllowDiscount>1</AllowDiscount>
      <ItemStatus>1</ItemStatus>
    </Item>
    <Item>
      <PriceUpdateDate>${timestamp}</PriceUpdateDate>
      <ItemCode>7290000066667</ItemCode>
      <ItemType>1</ItemType>
      <ItemName>גבינה צהובה עמק 28% 200 גרם</ItemName>
      <ManufacturerName>תנובה</ManufacturerName>
      <ManufactureCountry>IL</ManufactureCountry>
      <ManufacturerItemDescription>עמק פרוסות</ManufacturerItemDescription>
      <UnitQty>200.00</UnitQty>
      <Quantity>1.00</Quantity>
      <UnitOfMeasure>גרם</UnitOfMeasure>
      <bIsWeighted>0</bIsWeighted>
      <ItemPrice>${chain.id === 'ramiLevy' ? '13.90' : chain.id === 'osherAd' ? '13.50' : '15.90'}</ItemPrice>
      <UnitOfMeasurePrice>69.50</UnitOfMeasurePrice>
      <AllowDiscount>1</AllowDiscount>
      <ItemStatus>1</ItemStatus>
    </Item>
    <Item>
      <PriceUpdateDate>${timestamp}</PriceUpdateDate>
      <ItemCode>7290000078901</ItemCode>
      <ItemType>1</ItemType>
      <ItemName>קוקה קולה זירו 1.5 ליטר</ItemName>
      <ManufacturerName>החברה המרכזית למשקאות</ManufacturerName>
      <ManufactureCountry>IL</ManufactureCountry>
      <ManufacturerItemDescription>קוקה קולה זירו</ManufacturerItemDescription>
      <UnitQty>1.50</UnitQty>
      <Quantity>1.00</Quantity>
      <UnitOfMeasure>ליטר</UnitOfMeasure>
      <bIsWeighted>0</bIsWeighted>
      <ItemPrice>${chain.id === 'osherAd' ? '6.90' : chain.id === 'ramiLevy' ? '7.20' : '8.50'}</ItemPrice>
      <UnitOfMeasurePrice>5.00</UnitOfMeasurePrice>
      <AllowDiscount>1</AllowDiscount>
      <ItemStatus>1</ItemStatus>
    </Item>
    <Item>
      <PriceUpdateDate>${timestamp}</PriceUpdateDate>
      <ItemCode>7290000089123</ItemCode>
      <ItemType>1</ItemType>
      <ItemName>שמן זית כתית מעולה 750 מ"ל יד מרדכי</ItemName>
      <ManufacturerName>שטראוס יד מרדכי</ManufacturerName>
      <ManufactureCountry>IL</ManufactureCountry>
      <ManufacturerItemDescription>שמן זית איכותי</ManufacturerItemDescription>
      <UnitQty>750.00</UnitQty>
      <Quantity>1.00</Quantity>
      <UnitOfMeasure>מ"ל</UnitOfMeasure>
      <bIsWeighted>0</bIsWeighted>
      <ItemPrice>${chain.id === 'yohananof' ? '32.90' : chain.id === 'ramiLevy' ? '31.90' : '37.90'}</ItemPrice>
      <UnitOfMeasurePrice>42.50</UnitOfMeasurePrice>
      <AllowDiscount>1</AllowDiscount>
      <ItemStatus>1</ItemStatus>
    </Item>
    <Item>
      <PriceUpdateDate>${timestamp}</PriceUpdateDate>
      <ItemCode>7290000099456</ItemCode>
      <ItemType>1</ItemType>
      <ItemName>עגבניות חממה מובחרות ק"ג</ItemName>
      <ManufacturerName>תוצרת הארץ</ManufacturerName>
      <ManufactureCountry>IL</ManufactureCountry>
      <ManufacturerItemDescription>עגבניות טריות</ManufacturerItemDescription>
      <UnitQty>1.00</UnitQty>
      <Quantity>1.00</Quantity>
      <UnitOfMeasure>ק"ג</UnitOfMeasure>
      <bIsWeighted>1</bIsWeighted>
      <ItemPrice>${chain.id === 'ramiLevy' ? '4.90' : chain.id === 'shufersal' ? '6.90' : '5.50'}</ItemPrice>
      <UnitOfMeasurePrice>4.90</UnitOfMeasurePrice>
      <AllowDiscount>1</AllowDiscount>
      <ItemStatus>1</ItemStatus>
    </Item>
    <Item>
      <PriceUpdateDate>${timestamp}</PriceUpdateDate>
      <ItemCode>7290000033112</ItemCode>
      <ItemType>1</ItemType>
      <ItemName>חזה עוף טרי שלם ק"ג</ItemName>
      <ManufacturerName>עוף טוב / מהדרין</ManufacturerName>
      <ManufactureCountry>IL</ManufactureCountry>
      <ManufacturerItemDescription>בשר עוף טרי</ManufacturerItemDescription>
      <UnitQty>1.00</UnitQty>
      <Quantity>1.00</Quantity>
      <UnitOfMeasure>ק"ג</UnitOfMeasure>
      <bIsWeighted>1</bIsWeighted>
      <ItemPrice>${chain.id === 'osherAd' ? '28.90' : chain.id === 'ramiLevy' ? '29.90' : '36.90'}</ItemPrice>
      <UnitOfMeasurePrice>29.90</UnitOfMeasurePrice>
      <AllowDiscount>1</AllowDiscount>
      <ItemStatus>1</ItemStatus>
    </Item>
    <Item>
      <PriceUpdateDate>${timestamp}</PriceUpdateDate>
      <ItemCode>7290000011447</ItemCode>
      <ItemType>1</ItemType>
      <ItemName>פסטה ברילה ספגטי מס 5 500 גרם</ItemName>
      <ManufacturerName>ברילה איטליה</ManufacturerName>
      <ManufactureCountry>IT</ManufactureCountry>
      <ManufacturerItemDescription>ספגטי פרימיום</ManufacturerItemDescription>
      <UnitQty>500.00</UnitQty>
      <Quantity>1.00</Quantity>
      <UnitOfMeasure>גרם</UnitOfMeasure>
      <bIsWeighted>0</bIsWeighted>
      <ItemPrice>${chain.id === 'yohananof' ? '5.90' : chain.id === 'ramiLevy' ? '5.50' : '6.90'}</ItemPrice>
      <UnitOfMeasurePrice>11.00</UnitOfMeasurePrice>
      <AllowDiscount>1</AllowDiscount>
      <ItemStatus>1</ItemStatus>
    </Item>
  </Items>
</Root>`;
}
