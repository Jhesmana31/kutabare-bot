const products = [
  // Cock Rings & Toys
  { name: 'Cock Ring - Pack of 3', price: 80, category: 'Cock Rings & Toys' },
  { name: 'Cock Ring Vibrator', price: 60, category: 'Cock Rings & Toys' },
  { name: 'Spikey Jelly (Red)', price: 160, category: 'Cock Rings & Toys' },
  { name: 'Spikey Jelly (Black)', price: 160, category: 'Cock Rings & Toys' },
  { name: '"Th Bolitas" Jelly', price: 160, category: 'Cock Rings & Toys' },
  { name: 'Portable Wired Vibrator Egg', price: 130, category: 'Cock Rings & Toys' },
  { name: '7 Inches African Version Dildo', price: 270, category: 'Cock Rings & Toys' },

  // Lubes & Condoms
  { name: 'Monogatari Lube Tube', price: 120, category: 'Lubes & Condoms' },
  { name: 'Monogatari Lube Pinhole', price: 120, category: 'Lubes & Condoms' },
  {
    name: 'Monogatari Flavored Lube',
    price: 200,
    category: 'Lubes & Condoms',
    variants: ['Peach', 'Strawberry', 'Cherry']
  },
  {
    name: 'Ultra thin 001 Condoms',
    price: 90,
    category: 'Lubes & Condoms',
    variants: ['Black', 'Long Battle', 'Blue', 'Naked Pleasure', 'Granule Passion']
  },

  // Performance Enhancers
  { name: 'Maxman per Tab', price: 40, category: 'Performance Enhancers' },
  { name: 'Maxman per Pad', price: 400, category: 'Performance Enhancers' },

  // Spicy Accessories
  { name: 'Delay Collar', price: 200, category: 'Spicy Accessories' },
  { name: 'Delay Ejaculation Buttplug', price: 200, category: 'Spicy Accessories' },
  {
    name: 'Masturbator Cup',
    price: 120,
    category: 'Spicy Accessories',
    variants: ['Yellow (Mouth)', 'Gray (Arse)', 'Black (Vagina)']
  },

  // Essentials
  {
    name: 'Eucalyptus Menthol Food Grade',
    price: 1000,
    category: 'Essentials',
    variants: ['15-20 (1k)', '25-30 (1.5k)', '35-40 (2k)']
  },
  {
    name: 'Mouth Fresheners',
    price: 90,
    category: 'Essentials',
    variants: ['Peach', 'Mint']
  },
  { name: 'Insulin Syringe', price: 20, category: 'Essentials' },
  { name: 'Sterile Water for Injection', price: 15, category: 'Essentials' }
];

function getCategories() {
  return [
    'Cock Rings & Toys',
    'Lubes & Condoms',
    'Performance Enhancers',
    'Spicy Accessories',
    'Essentials'
  ];
}

function getProductList(category) {
  return products.filter(p => p.category === category);
}

module.exports = {
  products,
  getCategories,
  getProductList
};
