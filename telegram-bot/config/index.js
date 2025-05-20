require('dotenv').config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  telegramAdminId: process.env.ADMIN_ID,
  mongoUri: process.env.MONGO_URI,
  storeName: "Kutabare Online Shop",
  paymentLink: "https://app.bux.ph/kutabarestore", // if still using BUx
};
