import { donorCanSupply } from '../blood-compatibility';
import { BloodType } from '../domain/enums';

describe('donorCanSupply', () => {
  it('O- recipient accepts only O- donors', () => {
    expect(donorCanSupply(BloodType.O_NEG, BloodType.O_NEG)).toBe(true);
    expect(donorCanSupply(BloodType.O_NEG, BloodType.O_POS)).toBe(false);
  });

  it('AB+ recipient can receive any type', () => {
    expect(donorCanSupply(BloodType.AB_POS, BloodType.O_NEG)).toBe(true);
    expect(donorCanSupply(BloodType.AB_POS, BloodType.AB_POS)).toBe(true);
  });

  it('A+ recipient accepts O-, O+, A-, A+', () => {
    expect(donorCanSupply(BloodType.A_POS, BloodType.O_NEG)).toBe(true);
    expect(donorCanSupply(BloodType.A_POS, BloodType.A_POS)).toBe(true);
    expect(donorCanSupply(BloodType.A_POS, BloodType.B_POS)).toBe(false);
  });
});
