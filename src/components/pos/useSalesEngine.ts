/**
 * Sales Engine — handles order slip numbers, control numbers,
 * VAT calculations, and completed sale persistence.
 */
import { supabase } from '@/integrations/supabase/client';
import { OrderItem } from './types';
import { calculateItemTotal, calculateItemDiscount } from './useOrderState';

export interface BranchConfig {
  code: string;
  name: string;
  legal_name: string;
  address: string;
  tin: string;
}

export interface VatBreakdown {
  grossSales: number;
  discountTotal: number;
  netSales: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  serviceChargeAmount: number;
  totalAmountDue: number;
}

const DEFAULT_BRANCH: BranchConfig = {
  code: 'QC01',
  name: 'Main Branch',
  legal_name: 'Featherweight Chicken Inc.',
  address: '123 Main St, Quezon City',
  tin: '000-000-000-000',
};

export async function fetchBranchConfig(): Promise<BranchConfig> {
  const { data } = await supabase
    .from('pos_settings')
    .select('setting_value')
    .eq('setting_key', 'branch_config')
    .single();
  if (data?.setting_value) return data.setting_value as unknown as BranchConfig;
  return DEFAULT_BRANCH;
}

export async function fetchVatMode(): Promise<'inclusive' | 'exclusive'> {
  const { data } = await supabase
    .from('pos_settings')
    .select('setting_value')
    .eq('setting_key', 'vat_mode')
    .single();
  if (data?.setting_value) return (data.setting_value as any).mode || 'inclusive';
  return 'inclusive';
}

export async function generateOrderSlipNumber(branchCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('next_order_slip_number' as any, { p_branch_code: branchCode });
  if (error) throw error;
  return data as string;
}

export async function generateControlNumber(): Promise<number> {
  const { data, error } = await supabase.rpc('next_control_number' as any);
  if (error) throw error;
  return data as number;
}

export function calculateVatBreakdown(
  items: OrderItem[],
  serviceChargeAmount: number,
  vatMode: 'inclusive' | 'exclusive'
): VatBreakdown {
  let grossSales = 0;
  let discountTotal = 0;
  let vatExemptSales = 0;

  for (const item of items) {
    const lineTotal = calculateItemTotal(item);
    const lineDiscount = calculateItemDiscount(item);
    grossSales += lineTotal;
    discountTotal += lineDiscount;

    if (item.discount?.is_vat_exempt) {
      vatExemptSales += (lineTotal - lineDiscount);
    }
  }

  const netSales = grossSales - discountTotal;
  const taxableNet = netSales - vatExemptSales;

  let vatableSales: number;
  let vatAmount: number;

  if (vatMode === 'inclusive') {
    vatableSales = Math.round(taxableNet / 1.12 * 100) / 100;
    vatAmount = Math.round((taxableNet - vatableSales) * 100) / 100;
  } else {
    vatableSales = taxableNet;
    vatAmount = Math.round(taxableNet * 0.12 * 100) / 100;
  }

  const totalAmountDue = vatMode === 'inclusive'
    ? netSales + serviceChargeAmount
    : netSales + vatAmount + serviceChargeAmount;

  return {
    grossSales: Math.round(grossSales * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    netSales: Math.round(netSales * 100) / 100,
    vatableSales,
    vatAmount,
    vatExemptSales: Math.round(vatExemptSales * 100) / 100,
    zeroRatedSales: 0,
    serviceChargeAmount: Math.round(serviceChargeAmount * 100) / 100,
    totalAmountDue: Math.round(totalAmountDue * 100) / 100,
  };
}

export async function saveSale(params: {
  orderSlipNumber: string;
  controlNumber: number;
  items: OrderItem[];
  vatBreakdown: VatBreakdown;
  paymentMethod: string;
  cashierName: string;
  branchCode: string;
  serviceChargePercent: number;
  transactionId?: string;
}) {
  const { error } = await supabase.from('completed_sales').insert({
    order_slip_number: params.orderSlipNumber,
    control_number: params.controlNumber,
    order_items: JSON.parse(JSON.stringify(params.items)) as any,
    line_discounts: JSON.parse(JSON.stringify(
      params.items.filter(i => i.discount).map(i => ({
        item: i.menuItem.name,
        discount: i.discount,
      }))
    )) as any,
    subtotal: params.vatBreakdown.netSales,
    service_charge_percent: params.serviceChargePercent,
    service_charge_amount: params.vatBreakdown.serviceChargeAmount,
    gross_sales: params.vatBreakdown.grossSales,
    discount_total: params.vatBreakdown.discountTotal,
    net_sales: params.vatBreakdown.netSales,
    vatable_sales: params.vatBreakdown.vatableSales,
    vat_amount: params.vatBreakdown.vatAmount,
    vat_exempt_sales: params.vatBreakdown.vatExemptSales,
    zero_rated_sales: params.vatBreakdown.zeroRatedSales,
    total_amount_due: params.vatBreakdown.totalAmountDue,
    payment_method: params.paymentMethod,
    cashier_name: params.cashierName,
    branch_code: params.branchCode,
    transaction_id: params.transactionId,
  } as any);

  if (error) throw error;
}
