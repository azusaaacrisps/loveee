import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

export const formatDate = (date: string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

export const formatRelativeDate = (date: string): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diffDays = now.diff(target, 'day');

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays === 2) {
    return '前天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatDate(date, 'MM月DD日');
  }
};

export const calculateDaysTogether = (startDate: string): number => {
  const now = dayjs();
  const start = dayjs(startDate);
  return now.diff(start, 'day') + 1;
};

export const calculateDaysUntil = (targetDate: string): number => {
  const now = dayjs();
  const target = dayjs(targetDate);
  
  const thisYearTarget = target.clone().year(now.year());
  const nextYearTarget = target.clone().year(now.year() + 1);
  
  const thisYearDiff = thisYearTarget.diff(now, 'day');
  const nextYearDiff = nextYearTarget.diff(now, 'day');
  
  return thisYearDiff >= 0 ? thisYearDiff : nextYearDiff;
};

export const calculateDaysSince = (targetDate: string): number => {
  const now = dayjs();
  const target = dayjs(targetDate);
  return now.diff(target, 'day');
};

export const getThisMonthDays = (): number => {
  return dayjs().daysInMonth();
};

export const getThisMonthRecords = <T extends { createdAt: string }>(
  records: T[],
  month?: number,
  year?: number
): T[] => {
  const filterYear = year ?? dayjs().year();
  const filterMonth = month ?? dayjs().month();
  
  return records.filter(record => {
    const date = dayjs(record.createdAt);
    return date.year() === filterYear && date.month() === filterMonth;
  });
};

export const getYearsWithRecords = <T extends { createdAt: string }>(
  records: T[]
): number[] => {
  const years = new Set<number>();
  records.forEach(record => {
    years.add(dayjs(record.createdAt).year());
  });
  return Array.from(years).sort((a, b) => b - a);
};

export const getMonthsWithRecords = <T extends { createdAt: string }>(
  records: T[],
  year: number
): number[] => {
  const months = new Set<number>();
  records.forEach(record => {
    const date = dayjs(record.createdAt);
    if (date.year() === year) {
      months.add(date.month());
    }
  });
  return Array.from(months).sort((a, b) => b - a);
};

export const getDaysWithRecords = <T extends { createdAt: string }>(
  records: T[],
  year: number,
  month: number
): number[] => {
  const days = new Set<number>();
  records.forEach(record => {
    const date = dayjs(record.createdAt);
    if (date.year() === year && date.month() === month) {
      days.add(date.date());
    }
  });
  return Array.from(days).sort((a, b) => b - a);
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getDefaultTogetherDate = (): string => {
  return dayjs().subtract(100, 'day').format('YYYY-MM-DD');
};

export const getToday = (): string => {
  return dayjs().format('YYYY-MM-DD');
};