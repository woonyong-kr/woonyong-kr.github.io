// postcss.config.js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},  
    "postcss-nested": {},        
    ...(process.env.NODE_ENV === "production" ? { cssnano: { preset: "default" } } : {})
  },
};
