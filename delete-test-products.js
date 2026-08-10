const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaHl0Y3Jtc3Rsa3ZubXdmeGdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU5MDkwNiwiZXhwIjoyMDkyMTY2OTA2fQ.kfpSE0hOTuKcSdjBydEx0Tw61Q6Y0-j6LWXd5YEGvG8';

async function test() {
  // 1. Fetch products containing "Test"
  let res = await fetch('https://iahytcrmstlkvnmwfxgs.supabase.co/rest/v1/products?select=*', {
    headers: {
      'apikey': token,
      'Authorization': 'Bearer ' + token
    }
  });
  let products = await res.json();
  
  const testProducts = products.filter(p => 
    String(p.name).toLowerCase().includes('test') || 
    String(p.model).toLowerCase().includes('test')
  );

  console.log('Found test products:', testProducts.length);
  console.log(JSON.stringify(testProducts, null, 2));

  // 2. Delete them
  for (const p of testProducts) {
    console.log(`Deleting product: ${p.name} - ${p.model} (ID: ${p.id})`);
    const delRes = await fetch(`https://iahytcrmstlkvnmwfxgs.supabase.co/rest/v1/products?id=eq.${p.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': token,
        'Authorization': 'Bearer ' + token
      }
    });
    console.log(`Delete status for ID ${p.id}: ${delRes.status}`);
  }
}

test().catch(console.error);
