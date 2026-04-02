import { BloodType } from './domain/enums';

/** RBC compatibility: donor blood type can supply recipient need. */
export function donorCanSupply(
  recipientNeed: BloodType,
  donor: BloodType,
): boolean {
  const map: Record<BloodType, BloodType[]> = {
    [BloodType.O_NEG]: [BloodType.O_NEG],
    [BloodType.O_POS]: [BloodType.O_NEG, BloodType.O_POS],
    [BloodType.A_NEG]: [BloodType.O_NEG, BloodType.A_NEG],
    [BloodType.A_POS]: [
      BloodType.O_NEG,
      BloodType.O_POS,
      BloodType.A_NEG,
      BloodType.A_POS,
    ],
    [BloodType.B_NEG]: [BloodType.O_NEG, BloodType.B_NEG],
    [BloodType.B_POS]: [
      BloodType.O_NEG,
      BloodType.O_POS,
      BloodType.B_NEG,
      BloodType.B_POS,
    ],
    [BloodType.AB_NEG]: [
      BloodType.O_NEG,
      BloodType.A_NEG,
      BloodType.B_NEG,
      BloodType.AB_NEG,
    ],
    [BloodType.AB_POS]: [
      BloodType.O_NEG,
      BloodType.O_POS,
      BloodType.A_NEG,
      BloodType.A_POS,
      BloodType.B_NEG,
      BloodType.B_POS,
      BloodType.AB_NEG,
      BloodType.AB_POS,
    ],
  };
  return map[recipientNeed]?.includes(donor) ?? false;
}
