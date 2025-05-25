const carts = {};

module.exports = {
  add: (chatId, item) => {
    if (!carts[chatId]) {
      carts[chatId] = [];
    }
    carts[chatId].push(item);
  },

  get: (chatId) => {
    return carts[chatId] || [];
  },

  clear: (chatId) => {
    delete carts[chatId];
  }
};
