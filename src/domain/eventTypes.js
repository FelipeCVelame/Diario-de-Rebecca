/**
 * Taxonomia de tipos de evento (puro, sem DOM). Portável para qualquer stack.
 * Espelha os tipos usados em app.js.
 */
export const FOOD_TYPES = ["snack", "lunch", "dinner"];
export const APPT_TYPES = ["appt_medical", "appt_class", "appt_other"];

export const isFoodSolid = (type) => FOOD_TYPES.includes(type);
export const isAppt = (type) => APPT_TYPES.includes(type);
