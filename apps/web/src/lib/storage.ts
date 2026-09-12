import { TimetableRepository } from '@campusschedule/storage';

/**
 * 浏览器端 IndexedDB 仓库（懒创建，避免测试环境触发数据库连接）。
 */
let repository: TimetableRepository | null = null;

export function getRepository(): TimetableRepository {
  if (!repository) {
    repository = new TimetableRepository();
  }
  return repository;
}

/** 学期作息时间的存储键。 */
export function periodTimesKey(semesterId: string): string {
  return 'periodTimes:' + semesterId;
}
