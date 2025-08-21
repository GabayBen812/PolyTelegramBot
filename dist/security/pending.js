const pending = new Map();
export const setPending = (chatId, plan) => pending.set(chatId, plan);
export const getPending = (chatId) => pending.get(chatId);
export const clearPending = (chatId) => pending.delete(chatId);
