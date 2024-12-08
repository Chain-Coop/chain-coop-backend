const https = require("https");

const params = JSON.stringify({
  country: "NG",
  type: "bank_account",
  account_number: "0111111111",
  bvn: "22222222221",
  bank_code: "007",
  first_name: "Uchenna",
  last_name: "Okoro",
});

const options = {
  hostname: "api.paystack.co",
  port: 443,
  path: "/customer/CUS_ubefkfeic3r6ewk/identification",
  method: "POST",
  headers: {
    Authorization: "Bearer sk_test_e97acb068e8837d9bd8a532a15cfe2accecdb10f",
    "Content-Type": "application/json",
  },
};

const req = https
  .request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log(JSON.parse(data));
    });
  })
  .on("error", (error) => {
    console.error(error);
  });

req.write(params);
req.end();
