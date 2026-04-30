// Nepal TDS & Payroll Calculation Engine

export interface TaxSlab {
  size: number; // 0 = unlimited top bracket
  rate: number; // percentage
}

export interface FYData {
  threshSingle: number;
  threshCouple: number;
  femaleRebate: number;
  disabilityRebate: number;
  capRetirement: number;
  capLife: number;
  capMed: number;
  capHouse: number;
  slabs: TaxSlab[];
}

export const IRD_DATA: Record<string, FYData> = {
  '2082/083': {
    threshSingle: 500000, threshCouple: 600000, femaleRebate: 10, disabilityRebate: 50,
    capRetirement: 500000, capLife: 40000, capMed: 20000, capHouse: 5000,
    slabs: [
      { size: 0, rate: 1 },
      { size: 200000, rate: 10 },
      { size: 300000, rate: 20 },
      { size: 1000000, rate: 30 },
      { size: 3000000, rate: 36 },
      { size: 0, rate: 39 },
    ],
  },
  '2081/082': {
    threshSingle: 500000, threshCouple: 600000, femaleRebate: 10, disabilityRebate: 50,
    capRetirement: 500000, capLife: 40000, capMed: 20000, capHouse: 5000,
    slabs: [
      { size: 0, rate: 1 },
      { size: 200000, rate: 10 },
      { size: 300000, rate: 20 },
      { size: 1000000, rate: 30 },
      { size: 3000000, rate: 36 },
      { size: 0, rate: 39 },
    ],
  },
};

export type TaxpayerType = 'single' | 'couple';
export type Gender = 'male' | 'female' | 'other';

export interface PayrollEmployee {
  id: number;
  name: string;
  tp: TaxpayerType;
  gd: Gender;
  absentDays: number;
  unpaidLeave: number;
  monthlySalary: number;
  disabled: boolean;
  pf: number;
  dashain: number;
  extraTime: number;
  bonus: number;
  cit: number;
  healthInsurance: number;
  lifeInsurance: number;
  pan?: string;
  ssfId?: string;
  designation?: string;
  totalWorkingDays?: number;
  workingDaysAttended?: number;
  paidLeave?: number;
  sickLeave?: number;
  hasSSF?: boolean;
  employmentType?: 'full-time' | 'contract';
}

export interface TaxBandBreakdown {
  label: string;
  from: number;
  to: number;
  rate: number;
  taxable: number;
  tax: number;
}

export interface PayrollResult extends PayrollEmployee {
  actualSalary: number;
  basic: number;
  allowance: number;
  ssf11: number;
  ssf20: number;
  totalIncome: number;
  ssf31: number;
  monthlyTax: number;
  totalDeduct: number;
  netPay: number;
  annGross: number;
  taxableIncome: number;
  annTax: number;
  effRate: number;
  yearlySSF: number;
  yearlyCIT: number;
  totalSSFCIT: number;
  deductionLimit: number;
  oneThirdIncome: number;
  minDeduction: number;
  taxBands: TaxBandBreakdown[];
  sstWaived: boolean;
}

function buildRanges(fyData: FYData, tp: TaxpayerType) {
  const base = tp === 'couple' ? fyData.threshCouple : fyData.threshSingle;
  let c = base;
  return fyData.slabs.map((s, i) => {
    const isTop = s.size === 0 || i === fyData.slabs.length - 1;
    const upper = isTop ? Infinity : c + s.size;
    const r = { from: c, to: upper, rate: s.rate / 100 };
    if (!isTop) c = upper;
    return r;
  });
}

function calcTaxFromRangesWithBands(
  taxable: number,
  ranges: { from: number; to: number; rate: number }[],
  fyData: FYData,
  tp: TaxpayerType,
  sstWaived: boolean
): { tax: number; bands: TaxBandBreakdown[] } {
  let tax = 0;
  const bands: TaxBandBreakdown[] = [];
  const base = tp === 'couple' ? fyData.threshCouple : fyData.threshSingle;

  // SST band — waived if employee has SSF contribution and is full-time
  if (!sstWaived) {
    const sstTaxable = Math.min(taxable, base);
    const sstTax = sstTaxable * 0.01;
    if (sstTaxable > 0) {
      bands.push({ label: 'SST(1%)', from: 0, to: base, rate: 1, taxable: sstTaxable, tax: sstTax });
    }
    tax += sstTax;
  } else {
    // Show waived band for transparency
    const sstTaxable = Math.min(taxable, base);
    if (sstTaxable > 0) {
      bands.push({ label: 'SST(1%) — Waived (SSF)', from: 0, to: base, rate: 0, taxable: sstTaxable, tax: 0 });
    }
  }

  for (const r of ranges) {
    if (taxable <= r.from) break;
    const upper = Math.min(taxable, r.to === Infinity ? taxable + 1 : r.to);
    const chunk = upper - r.from;
    if (chunk <= 0) continue;
    const bandTax = chunk * r.rate;
    tax += bandTax;
    bands.push({
      label: `${(r.rate * 100).toFixed(0)}%`,
      from: r.from,
      to: r.to === Infinity ? taxable : r.to,
      rate: r.rate * 100,
      taxable: chunk,
      tax: bandTax,
    });
    if (r.to === Infinity) break;
  }
  return { tax, bands };
}

function applyRebates(tax: number, fyData: FYData, gd: Gender, disabled: boolean) {
  let rebate = 0;
  if (gd === 'female' && fyData.femaleRebate) rebate += tax * fyData.femaleRebate / 100;
  if (disabled && fyData.disabilityRebate) rebate += tax * fyData.disabilityRebate / 100;
  return Math.max(0, tax - rebate);
}

export function calculatePayroll(emp: PayrollEmployee, fyKey: string, workingDays: number = 30): PayrollResult {
  const d = IRD_DATA[fyKey] || IRD_DATA['2082/083'];
  const wd = workingDays || 30;

  const actualSalary = Math.max(0, emp.monthlySalary - (emp.monthlySalary / wd) * (emp.absentDays + emp.unpaidLeave));
  const basic = actualSalary * 0.6;
  const allowance = actualSalary * 0.4;
  const ssf20 = basic * 0.20;
  const dashain = emp.dashain;
  const extraTime = emp.extraTime;
  const bonus = emp.bonus;
  const totalIncome = actualSalary + ssf20 + dashain + extraTime + bonus;

  const ssf31 = basic * 0.31;
  const cit = emp.cit;
  const pf = emp.pf;
  const healthIns = Math.min(emp.healthInsurance || 0, d.capMed);
  const lifeIns = Math.min(emp.lifeInsurance || 0, d.capLife);

  // Annual gross
  const annGross = (actualSalary + ssf20) * 12 + dashain * 12 + extraTime * 12 + bonus * 12;

  // Deduction calculation per Nepal rules
  const yearlySSF = ssf31 * 12;
  const yearlyCIT = cit * 12;
  const totalSSFCIT = yearlySSF + yearlyCIT;
  const deductionLimit = d.capRetirement;
  const oneThirdIncome = annGross / 3;
  const minDeduction = Math.min(totalSSFCIT, deductionLimit, oneThirdIncome);
  const insDed = lifeIns + healthIns;
  const totalAnnualDed = minDeduction + insDed;

  const taxableIncome = Math.max(0, annGross - totalAnnualDed);

  // SST is waived if employee has SSF contribution AND is full-time
  const sstWaived = !!(emp.hasSSF && emp.employmentType === 'full-time');

  const ranges = buildRanges(d, emp.tp);
  const { tax: rawTax, bands } = calcTaxFromRangesWithBands(taxableIncome, ranges, d, emp.tp, sstWaived);
  const annTax = applyRebates(rawTax, d, emp.gd, emp.disabled);
  const monthlyTax = annTax / 12;

  const totalDeduct = ssf31 + cit + pf + monthlyTax;
  const netPay = totalIncome - totalDeduct;

  return {
    ...emp,
    actualSalary,
    basic,
    allowance,
    ssf11: 0,
    ssf20,
    totalIncome,
    ssf31,
    cit,
    pf,
    monthlyTax,
    totalDeduct,
    netPay,
    annGross,
    taxableIncome,
    annTax,
    effRate: taxableIncome > 0 ? annTax / taxableIncome : 0,
    yearlySSF,
    yearlyCIT,
    totalSSFCIT,
    deductionLimit,
    oneThirdIncome,
    minDeduction,
    taxBands: bands,
    sstWaived,
  };
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

export const NEPALI_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];
