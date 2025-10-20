import { CreateOptions, HydratedDocument, Model } from "mongoose";
import { IToken as TDocument } from "../../DB/model/Token.model";
import { DatabaseRepository } from "./database.repository";
import { BadRequestException } from "../../utils/response/error.response";

export class TokenRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }

  async createToken({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions;
  }): Promise<HydratedDocument<TDocument>> {
    const [token] = (await this.create({ data, options })) || [];
    if (!token) {
      throw new BadRequestException("fail to create token");
    }
    return token;
  }
}
