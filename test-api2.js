const http = require('http');

http.get('http://localhost:5003/api/product/dashboard-stats', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
}).on('error', (err) => {
  console.log(`Error: ${err.message}`);
});
