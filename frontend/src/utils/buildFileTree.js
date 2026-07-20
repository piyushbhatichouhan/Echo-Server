export default function buildFileTree(files) {
  const root = [];

  for (const item of files) {
    const parts = item.relative_path.split("/");

    let current = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;

      currentPath = currentPath === "" ? part : `${currentPath}/${part}`;

      let existing = current.find((node) => node.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: "folder",
          children: [],
          file: null,
        };

        current.push(existing);
      }

      if (isLast && item.is_directory && existing.file === null) {
        existing.file = item;
      }

      if (isLast) {
        existing.file = item;
        existing.type = item.is_directory ? "folder" : "file";
      }

      current = existing.children;
    });
  }

  return root;
}
