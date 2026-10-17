const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip / brotli compression for fast transfer
app.use(compression());

// Setup EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets with caching
const staticOptions = {
  maxAge: '1d',
  immutable: true
};

// Serve frame directories
app.use('/frames/clip-a', express.static(path.join(__dirname, 'frame1'), staticOptions));
app.use('/frames/clip-b', express.static(path.join(__dirname, 'frame2'), staticOptions));
app.use('/frame1', express.static(path.join(__dirname, 'frame1'), staticOptions));
app.use('/frame2', express.static(path.join(__dirname, 'frame2'), staticOptions));

// Handle favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve general public assets
app.use(express.static(path.join(__dirname, 'public')));

// Frame manifest API endpoint (supports ?format=webp or ?format=png, defaults to webp)
app.get('/api/frames', (req, res) => {
  const format = req.query.format === 'png' ? 'png' : 'webp';
  const clipAFrames = [];
  for (let i = 1; i <= 48; i++) {
    const num = String(i).padStart(3, '0');
    clipAFrames.push({
      group: 'A',
      index: i - 1,
      name: `ezgif-frame-${num}.${format}`,
      url: `/frames/clip-a/ezgif-frame-${num}.${format}`
    });
  }

  const clipBFrames = [];
  for (let i = 1; i <= 48; i++) {
    const num = String(i).padStart(3, '0');
    clipBFrames.push({
      group: 'B',
      index: i - 1,
      name: `ezgif-frame-${num}.${format}`,
      url: `/frames/clip-b/ezgif-frame-${num}.${format}`
    });
  }

  res.json({
    format,
    clipA: clipAFrames,
    clipB: clipBFrames,
    totalFrames: clipAFrames.length + clipBFrames.length,
    width: 1920,
    height: 1080
  });
});


// Mock featured products data
const FEATURED_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Mechanical Dragon Model',
    category: 'Models',
    price: '$44.90',
    material: 'Silk Bronze PLA',
    rating: '4.95',
    reviewsCount: 128,
    badge: 'Popular',
    image: '/images/products/mechanical-dragon.svg',
    description: 'Articulated multi-segment spine engineered with snap-fit interlocking tolerances.'
  },
  {
    id: 'prod-2',
    name: 'Minimalist Wave Vase',
    category: 'Decoration',
    price: '$19.90',
    material: 'Matte Ceramic PLA',
    rating: '4.91',
    reviewsCount: 84,
    badge: 'Curated',
    image: '/images/products/wave-vase.svg',
    description: 'Algorithmic sinusoidal geometry with a tactile velvety matte finish.'
  },
  {
    id: 'prod-3',
    name: 'Modular Controller Stand',
    category: 'Accessories',
    price: '$24.90',
    material: 'Stealth Grey PETG',
    rating: '4.88',
    reviewsCount: 62,
    badge: null,
    image: '/images/products/controller-stand.svg',
    description: 'Precision dual-perch dock with integrated cable guides and rubberized feet.'
  },
  {
    id: 'prod-4',
    name: 'Astronaut Desk Lamp',
    category: 'Home',
    price: '$39.90',
    material: 'Translucent Resin & Wood',
    rating: '4.97',
    reviewsCount: 153,
    badge: 'Best Seller',
    image: '/images/products/astronaut-lamp.svg',
    description: 'Diffused helmet illumination with internal touch-capacitive dimming core.'
  },
  {
    id: 'prod-5',
    name: 'Cyber Samurai Figure',
    category: 'Figures',
    price: '$34.90',
    material: 'Ultra-Detail 8K Resin',
    rating: '4.94',
    reviewsCount: 97,
    badge: null,
    image: '/images/products/cyber-samurai.svg',
    description: 'Micro-sculpted armor plating with hand-cured matte graphite finish.'
  },
  {
    id: 'prod-6',
    name: 'Geometric Whale Sculpture',
    category: 'Decoration',
    price: '$28.90',
    material: 'Recycled Ocean PLA',
    rating: '4.89',
    reviewsCount: 71,
    badge: 'Eco Polymer',
    image: '/images/products/whale-sculpture.svg',
    description: 'Low-poly hydrodynamic curves crafted from reclaimed coastal polymers.'
  }
];

const CATEGORIES = [
  { name: 'Models', count: '48 items', tag: 'Mechanical & Structural', size: 'large', image: '/images/categories/models.svg' },
  { name: 'Decoration', count: '36 items', tag: 'Sculptural & Organic', size: 'medium', image: '/images/categories/decoration.svg' },
  { name: 'Toys', count: '29 items', tag: 'Articulated & Kinetic', size: 'medium', image: '/images/categories/toys.svg' },
  { name: 'Home', count: '52 items', tag: 'Living & Organization', size: 'medium', image: '/images/categories/home.svg' },
  { name: 'Accessories', count: '41 items', tag: 'Desk & Device Docks', size: 'large', image: '/images/categories/accessories.svg' },
  { name: 'Figures', count: '64 items', tag: 'Collectible Chibi & Sculptures', size: 'medium', image: '/images/categories/figures.svg' },
  { name: 'Custom', count: 'Bespoke', tag: 'Your STL Files Made Real', size: 'medium', image: '/images/categories/custom.svg' }
];

// Home page route
app.get('/', (req, res) => {
  res.render('index', {
    title: '3DWorld — 3D Marketplace & Printing Service',
    products: FEATURED_PRODUCTS,
    categories: CATEGORIES
  });
});

// Placeholder routes
app.get('/marketplace', (req, res) => {
  const category = req.query.category || 'All';
  res.render('placeholder', {
    title: `${category} — Marketplace | 3DWorld`,
    heading: 'Marketplace',
    subheading: `Browsing ${category}. The full catalog is arriving soon. Explore our curated landing experience in the meantime.`
  });
});

app.get('/printing', (req, res) => {
  res.render('placeholder', {
    title: 'Custom 3D Printing Service | 3DWorld',
    heading: '3D Printing Service',
    subheading: 'Our direct STL / OBJ instant quoting portal is launching soon. Return to the home page to preview the workflow.'
  });
});

app.get('/login', (req, res) => {
  res.render('placeholder', {
    title: 'Account Sign In | 3DWorld',
    heading: 'Member Access',
    subheading: 'Customer and maker accounts will be available with the full marketplace release.'
  });
});

// Centralized 404 handler for missing routes
app.use((req, res, next) => {
  if (req.accepts('html')) {
    return res.status(404).render('placeholder', {
      title: 'Page Not Found — 404 | 3DWorld',
      heading: '404 — Page Not Found',
      subheading: 'The requested resource or page could not be located. Return to the home experience to explore available 3D creations.'
    });
  }
  if (req.accepts('json')) {
    return res.status(404).json({ error: 'Not Found', status: 404, path: req.originalUrl });
  }
  res.status(404).type('txt').send('404 Not Found');
});

// Centralized 500 error handling middleware
app.use((err, req, res, next) => {
  console.error('[3DWorld Server Error]:', err.stack || err.message || err);
  const status = err.status || err.statusCode || 500;
  if (req.accepts('html')) {
    return res.status(status).render('placeholder', {
      title: `${status} — Server Error | 3DWorld`,
      heading: `${status} — Internal Server Error`,
      subheading: 'An unexpected error occurred while processing your request. Please try refreshing or return to the home page.'
    });
  }
  if (req.accepts('json')) {
    return res.status(status).json({ error: err.message || 'Internal Server Error', status });
  }
  res.status(status).type('txt').send('Server Error');
});

app.listen(PORT, () => {
  console.log(`[3DWorld] Premium Landing Server running at http://localhost:${PORT}`);
});

