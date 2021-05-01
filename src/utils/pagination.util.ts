export class PaginationUtil {
  private defaultStartIndex = 0;
  private defaultMaxPage = 10;
  private prefixPageQuery = ' limit ';
  public getQueryForPagination(query: string, startIndex: number, maxPage: number = this.defaultMaxPage): string {
    if (startIndex === undefined || startIndex < 0) {
      startIndex = this.defaultStartIndex;
    }
    return query
      .concat(this.prefixPageQuery)
      .concat(startIndex.toString())
      .concat(', ')
      .concat(maxPage.toString());
  }
}
