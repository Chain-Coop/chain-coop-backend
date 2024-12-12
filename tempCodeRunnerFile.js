const verifyOTP = async (code, reference) => {
  try {
    const axiosOptions = {
      method: "post",
      url: "https://api.sendchamp.com/api/v1/verification/confirm",
      headers: {
        Authorization:
          "Bearer sendchamp_live_$2a$10$BZNxPGloLjt/a85Otm3uwORGjsCvwtMX5odhSYupo0td1JnAneybC",
        accept: "application/json",
        "content-type": "application/json",
      },
      data: {
        verification_reference: reference,
        verification_code: code,
      },
    };

    const response = await axios(axiosOptions);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    return "failed";
  }
};