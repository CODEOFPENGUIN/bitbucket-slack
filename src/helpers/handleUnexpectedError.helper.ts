export const handleUnexpectedError = (error, eventHeaders?, loggerService?, sourceClass?) => {
  const bodyObject = {
    successOrNot: 'N',
    statusCode: error.name,
    data: { msg: 'An unexpected error occurred!' },
  };
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(bodyObject),
  };
};
