export const joinWaitingListMail = ({ name }: { name: string }) => {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Chain Co-op Waitlist!</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
  <div style="background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #440080; margin-bottom: 20px;">Welcome to the Chain Co-op Waitlist!</h1>
    <p style="color: #333; margin-bottom: 20px;">Dear ${name},</p>
    <p style="color: #333; margin-bottom: 20px;">Welcome to the Chain Co-op waitlist! We're thrilled to have you onboard and appreciate your interest in our platform.</p>
    <p style="color: #333; margin-bottom: 20px;">At Chain Co-op, we're building something special—a community-driven platform that empowers individuals to connect, collaborate, and contribute to a more sustainable future together.</p>
    <p style="color: #333; margin-bottom: 20px;">As a member of our waitlist, you're among the first to be notified about our latest updates, product launches, and exclusive early access opportunities. We'll keep you informed every step of the way as we progress towards our official launch.</p>
    <p style="color: #333; margin-bottom: 20px;">In the meantime, we encourage you to spread the word about Chain Co-op with friends, family, and colleagues who share our vision. Together, we can make a meaningful impact on the world around us.</p>
    <p style="color: #333; margin-bottom: 20px;">If you have any questions, feedback, or suggestions, feel free to reach out to us at <a href="mailto:info@chaincoop.org" style="color: #440080;">info@chaincoop.org</a>. We're here to listen and eager to hear from you!</p>
    <p style="color: #333; margin-bottom: 20px;">Thank you for joining us on this journey. Let's build something incredible together!</p>
    <p style="color: #333; margin-bottom: 20px;">Warm regards,</p>
    <p style="color: #333; margin-bottom: 20px;">Chain Co-op</p>
    <hr>
    <img src="https://example.com/company-logo.png" alt="Company Logo" style="max-width: 200px; margin-top: 20px;">
    <p style="color: #333; margin-bottom: 0; margin-top: 20px;">[Company Address]<br>[Company Website]</p>
  </div>
</body>
</html>
`;
};
