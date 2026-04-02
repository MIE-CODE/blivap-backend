import { DonorGender } from 'src/shared/domain/enums';

export const QUESTIONNAIRE_VERSION = 1;

export const QuestionnaireKeys = {
  gender: 'gender',
  age18to64: 'age18to64',
  weightUnder50kg: 'weightUnder50kg',
  organOrTissueTransplant: 'organOrTissueTransplant',
  injectedDrugsOrDoping: 'injectedDrugsOrDoping',
  diabetes: 'diabetes',
  bloodProductsOrTransfusion: 'bloodProductsOrTransfusion',
  chronicOrSeriousCondition: 'chronicOrSeriousCondition',
  hepatitisBVaccineLast2Weeks: 'hepatitisBVaccineLast2Weeks',
} as const;

export type QuestionnaireKey =
  (typeof QuestionnaireKeys)[keyof typeof QuestionnaireKeys];

export interface IQuestionnaireAnswers {
  gender: DonorGender;
  /** true = answered yes to "between 18 and 64" */
  age18to64: boolean;
  /** true = weighs less than 50 kg */
  weightUnder50kg: boolean;
  organOrTissueTransplant: boolean;
  injectedDrugsOrDoping: boolean;
  diabetes: boolean;
  bloodProductsOrTransfusion: boolean;
  chronicOrSeriousCondition: boolean;
  hepatitisBVaccineLast2Weeks: boolean;
}
