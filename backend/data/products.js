const categories = [
  'Cock Rings & Toys',
  'Lubes & Condoms',
  'Performance',
  'Accessories',
  'Essentials'
];

const products = {
  'Cock Rings & Toys': {
    CockRing3pk: { label: 'Cock Ring - Pack of 3', price: 80 },
    VibratorRing: { label: 'Cock Ring Vibrator', price: 60 },
    SpikeyRed: { label: 'Spikey Jelly (Red)', price: 160 },
    SpikeyBlack: { label: 'Spikey Jelly (Black)', price: 160 },
    Bolitas: { label: 'The Bolitas Jelly', price: 160 },
    VibratorEgg: { label: 'Wired Vibrator Egg', price: 130 },
    AfricanDildo: { label: '7 Inches African Dildo', price: 270 },
    Masturbator: {
      Yellow: 120,  // Mouth
      Gray: 120,    // Arse
      Black: 120    // Vagina
    }
  },

  'Lubes & Condoms': {
    LubeTube: { label: 'Monogatari Lube Tube', price: 120 },
    LubePinhole: { label: 'Monogatari Pinhole Lube', price: 120 },
    LubeFlavored: {
      Peach: 200,
      Strawberry: 200,
      Cherry: 200
    },
    Condom001: {
      Black: 90,
      LongBattle: 90,
      Blue: 90,
      NakedPleasure: 90,
      GranulePassion: 90
    }
  },

  'Performance': {
    MaxTab: { label: 'Maxman per Tab', price: 40 },
    MaxPad: { label: 'Maxman per Pad (discounted)', price: 400 }
  },

  'Accessories': {
    DelayCollar: { label: 'Delay Collar', price: 200 },
    DelayPlug: { label: 'Delay Buttplug', price: 200 }
  },

  'Essentials': {
    EucaMenthol: {
      '15-20': 1000,
      '25-30': 1500,
      '35-40': 2000
    },
    Freshener: {
      Peach: 90,
      Mint: 90
    },
    Syringe: { label: 'Insulin Syringe', price: 20 },
    SterileWater: { label: 'Sterile Water for Injection', price: 15 }
  }
};

module.exports = { categories, products };
