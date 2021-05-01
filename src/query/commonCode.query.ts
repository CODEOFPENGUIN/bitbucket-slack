export enum CommonCodeQuery {
  getCommonCode,
}

export const CommonCodeQueryString = {
  [CommonCodeQuery.getCommonCode]:
    'SELECT c.code_name AS codeName, \
             c.code_id AS codeId \
      FROM	 common_code_meta m \
      INNER JOIN group_code g ON  m.group_code_id = g.group_code_id \
      INNER JOIN common_code c ON m.code_id = c.code_id \
      AND    m.group_code_id = c.group_code_id \
      WHERE  m.group_code_id = ? \
      AND    c.language_code = ? \
      AND 	 m.use_yn = "Y" \
      ORDER BY m.code_order',
};
