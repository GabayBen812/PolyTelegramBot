type Plan = any; // use your plan type
const pending = new Map<number, Plan>();
export const setPending = (chatId: number, plan: Plan) => pending.set(chatId, plan);
export const getPending = (chatId: number) => pending.get(chatId);
export const clearPending = (chatId: number) => pending.delete(chatId);
