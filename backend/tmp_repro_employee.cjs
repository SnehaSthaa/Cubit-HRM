const http = require("http");
const { URL } = require("url");
const request = (url, method, body, token) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: Object.assign(
        { "Content-Type": "application/json" },
        data ? { "Content-Length": Buffer.byteLength(data) } : {},
        token ? { Authorization: "Bearer " + token } : {},
      ),
    };
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });

(async () => {
  try {
    const login = await request(
      "http://localhost:3000/api/auth/login",
      "POST",
      { email: "hr@harmonyhr.com", password: "hr123" },
    );
    console.log("LOGIN", login.status, login.body);

    const parsed = JSON.parse(login.body);
    const token = parsed.data && parsed.data.token;
    if (!token) {
      console.error("No token returned");
      process.exit(1);
    }

    const create = await request(
      "http://localhost:3000/api/employees",
      "POST",
      {
        employee_id: "CUB10",
        first_name: "Sneha",
        last_name: "Shrestha",
        email: "snehacrest1234@gmail.com",
        phone: "+977984326798",
        date_of_birth: "2004-10-20",
        department: "Marketing",
        position: "Manager",
        joining_date: "2026-04-07",
      },
      token,
    );
    console.log("CREATE", create.status, create.body);
  } catch (e) {
    console.error("ERR", e);
  }
})();
