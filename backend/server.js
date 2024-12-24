const express = require('express');
const cassandra = require('cassandra-driver');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

// Body-parser ile JSON verileri çözümleme
app.use(bodyParser.json());  // JSON verisini çözümlemek için

// Cassandra istemcisini oluşturma
const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'], // Cassandra'nın IP adresi
  localDataCenter: 'datacenter1', // Varsayılan data center adı
  keyspace: 'products_keyspace' // Varsayılan keyspace
});

// Veritabanı bağlantısı kontrol
client.connect((err) => {
  if (err) {
    console.error('Cassandra bağlantısı başarısız:', err);
  } else {
    console.log('Cassandra bağlantısı başarılı!');
  }
});

// Frontend klasörünü statik olarak sunuyoruz
app.use(express.static(path.join(__dirname, '../frontend')));

// Ana sayfa isteği için index.html dosyasını yönlendiriyoruz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Create - products tablosunu oluşturma
// Keyspace'i kontrol edip tabloyu oluşturma
app.get('/api/products/create-table', async (req, res) => {
  const createKeyspaceQuery = `
    CREATE KEYSPACE IF NOT EXISTS products_keyspace
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
  `;

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      name TEXT,
      price DECIMAL,
      description TEXT
    );
  `;

  try {
    // Keyspace oluştur
    await client.execute(createKeyspaceQuery);

    // Keyspace kullan
    await client.execute('USE products_keyspace');

    // Tablo oluştur
    await client.execute(createTableQuery);

    res.status(200).send('Products tablosu başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Tablo oluşturulurken bir hata oluştu:', error.message); // Konsola hatayı yazdır
    res.status(500).send(`Tablo oluşturulamadı. Hata: ${error.message}`); // Hata mesajını döndür
  }
});

// CRUD işlemleri

// Create - ürün ekleme
app.post('/api/products', (req, res) => {
  const { name, price, description } = req.body;
  console.log("Gelen Veri:", req.body); // Bu satırı ekleyin
  const query = 'INSERT INTO products (id, name, price, description) VALUES (uuid(), ?, ?, ?)';
  client.execute(query, [name, price, description], { prepare: true }, (err) => {
    if (err) {
      console.error("Hata:", err);
      res.status(500).send('Ürün eklenemedi!');
    } else {
      res.status(201).send('Ürün başarıyla eklendi!');
    }
  });
});


// Read - ürünleri listeleme
app.get('/api/products', (req, res) => {
  const query = 'SELECT * FROM products';
  client.execute(query, (err, result) => {
    if (err) {
      res.status(500).send('Veriler alınamadı!');
    } else {
      res.json(result.rows);
    }
  });
});

// Update - ürün güncelleme
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, description } = req.body;
  const query = 'UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?';
  client.execute(query, [name, price, description, id], { prepare: true }, (err) => {
    if (err) {
      res.status(500).send('Ürün güncellenemedi!');
    } else {
      res.send('Ürün başarıyla güncellendi!');
    }
  });
});

// Delete - ürün silme
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM products WHERE id = ?';
  client.execute(query, [id], { prepare: true }, (err) => {
    if (err) {
      res.status(500).send('Ürün silinemedi!');
    } else {
      res.send('Ürün başarıyla silindi!');
    }
  });
});

// Performans testi (1 milyon ürün ekleme)
app.get('/benchmark', (req, res) => {
  const startTime = Date.now(); // Test başlama zamanı
  const product = {
    name: 'Test Ürünü',
    price: 100,
    description: 'Bu bir test ürünüdür.'
  };
  
  let insertCount = 0;
  const totalInserts = 10000; // 1 milyon kayıt

  function insertBatch() {
    const batchQuery = 'INSERT INTO products (id, name, price, description) VALUES (uuid(), ?, ?, ?)';
    client.execute(batchQuery, [product.name, product.price, product.description], { prepare: true }, (err) => {
      if (err) {
        console.error("Hata:", err);
      }
      insertCount++;
      if (insertCount < totalInserts) {
        insertBatch(); // Bir sonraki insert işlemini başlat
      } else {
        const endTime = Date.now(); // Test bitiş zamanı
        const duration = (endTime - startTime) / 1000; // Saniye cinsinden süre
        console.log(`Test tamamlandı: ${insertCount} kayıt eklendi, Süre: ${duration} saniye`);
        res.send(`Test tamamlandı: ${insertCount} kayıt eklendi, Süre: ${duration} saniye`);
      }
    });
  }

  // İlk batch işlemini başlat
  insertBatch();
});


// Uygulamayı başlat
app.listen(port, () => {
  console.log(`Server çalışıyor http://localhost:${port}`);
});
