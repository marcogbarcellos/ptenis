import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });
for (const tamanho of [180, 192, 512]) {
  await sharp("public/icon.svg").resize(tamanho, tamanho).png()
    .toFile(`public/icons/icon-${tamanho}.png`);
}
console.log("Ícones gerados.");
