import express from "express";
import bodyParser from "body-parser";
import { EmailService } from "./src/EmailService.js";
import { MockEmailProvider } from "./src/MockEmailProvider.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const emailService = new EmailService([
  new MockEmailProvider("DevProvider-A"),
  new MockEmailProvider("DevProvider-B"),
]);

app.post("/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing fields: to, subject, body" });
  }

  try {
    const result = await emailService.sendEmail({ to, subject, body });
    res.json({
      success: true,
      provider: result.provider,
      messageId: result.messageId,
      timestamp: result.timestamp,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Resilient Email Service is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
