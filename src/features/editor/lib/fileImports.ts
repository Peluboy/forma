import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** Read approved copy from a user file without changing the open design. */
export async function readManuscriptFile(file: File): Promise<string> {
  if (file.size > 3 * 1024 * 1024)
    throw new Error("Please upload a document smaller than 3 MB.");
  let text: string;
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    text = result.value;
  } else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    try {
      if (pdf.numPages > 25)
        throw new Error("Please use a PDF with no more than 25 pages.");
      const pages: string[] = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const content = await (await pdf.getPage(number)).getTextContent();
        pages.push(
          content.items
            .map((item) =>
              "str" in item
                ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
                : "",
            )
            .join(""),
        );
      }
      text = pages.join("\n\n");
    } finally {
      await pdf.loadingTask.destroy();
    }
  } else if (/\.(txt|md)$/i.test(file.name)) {
    text = await file.text();
  } else {
    throw new Error("Choose a TXT, Markdown, DOCX, or text-based PDF file.");
  }
  if (!text.trim()) throw new Error("This document has no readable text.");
  if (text.length > 30000)
    throw new Error("Please keep manuscripts under 30,000 characters.");
  return text;
}

export async function readReferenceFile(file: File): Promise<{
  data: string;
  name: string;
  height: number;
}> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPG, or WebP image.");
  if (file.size > 2 * 1024 * 1024)
    throw new Error(
      "Please use a reference smaller than 2 MB for local saving.",
    );
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const height = await new Promise<number>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scaledHeight = (720 * image.naturalHeight) / image.naturalWidth;
      if (
        scaledHeight < 180 ||
        scaledHeight > 2400 ||
        image.naturalWidth > 8000 ||
        image.naturalHeight > 8000
      )
        reject(new Error("This image could not be opened. Try another file."));
      else resolve(scaledHeight);
    };
    image.onerror = reject;
    image.src = data;
  });
  return { data, name: file.name, height };
}
