// tailwind.config.js
import preline from "preline/plugin";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/preline/dist/*.js",
  ],
  theme: {
    screens: {
      sm: "375px",
      md: "820px",
      "lg-1024": "1024px",  
      lg: "1239px",
      wide: "1440px",
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [preline],
};
