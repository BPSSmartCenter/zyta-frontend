import preline from "preline/plugin";

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/preline/dist/*.js",
  ],
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  screen: {
    sm: { min: "375px", max: "819px" },

    md: { min: "820px", max: "1023px" },
    lg: { min: "1024px", max: "1439px" },
    wide: "1440px",
  },
  variants: {
    extend: {},
  },
  plugins: [preline],
};
