import { CommonCodeQuery } from '../query/commonCode.query';

export interface CommonCodeRepositoryInterface {
  query<T>(connection: any, query: CommonCodeQuery, params: any[]): Promise<T[]>;
}
