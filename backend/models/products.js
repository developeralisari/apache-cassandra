const createTableQuery = `
  CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    name TEXT,
    price DECIMAL,
    description TEXT
  );
`;

client.execute(createTableQuery, (err) => {
  if (err) {
    console.error('Tablo oluşturulamadı:', err);
  } else {
    console.log('Tablo başarıyla oluşturuldu.');
  }
});
