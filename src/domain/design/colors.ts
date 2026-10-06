import { fieldIds, templates, type Project } from "./model.js";

/** Replace visible occurrences of one exact color, including template defaults. */
export function replaceProjectColor(
  project: Project,
  from: string,
  to: string,
): Partial<Project> {
  const match = (value: string) => value.toLowerCase() === from.toLowerCase();
  const theme = templates.find((item) => item.id === project.template)!;
  return {
    backgroundColor: match(project.backgroundColor || theme.color)
      ? to
      : project.backgroundColor,
    layouts: Object.fromEntries(
      fieldIds.map((id) => {
        const layout = project.layouts[id];
        return [
          id,
          match(layout.color || theme.text) ? { ...layout, color: to } : layout,
        ];
      }),
    ) as Project["layouts"],
    textLayers: project.textLayers?.map((layer) =>
      match(layer.layout.color || "#252920")
        ? { ...layer, layout: { ...layer.layout, color: to } }
        : layer,
    ),
    graphicLayers: project.graphicLayers?.map((layer) =>
      layer.type === "shape" && match(layer.color)
        ? { ...layer, color: to }
        : layer,
    ),
    covers: project.covers
      ? Object.fromEntries(
          Object.entries(project.covers).map(([id, color]) => [
            id,
            color && match(color) ? to : color,
          ]),
        )
      : undefined,
  };
}

export function documentColors(project: Project): string[] {
  const theme = templates.find((item) => item.id === project.template)!;
  return [
    ...new Set([
      project.backgroundColor || theme.color,
      ...fieldIds.map((id) => project.layouts[id].color || theme.text),
      ...(project.textLayers || []).map(
        (layer) => layer.layout.color || "#252920",
      ),
      ...(project.graphicLayers || [])
        .filter((layer) => layer.type === "shape")
        .map((layer) => (layer.type === "shape" ? layer.color : "")),
    ]),
  ].filter(Boolean);
}
