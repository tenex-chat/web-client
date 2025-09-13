import { UPLOAD_STATUS, type UploadStatus } from "@/lib/constants";

export const filterUploadsByStatus = <T extends { status: UploadStatus }>(
  items: T[],
  status: UploadStatus,
): T[] => {
  return items.filter((item) => item.status === status);
};

export const getActiveUploads = <T extends { status: UploadStatus }>(
  items: T[],
): T[] => {
  return items.filter(
    (item) =>
      item.status === UPLOAD_STATUS.PENDING ||
      item.status === UPLOAD_STATUS.UPLOADING,
  );
};

export const getCompletedUploads = <T extends { status: UploadStatus }>(
  items: T[],
): T[] => {
  return filterUploadsByStatus(items, UPLOAD_STATUS.COMPLETED);
};

export const getFailedUploads = <T extends { status: UploadStatus }>(
  items: T[],
): T[] => {
  return filterUploadsByStatus(items, UPLOAD_STATUS.FAILED);
};

export const getUploadStatusIcon = (status: UploadStatus) => {
  switch (status) {
    case UPLOAD_STATUS.PENDING:
      return "clock";
    case UPLOAD_STATUS.UPLOADING:
      return "loader";
    case UPLOAD_STATUS.COMPLETED:
      return "check-circle";
    case UPLOAD_STATUS.FAILED:
      return "x-circle";
    default:
      return "file";
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};
