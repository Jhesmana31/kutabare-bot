// Full version of your bot with inline buttons instead of keyboard replies

const express = require('express'); const mongoose = require('mongoose'); const bodyParser = require('body-parser'); const { Telegraf, Markup } = require('telegraf'); const Order = require('./models/Order'); require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN); const app = express(); app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, });

const ADMIN_ID = '7699555744';

const categories = { 'Cock Rings & Toys': [ { name: 'Cock Ring - Pack of 3', price: 80 }, { name: 'Cock Ring Vibrator', price: 60 }, { name: 'Spikey Jelly (Red)', price: 160 }, { name: 'Spikey Jelly (Black)', price: 160 }, { name: '"Th Bolitas" Jelly', price: 160 }, { name: 'Portable Wired Vibrator Egg', price: 130 }, { name: '7 Inches African Version Dildo', price: 270 }, { name: 'Masturbator Cup', price: 120, variants: ['Yellow (Mouth)', 'Gray (Arse)', 'Black (Vagina)'] }, ], 'Lubes & Condoms': [ { name: 'Monogatari Lube Tube', price: 120 }, { name: 'Monogatari Lube Pinhole', price: 120 }, { name: 'Monogatari Flavored Lube', price: 200, variants: ['Peach', 'Strawberry', 'Cherry'] }, { name: 'Ultra thin 001 Condom', price: 90, variants: ['Black', 'Long Battle', 'Blue', 'Naked Pleasure', 'Granule Passion'] }, ], 'Performance Enhancers': [ { name: 'Maxman per Tab', price: 40 }, { name: 'Maxman per Pad', price: 400 }, ], 'Spicy Accessories': [ { name: 'Delay Collar', price: 200 }, { name: 'Delay Ejaculation Buttplug', price: 200 }, ], 'Essentials': [ { name: 'Eucalyptus Menthol Food Grade', price: 0, variants: ['15-20 (1k)', '25-30 (1.5k)', '35-40 (2k)'] }, { name: 'Mouth Fresheners', price: 90, variants: ['Peach', 'Mint'] }, { name: 'Insulin Syringe', price: 20 }, { name: 'Sterile Water for Injection', price: 15 }, ], };

const userCarts = {}; const userStates = {}; const userOrderData = {}; const qrPending = {}; const proofWaitList = {};

bot.start((ctx) => { const id = ctx.from.id.toString(); userCarts[id] = []; userStates[id] = 'CATEGORY_SELECTION'; ctx.reply('Welcome to Kutabare Online Shop! Pili ka muna ng category:', categoryButtons()); });

function categoryButtons() { return Markup.inlineKeyboard( Object.keys(categories).map(c => [Markup.button.callback(c, CATEGORY_${c})]).concat([[Markup.button.callback('Checkout', 'CHECKOUT')]]) ); }

function productButtons(category) { const items = categories[category]; return Markup.inlineKeyboard( items.map(p => [Markup.button.callback(p.name, PRODUCT_${p.name})]).concat([[Markup.button.callback('Back', 'BACK')]]) ); }

bot.on('callback_query', async (ctx) => { const id = ctx.from.id.toString(); const data = ctx.callbackQuery.data;

if (data.startsWith('CATEGORY_')) { const category = data.replace('CATEGORY_', ''); userStates[id] = PRODUCT_SELECTION:${category}; return ctx.editMessageText(Pili ng product sa ${category}:, productButtons(category)); }

if (data.startsWith('PRODUCT_')) { const productName = data.replace('PRODUCT_', ''); const state = userStates[id]; const category = state.split(':')[1]; const product = categories[category].find(p => p.name === productName); if (!product) return;

if (product.variants) {
  userStates[id] = `VARIANT_SELECTION:${product.name}:${category}`;
  return ctx.editMessageText('Pili ng variant:', Markup.inlineKeyboard(
    product.variants.map(v => [Markup.button.callback(v, `VARIANT_${product.name}::${v}::${category}`)])
    .concat([[Markup.button.callback('Back', 'BACK')]])
  ));
} else {
  userCarts[id].push({ name: product.name, price: product.price });
  userStates[id] = 'CATEGORY_SELECTION';
  return ctx.editMessageText(`${product.name} added to cart!`, categoryButtons());
}

}

if (data.startsWith('VARIANT_')) { const [, name, variant, category] = data.match(/^VARIANT(.+)::(.+)::(.+)$/); userCarts[id].push({ name: ${name} - ${variant}, price: categories[category].find(p => p.name === name).price }); userStates[id] = 'CATEGORY_SELECTION'; return ctx.editMessageText(${name} (${variant}) added to cart!, categoryButtons()); }

if (data === 'BACK') { userStates[id] = 'CATEGORY_SELECTION'; return ctx.editMessageText('Balik sa categories:', categoryButtons()); }

if (data === 'CHECKOUT') { if (!userCarts[id] || userCarts[id].length === 0) { return ctx.answerCbQuery('Wala ka pang laman sa cart!', { show_alert: true }); } userStates[id] = 'DELIVERY_OPTION'; return ctx.editMessageText('Pili ng delivery option:', Markup.inlineKeyboard([ [Markup.button.callback('Pick up', 'DELIVERY_Pick up')], [Markup.button.callback('Same-day Delivery', 'DELIVERY_Same-day Delivery')], ])); }

if (data.startsWith('DELIVERY_')) { const option = data.replace('DELIVERY_', ''); userOrderData[id] = { deliveryOption: option }; userStates[id] = 'AWAITING_CONTACT'; return ctx.editMessageText('Please enter your contact number:'); } });

bot.on('text', async (ctx) => { const id = ctx.from.id.toString(); const text = ctx.message.text; const state = userStates[id];

if (state === 'AWAITING_CONTACT') { const phone = text; const cart = userCarts[id]; const deliveryOption = userOrderData[id].deliveryOption; const total = cart.reduce((sum, item) => sum + item.price, 0); const lines = cart.map(i => • ${i.name} - ₱${i.price}).join('\n');

const newOrder = new Order({
  telegramId: id,
  items: cart,
  deliveryOption,
  contact: phone,
  status: 'Pending Payment',
});
await newOrder.save();

ctx.reply(`Order placed! Total: ₱${total}\nWait for the QR code for payment.`);

bot.telegram.sendMessage(ADMIN_ID,
  `New order received from @${ctx.from.username || ctx.from.first_name}:\n\n${lines}\n\nDelivery: ${deliveryOption}\nContact: ${phone}\nTotal: ₱${total}\n\nOrder ID: ${newOrder._id}`);

qrPending[newOrder._id] = id;
delete userCarts[id];
delete userStates[id];
delete userOrderData[id];

}

if (ctx.chat.id == ADMIN_ID && ctx.message.reply_to_message && ctx.message.photo) { const originalMessage = ctx.message.reply_to_message.text; const match = originalMessage.match(/Order ID: ([a-f0-9]+)/); if (match) { const orderId = match[1]; const customerId = qrPending[orderId]; if (customerId) { const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id; await bot.telegram.sendPhoto(customerId, fileId, { caption: 'Ito na po ang payment QR code. Please send back your proof of payment photo after completing the transaction.', }); proofWaitList[customerId] = orderId; delete qrPending[orderId]; ctx.reply('QR sent to customer.'); } } }

if (ctx.message.photo && proofWaitList[id]) { const orderId = proofWaitList[id]; const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id; const order = await Order.findById(orderId); if (order) { order.paymentProofFileId = fileId; order.status = 'Payment Received'; await order.save();

ctx.reply('Payment proof received! We will confirm and update you shortly.');
  bot.telegram.sendMessage(ADMIN_ID, `Proof of payment uploaded for order ID: ${orderId}`);
}
delete proofWaitList[id];

} });

app.get('/orders', async (req, res) => { const orders = await Order.find().sort({ createdAt: -1 }); res.json(orders); });

app.post('/orders/:id/status', async (req, res) => { const { id } = req.params; const { status } = req.body; const order = await Order.findByIdAndUpdate(id, { status }, { new: true }); if (!order) return res.status(404).json({ error: 'Order not found' });

try { await bot.telegram.sendMessage(order.telegramId, Order update:\nYour order status is now *${status}*., { parse_mode: 'Markdown', }); } catch (err) { console.error('Failed to send Telegram message to customer:', err.message); }

res.json(order); });

bot.launch(); const PORT = process.env.PORT || 5000; app.listen(PORT, () => { console.log(Server running on port ${PORT}); });

