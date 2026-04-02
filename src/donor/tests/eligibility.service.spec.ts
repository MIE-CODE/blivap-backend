import {
  DonorGender,
  EligibilityStatus,
  IneligibilityReasonCode,
} from 'src/shared/domain/enums';

import { EligibilityService } from '../services/eligibility.service';

describe('EligibilityService', () => {
  const service = new EligibilityService();

  const base = {
    gender: DonorGender.Female,
    age18to64: true,
    weightUnder50kg: false,
    organOrTissueTransplant: false,
    injectedDrugsOrDoping: false,
    diabetes: false,
    bloodProductsOrTransfusion: false,
    chronicOrSeriousCondition: false,
    hepatitisBVaccineLast2Weeks: false,
  };

  it('marks eligible when answers pass and DOB in range', () => {
    const dob = new Date('1995-06-01');
    const r = service.evaluate(base, dob);
    expect(r.status).toBe(EligibilityStatus.Eligible);
    expect(r.reasons).toHaveLength(0);
  });

  it('ineligible when under 50 kg', () => {
    const r = service.evaluate(
      { ...base, weightUnder50kg: true },
      new Date('1995-06-01'),
    );
    expect(r.status).toBe(EligibilityStatus.Ineligible);
    expect(r.reasons).toContain(IneligibilityReasonCode.WEIGHT_UNDER_50KG);
  });

  it('pending_review when recent blood products only', () => {
    const r = service.evaluate(
      { ...base, bloodProductsOrTransfusion: true },
      new Date('1995-06-01'),
    );
    expect(r.status).toBe(EligibilityStatus.PendingReview);
    expect(r.reasons).toContain(IneligibilityReasonCode.BLOOD_PRODUCTS_RECENT);
  });
});
