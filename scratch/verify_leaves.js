const http = require("http");

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verify() {
  console.log("Starting Leaves Module verification...");

  // 1. Authenticate
  console.log("Attempting login...");
  const loginRes = await request("http://127.0.0.1:5000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  }, {
    email: "punamdaware82@gmail.com",
    password: "admin@123",
    loginRole: "ADMIN"
  });

  if (loginRes.statusCode !== 200) {
    console.error("Login failed with status:", loginRes.statusCode);
    console.error("Response:", loginRes.body);
    process.exit(1);
  }

  const loginData = JSON.parse(loginRes.body);
  const token = loginData.data.token;
  console.log("Login successful! Token acquired.");

  // 2. Fetch leaves list
  console.log("Fetching leaves list...");
  const listRes = await request("http://127.0.0.1:5000/api/leave", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (listRes.statusCode !== 200) {
    console.error("Fetching leaves list failed with status:", listRes.statusCode);
    console.error("Body:", listRes.body);
    process.exit(1);
  }
  
  const listData = JSON.parse(listRes.body);
  console.log(`Success! Retrieved ${listData.data.length} leave records.`);

  // 3. Test XLSX export
  console.log("Testing leaves export...");
  const exportRes = await request("http://127.0.0.1:5000/api/leave/export", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  console.log("Export Status:", exportRes.statusCode);
  console.log("Export Headers:");
  console.log("- Content-Disposition:", exportRes.headers["content-disposition"]);
  console.log("- Content-Type:", exportRes.headers["content-type"]);

  if (exportRes.statusCode === 200 && exportRes.headers["content-disposition"]?.includes("Leaves_Report.xlsx")) {
    console.log("Leaves export verification PASSED successfully!");
  } else {
    console.error("Leaves export verification FAILED.");
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
