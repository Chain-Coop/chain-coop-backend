export const userLogMail = ({
  userId,
  operation,
  timestamp,
  url,
  status,
  ip,
  userAgent,
}: {
  userId: string;
  operation: string;
  timestamp: string;
  url: string;
  status: string;
  ip?: string;
  userAgent: string;
}) => {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Action Log Notification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333;
      line-height: 1.6;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    h2 {
      background-color: #007bff;
      color: #fff;
      padding: 10px;
      text-align: center;
      border-radius: 5px;
    }

    .log-details {
      margin: 20px 0;
    }

    .log-details h4 {
      margin: 5px 0;
      color: #555;
    }

    .log-details p {
      margin: 2px 0;
    }

    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #777;
      text-align: center;
    }

    .footer a {
      color: #007bff;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>

<body>
  <div class="container">
    <h2>User Action Log Notification</h2>

    <p>Hi,</p>
    <p>This is to notify you of a recent action performed by a user in the system. Below are the details:</p>

    <div class="log-details">
      <h4>User Action Log:</h4>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>Operation:</strong> ${operation}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p><strong>URL:</strong> ${url}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>IP Address:</strong> ${ip}</p>
      <p><strong>User Agent:</strong> ${userAgent}</p>
    </div>

    <p>If you did not initiate this action or believe it is suspicious, please contact the support team immediately.</p>

    <div class="footer">
      <p>Best regards,</p>
      <p>Your Application Team</p>
      <p>If you need help, please visit our <a href="https://support.example.com">support center</a>.</p>
    </div>
  </div>
</body>

</html>
`;
};
