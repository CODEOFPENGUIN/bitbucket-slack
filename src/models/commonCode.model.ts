import { ActionType } from './validationType.enum';
import { object, string } from 'yup';
export interface CommonCode {
  codeName: string;
  codeId: string;
}

export interface CommonCodeRequest {
  groupCodeId: string;
  languageCode?: string;
}

export const commonCodeSchema = {
  [ActionType.GET]: object({
    groupCodeId: string()
      .required()
      .min(1)
      .max(100),
    languageCode: string().max(10),
  }),
};
