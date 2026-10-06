import interNormal from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import interItalic from "@fontsource-variable/inter/files/inter-latin-wght-italic.woff2?url";
import robotoNormal from "@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2?url";
import robotoItalic from "@fontsource-variable/roboto/files/roboto-latin-wght-italic.woff2?url";
import dmSansNormal from "@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url";
import dmSansItalic from "@fontsource-variable/dm-sans/files/dm-sans-latin-wght-italic.woff2?url";
import manropeNormal from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url";
import jakartaNormal from "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url";
import jakartaItalic from "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-italic.woff2?url";
import spaceNormal from "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url";
import playfairNormal from "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2?url";
import playfairItalic from "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2?url";
import loraNormal from "@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url";
import loraItalic from "@fontsource-variable/lora/files/lora-latin-wght-italic.woff2?url";
import type { Project } from "../../../domain/design/model";

const assets: Record<string, { normal: string; italic?: string }> = {
  Inter: { normal: interNormal, italic: interItalic },
  Roboto: { normal: robotoNormal, italic: robotoItalic },
  "DM Sans": { normal: dmSansNormal, italic: dmSansItalic },
  Manrope: { normal: manropeNormal },
  "Plus Jakarta Sans": { normal: jakartaNormal, italic: jakartaItalic },
  "Space Grotesk": { normal: spaceNormal },
  "Playfair Display": { normal: playfairNormal, italic: playfairItalic },
  Lora: { normal: loraNormal, italic: loraItalic },
};

const dataUrlCache = new Map<string, Promise<string>>();

function dataUrl(url: string): Promise<string> {
  if (!dataUrlCache.has(url)) {
    dataUrlCache.set(
      url,
      fetch(url)
        .then(async (response) => {
          if (!response.ok)
            throw new Error("A selected font could not be loaded for export.");
          const blob = await response.blob();
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () =>
              reject(new Error("A selected font could not be embedded."));
            reader.readAsDataURL(blob);
          });
        })
        .catch((error) => {
          dataUrlCache.delete(url);
          throw error;
        }),
    );
  }
  return dataUrlCache.get(url)!;
}

/** SVG-as-image rasterization cannot rely on page CSS; embed only fonts in use. */
export async function embedProjectFonts(
  svg: Document,
  project: Project,
): Promise<void> {
  const uses = new Map<string, Set<"normal" | "italic">>();
  const layouts = [
    ...Object.values(project.layouts),
    ...(project.textLayers || []).map((layer) => layer.layout),
  ];
  for (const layout of layouts) {
    if (!layout.fontFamily || !assets[layout.fontFamily]) continue;
    const styles =
      uses.get(layout.fontFamily) || new Set<"normal" | "italic">();
    styles.add(
      layout.italic && assets[layout.fontFamily].italic ? "italic" : "normal",
    );
    uses.set(layout.fontFamily, styles);
  }
  if (!uses.size) return;
  const rules = await Promise.all(
    [...uses].flatMap(([family, styles]) =>
      [...styles].map(async (style) => {
        const src = await dataUrl(
          assets[family][style] || assets[family].normal,
        );
        return `@font-face{font-family:"${family}";font-style:${style};font-weight:100 900;src:url("${src}") format("woff2")}`;
      }),
    ),
  );
  const style = svg.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = rules.join("\n");
  svg.documentElement.insertBefore(style, svg.documentElement.firstChild);
}
