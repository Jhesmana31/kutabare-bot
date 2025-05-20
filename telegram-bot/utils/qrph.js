const generateQrphPayload = (orderId, amount) => {
  return {
    qrCode: `https://netbankqrph.example.com/pay?ref=${orderId}&amt=${amount}`,
    vcaId: process.env.VCA_ID || 'kutabareqrph',
    amount,
    ref: orderId
  };
};

module.exports = { generateQrphPayload };
