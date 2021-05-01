export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum TargetService {
  WORKPLACE,
  SYSTEM_META,
  SECURITY,
  VISIT,
}

export enum ServiceUrl {
  SECURITY_SESSION = '/v1/session',
}
