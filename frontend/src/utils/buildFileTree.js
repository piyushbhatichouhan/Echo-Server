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
          type: isLast ? (item.is_directory ? "folder" : "file") : "folder",
          children: [],
          file: isLast ? item : null,
        };

        current.push(existing);
      }

      current = existing.children;
    });
  }

  return root;
}
