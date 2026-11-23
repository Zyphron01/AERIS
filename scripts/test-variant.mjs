import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

async function test(customVariant) {
  const css = `@import "tailwindcss";\n${customVariant}\n.my-box {\n  @apply dark:bg-black;\n}`;
  const res = await postcss([tailwind()]).process(css, { from: undefined });
  const lines = res.css.split("\n");
  const myBoxLines = lines.filter(l => l.includes("my-box") || l.includes("dark"));
  console.log("Matched lines for:", customVariant);
  console.log(myBoxLines.join("\n"));
}

await test("@custom-variant dark (&:where(.dark, .dark *));");
await test("@variant dark (&:where(.dark, .dark *));");
