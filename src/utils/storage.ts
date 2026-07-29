const PREFIX = 'couple-diary';

export const storage = {
  getItem: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(`${PREFIX}:${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  setItem: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(`${PREFIX}:${key}`);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },

  clear: (): void => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(PREFIX));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

export const getUserKey = (userId: string, type: string): string => {
  return `${type}:${userId}`;
};