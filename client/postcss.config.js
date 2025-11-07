import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tailwindConfigPath = path.resolve(__dirname, "tailwind.config.js");

export default {
  plugins: [
    tailwindcss({ config: tailwindConfigPath }),
    autoprefixer(),
  ],
};
