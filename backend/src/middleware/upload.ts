import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const MAX_FILE_SIZE =
  parseInt(process.env.MAX_FILE_SIZE_MB || "10") * 1024 * 1024;
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "image/jpeg",
    "image/png",
  ],
};
const ALL_ALLOWED = [
  ...ALLOWED_MIME_TYPES.image,
  ...ALLOWED_MIME_TYPES.document,
];
const createFileFilter =
  (allowedTypes: string[]) =>
  (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type:${file.mimetype}.Allowed:${allowedTypes.join(",")}`,
        ),
      );
    }
  };
//For Profile Images
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: createFileFilter(ALLOWED_MIME_TYPES.image),
});

//For employee documents
export const uploadDocuments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: createFileFilter(ALLOWED_MIME_TYPES.document),
});
//General
export const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: createFileFilter(ALL_ALLOWED),
});
