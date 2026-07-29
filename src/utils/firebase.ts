export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> => {
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]);
};

export const firestoreAvailable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://firestore.googleapis.com/', {
      signal: controller.signal,
      method: 'HEAD',
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};