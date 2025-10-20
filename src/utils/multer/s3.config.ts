import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
  GetObjectCommand,
  GetObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import { StorageEnum } from "./cloud.multer";
import { createReadStream } from "fs";
import { BadRequestException } from "../response/error.response";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Config = () => {
  return new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
};

// ======================================
// Upload Single Small File
// ======================================
export const uploadFile = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = "private",
  path = "general",
  file,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket,
    ACL,
    Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${file.originalname}`,
    Body:
      storageApproach === StorageEnum.memory
        ? file.buffer
        : createReadStream(file.path),
    ContentType: file.mimetype,
  });

  await s3Config().send(command);

  if (!command.input.Key) {
    throw new BadRequestException("Failed to generate upload key");
  }

  return command.input.Key;
};

// ======================================
// Upload Large File (Multipart)
// ======================================
export const uploadLargeFile = async ({
  storageApproach = StorageEnum.disk,
  Bucket = process.env.AWS_BUCKET_NAME,
  ACL = "private",
  path = "general",
  file,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}): Promise<string> => {
  const upload = new Upload({
    client: s3Config(),
    params: {
      Bucket,
      ACL,
      Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${file.originalname}`,
      Body:
        storageApproach === StorageEnum.disk
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype,
    },
  });
  upload.on("httpUploadProgress", (progress) => {
    console.log("Upload file Progress ::: ", progress);
  });
  const { Key } = await upload.done();

  if (!Key) {
    throw new BadRequestException("Failed to generate upload key");
  }

  return Key;
};

// ======================================
// Upload Multiple Files
// ======================================
export const uploadFiles = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = "private",
  path = "general",
  files,
  useLarge = false,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  files: Express.Multer.File[];
  useLarge?: boolean;
}): Promise<string[]> => {
  return useLarge
    ? Promise.all(
        files.map((file) =>
          uploadLargeFile({ file, storageApproach, path, Bucket, ACL })
        )
      )
    : Promise.all(
        files.map((file) =>
          uploadFile({ file, storageApproach, path, Bucket, ACL })
        )
      );
};

// ======================================
// Create Pre-Signed Upload Link
// ======================================
export const createPreSignedUploadLink = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path = "general",
  expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
  ContentType,
  Originalname,
}: {
  Bucket?: string;
  path?: string;
  Originalname: string;
  ContentType: string;
  expiresIn?: number;
}): Promise<{ url: string; key: string }> => {
  const command = new PutObjectCommand({
    Bucket,
    Key: `${process.env.APPLICATION_NAME}/${uuid()}_pre_${Originalname}`,
    ContentType,
  });

  const url = await getSignedUrl(s3Config(), command, { expiresIn });

  if (!url || !command.input.Key) {
    throw new BadRequestException("Fail to create pre-signed URL");
  }

  return { url, key: command.input.Key as string };
};

// ======================================
// Create Pre-Signed GET Link
// ======================================
export const createGetPreSignedLink = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  key,
  expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
  downloadName = "dummy",
  download = "false",
}: {
  Bucket?: string;
  key: string;
  expiresIn?: number;
  downloadName?: string;
  download?: string;
}): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket,
    Key: key,
    ResponseContentDisposition:
      download === "true"
        ? `attachment; filename="${downloadName || key.split("/").pop()}"`
        : undefined,
  });

  const url = await getSignedUrl(s3Config(), command, { expiresIn });

  if (!url) {
    throw new BadRequestException("Fail to create pre-signed URL");
  }

  return url;
};

// ======================================
// Get File
// ======================================
export const getFile = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  key,
}: {
  Bucket?: string;
  key: string;
}): Promise<GetObjectCommandOutput> => {
  const command = new GetObjectCommand({
    Bucket,
    Key: key,
  });
  return await s3Config().send(command);
};

// ======================================
// Delete Single File
// ======================================
export const deleteFile = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  key,
}: {
  Bucket?: string;
  key: string;
}): Promise<DeleteObjectCommandOutput> => {
  const command = new DeleteObjectCommand({
    Bucket,
    Key: key,
  });

  return await s3Config().send(command);
};

// ======================================
// Delete Multiple Files
// ======================================
export const deleteFiles = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  urls,
  Quiet = false,
}: {
  Bucket?: string;
  urls: string[];
  Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
  const Objects = urls.map((url) => ({ Key: url }));

  const command = new DeleteObjectsCommand({
    Bucket,
    Delete: {
      Objects,
      Quiet,
    },
  });

  return s3Config().send(command);
};

// ======================================
// List Files in Directory
// ======================================
export const listDirectoryFiles = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path,
}: {
  Bucket?: string;
  path: string;
}) => {
  const command = new ListObjectsV2Command({
    Bucket,
    Prefix: `${process.env.APPLICATION_NAME}/${path}`,
  });

  return s3Config().send(command);
};

// ======================================
// Delete Folder by Prefix
// ======================================
export const deleteFolderByPrefix = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path,
  Quiet = false,
}: {
  Bucket?: string;
  path: string;
  Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
  const fileList = await listDirectoryFiles({ Bucket, path });

  if (!fileList?.Contents?.length) {
    throw new BadRequestException("Empty directory");
  }

  const urls: string[] = fileList.Contents.map(
    (file) => file.Key as string
  );

  return await deleteFiles({ urls, Bucket, Quiet });
};
