export function activationReminderTemplate(vars: Record<string, any> = {}) {
  const firstName = vars.firstName || 'Member';
  const activateUrl = vars.activateUrl || 'https://chaincoop.com/activate';
  return `
  <html>
    <body style="font-family: Arial, sans-serif; color: #222;">
      <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2>⚡ Activate Your Chain Coop Account</h2>
        <p>Hi ${firstName},</p>
        <p>Your account isn’t fully activated yet. Activate now to start enjoying your membership benefits:</p>
        <ul>
          <li>Community participation</li>
          <li>Exclusive projects</li>
          <li>Member support</li>
        </ul>
        <p>
          <a href="${activateUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Activate Account</a>
        </p>
        <p>Need help? Reply to this message and we’ll assist.</p>
        <p>— Chain Coop Team</p>
      </div>
    </body>
  </html>`;
}