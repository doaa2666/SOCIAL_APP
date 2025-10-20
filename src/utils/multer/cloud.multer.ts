import { v4 as uuid } from "uuid";
import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import { BadRequestException } from "../response/error.response";
import os from "node:os";

export enum StorageEnum {
  memory = "memory",
  disk = "disk",
}

export const fileValidation = {
  image: ["image/jpeg", "image/png", "image/gif"],
};

export const cloudFileUpload = ({
  validation = [],
  storageApproach = StorageEnum.memory,
  maxSizeMB = 2,
}: {
  validation?: string[];
  storageApproach?: StorageEnum;
  maxSizeMB?: number;
}): multer.Multer => {
  const storage =
    storageApproach === StorageEnum.memory
      ? multer.memoryStorage()
      : multer.diskStorage({
          destination: os.tmpdir(),
          filename: (req, file, callback) => {
            callback(null, `${uuid()}_${file.originalname}`);
          },
        });

  function fileFilter(
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ) {
    if (!validation.includes(file.mimetype)) {
      return callback(
        new BadRequestException("Validation error", {
          validationErrors: [
            {
              key: "file",
              issues: [{ path: "file", message: "Invalid file format" }],
            },
          ],
        })
      );
    }
    return callback(null, true);
  }

  return multer({
    fileFilter,
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 }, // MB to bytes
  });
};
