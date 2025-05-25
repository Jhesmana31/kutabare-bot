const { getCartsCollection } = require('./db');

async function add(chatId, item) {
  const collection = await getCartsCollection();
  await collection.updateOne(
    { chatId },
    { $push: { items: item } },
    { upsert: true }
  );
}

async function get(chatId) {
  const collection = await getCartsCollection();
  const doc = await collection.findOne({ chatId });
  return doc ? doc.items : [];
}

async function remove(chatId, index) {
  const collection = await getCartsCollection();
  const doc = await collection.findOne({ chatId });
  if (!doc) return;

  const items = doc.items || [];
  if (index < 0 || index >= items.length) return;

  items.splice(index, 1);

  await collection.updateOne({ chatId }, { $set: { items } });
}

async function clear(chatId) {
  const collection = await getCartsCollection();
  await collection.deleteOne({ chatId });
}

module.exports = {
  add,
  get,
  remove,
  clear
};
