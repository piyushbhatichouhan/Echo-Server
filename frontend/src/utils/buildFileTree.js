export default function buildFileTree(files) {
  const root = [];

  for (const file of files) {
    const parts = file.relative_path.split("/");

    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;

      const nodeType = isLast
        ? file.is_directory
          ? "folder"
          : "file"
        : "folder";

      let existing = current.find((item) => item.name === part);

      if (!existing) {
        existing = {
          name: part,
          type: nodeType,
          children: [],
          file: nodeType === "file" ? file : null,
        };

        current.push(existing);
      }

      current = existing.children;
    });
  }

  return root;
}
