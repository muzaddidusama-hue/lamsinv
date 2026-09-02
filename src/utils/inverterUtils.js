import { supabase } from '../supabaseClient';

// Helper to identify if a product is an Inverter (handles JFY, Solaron, Inhenergy, and all inverter variants)
export const isInverterProduct = (product) => {
  if (!product) return false;
  const category = (product.category || '').toLowerCase().trim();
  const name = (product.name || '').toLowerCase().trim();
  const model = (product.model || '').toLowerCase().trim();
  const desc = (product.description || '').toLowerCase().trim();

  // Exclude solar panels, batteries, and pure accessories
  if (
    category.includes('solar panel') || 
    category.includes('panel 12v') || 
    category.includes('panel 24v') ||
    category.includes('battery') || 
    category.includes('lithium')
  ) {
    return false;
  }

  if (
    (category.includes('accessories') || category.includes('accessory') || category.includes('cable') || category.includes('structure')) &&
    !category.includes('inverter') && !name.includes('inverter')
  ) {
    return false;
  }

  // 1. Inverter keywords in category, name, model, or description
  const inverterKeywords = [
    'inverter', 'hybrid', 'on-grid', 'on grid', 'ongrid', 
    'off-grid', 'off grid', 'offgrid', 'grid-tie', 'grid tie', 
    'grid tied', 'ips', 'ups', 'vfd'
  ];
  if (inverterKeywords.some(kw => category.includes(kw) || name.includes(kw) || model.includes(kw) || desc.includes(kw))) {
    return true;
  }

  // 2. Known inverter brands (JFY, Solaron, Inhenergy, Growatt, Must, SRNE, etc.)
  const inverterBrands = [
    'jfy', 'solaron', 'inhenergy', 'growatt', 'must', 'srne', 
    'felicity', 'deye', 'huawei', 'solis', 'voltronic', 'goodwe', 
    'sma', 'sofar', 'jarrett', 'luminous', 'microtek', 'mictek', 
    'sukam', 'su-kam', 'schneider'
  ];
  if (inverterBrands.some(brand => name.includes(brand) || model.includes(brand))) {
    return true;
  }

  return false;
};

// Helper to determine Inverter Type (On-Grid vs Hybrid)
export const getInverterType = (product) => {
  if (!product) return 'Hybrid';
  const category = (product.category || '').toLowerCase().trim();
  const name = (product.name || '').toLowerCase().trim();
  const model = (product.model || '').toLowerCase().trim();

  const isOnGrid = (
    category.includes('on-grid') || 
    category.includes('on grid') || 
    category.includes('ongrid') || 
    category.includes('grid-tie') || 
    category.includes('grid tie') || 
    category.includes('grid tied') ||
    name.includes('on-grid') || 
    name.includes('on grid') || 
    name.includes('ongrid') ||
    name.includes('jfy') || 
    name.includes('inhenergy') ||
    model.includes('tl') ||
    model.includes('on-grid')
  );

  return isOnGrid ? 'On-Grid' : 'Hybrid';
};

// Helper to automatically save serial numbers to inv_sl (Service & Warranty) database
export const saveInvoiceSerialsToInvSl = async ({
  items,
  billNo,
  chalanNo,
  customerName,
  customerAddress
}) => {
  if (!items || items.length === 0) return;

  const rowsToInsert = [];
  for (let item of items) {
    if (item.serials && Array.isArray(item.serials)) {
      const validSerials = item.serials
        .map(s => typeof s === 'string' ? s.trim().toUpperCase() : '')
        .filter(Boolean);
      
      const invType = getInverterType(item);
      const invModel = item.model || item.name || 'N/A';

      for (let sn of validSerials) {
        rowsToInsert.push({
          bill_no: billNo || 'N/A',
          chalan_no: chalanNo || 'N/A',
          inv_type: invType,
          inv_model: invModel,
          sl_no: sn,
          customer_name: customerName || 'Walk-in',
          address: customerAddress || 'N/A'
        });
      }
    }
  }

  if (rowsToInsert.length > 0) {
    for (let row of rowsToInsert) {
      try {
        const { data: existing } = await supabase
          .from('inv_sl')
          .select('id')
          .eq('sl_no', row.sl_no)
          .maybeSingle();

        if (existing) {
          await supabase.from('inv_sl').update(row).eq('id', existing.id);
        } else {
          await supabase.from('inv_sl').insert([row]);
        }
      } catch (err) {
        console.error(`Error saving serial ${row.sl_no} to inv_sl:`, err);
      }
    }
  }
};
