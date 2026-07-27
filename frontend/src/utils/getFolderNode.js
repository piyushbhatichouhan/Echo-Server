export default function getFolderNode(tree, folderPath) {
  if (!folderPath) {
    return {
      children: tree,
    };
  }

  const parts = folderPath.split("/");

  let current = {
    children: tree,
  };

  for (const part of parts) {
    current = current.children.find(
      (node) => node.type === "folder" && node.name === part,
    );

    if (!current) {
      return {
        children: [],
      };
    }
  }

  return current;
}
