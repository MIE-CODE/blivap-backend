import { Injectable } from '@nestjs/common';
import * as moment from 'moment';

import {
  EligibilityStatus,
  IneligibilityReasonCode,
} from 'src/shared/domain/enums';

import type { IQuestionnaireAnswers } from '../constants/questionnaire';

export type EligibilityResult = {
  status: EligibilityStatus;
  reasons: IneligibilityReasonCode[];
};

@Injectable()
export class EligibilityService {
  evaluate(
    answers: IQuestionnaireAnswers,
    dateOfBirth: Date | null | undefined,
  ): EligibilityResult {
    const reasons: IneligibilityReasonCode[] = [];

    if (dateOfBirth) {
      const age = moment().diff(moment(dateOfBirth), 'years');
      const inRange = age >= 18 && age <= 64;
      if (answers.age18to64 !== inRange) {
        reasons.push(IneligibilityReasonCode.AGE_MISMATCH_PROFILE);
      }
      if (!inRange) {
        reasons.push(IneligibilityReasonCode.AGE_RANGE);
      }
    } else if (!answers.age18to64) {
      reasons.push(IneligibilityReasonCode.AGE_RANGE);
    }

    if (answers.weightUnder50kg) {
      reasons.push(IneligibilityReasonCode.WEIGHT_UNDER_50KG);
    }
    if (answers.organOrTissueTransplant) {
      reasons.push(IneligibilityReasonCode.ORGAN_TRANSPLANT);
    }
    if (answers.injectedDrugsOrDoping) {
      reasons.push(IneligibilityReasonCode.INJECTED_DRUGS);
    }
    if (answers.diabetes) {
      reasons.push(IneligibilityReasonCode.DIABETES);
    }
    if (answers.chronicOrSeriousCondition) {
      reasons.push(IneligibilityReasonCode.CHRONIC_CONDITION);
    }

    const deferralReasons: IneligibilityReasonCode[] = [];
    if (answers.bloodProductsOrTransfusion) {
      deferralReasons.push(IneligibilityReasonCode.BLOOD_PRODUCTS_RECENT);
    }
    if (answers.hepatitisBVaccineLast2Weeks) {
      deferralReasons.push(IneligibilityReasonCode.HEP_B_VACCINE_RECENT);
    }

    const all = [...reasons, ...deferralReasons];
    const unique = [...new Set(all)];

    if (reasons.length > 0) {
      return {
        status: EligibilityStatus.Ineligible,
        reasons: unique,
      };
    }

    if (deferralReasons.length > 0) {
      return {
        status: EligibilityStatus.PendingReview,
        reasons: deferralReasons,
      };
    }

    return {
      status: EligibilityStatus.Eligible,
      reasons: [],
    };
  }
}
