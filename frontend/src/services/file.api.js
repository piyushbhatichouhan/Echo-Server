import api from "./api";

export const getFiles = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/files`);
  return res.data.data;
};

export const uploadFile = async (projectId, formData) => {
  const res = await api.post(`/projects/${projectId}/files`, formData);

  return res.data.data;
};

export const deleteFile = async (fileId) => {
  const res = await api.delete(`/files/${fileId}`);

  return res.data;
};

export const getFileContent = async (fileId) => {
  const response = await api.get(`/files/${fileId}/content`);

  return response.data.data.content;
};

export const saveFileContent = async (id, content) => {
  const response = await api.put(`/files/${id}/content`, {
    content,
  });

  return response.data;
};

export const downloadFile = async (fileId) => {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data);

  const a = document.createElement("a");
  a.href = url;

  const disposition = response.headers["content-disposition"];

  let filename = "download";

  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);

    if (match) filename = match[1];
  }

  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

export const createFolder = async (projectId, path) => {
  const response = await api.post(`/projects/${projectId}/folders`, {
    path,
  });

  return response.data.data;
};

export const createFile = async (projectId, relativePath) => {
  const response = await api.post(`/projects/${projectId}/files/create`, {
    path: relativePath,
  });

  return response.data.data;
};

export const renameFile = async (projectId, oldPath, newPath, type) => {
  const response = await api.put(`/projects/${projectId}/rename`, {
    oldPath,
    newPath,
    type,
  });

  return response.data;
};
export const deletePath = async (projectId, path, type) => {
  return api.delete(`/projects/${projectId}/path`, {
    data: {
      path,
      type,
    },
  });
};
