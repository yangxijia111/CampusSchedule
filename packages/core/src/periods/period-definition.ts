import { z } from 'zod';

/**
 * 一节课的作息时间定义。
 *
 * 重要：core 不提供任何默认作息表。各学校节次时间差异很大，
 * 必须由学校 Adapter 从官方校历/作息表读取，或由用户手动配置；
 * 没有可靠数据时不得硬编码"常见大学时间"。
 */
export const periodDefinitionSchema = z
  .object({
    period: z.number().int().min(1).max(30),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间格式应为 HH:mm'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间格式应为 HH:mm'),
  })
  .strict();

export type PeriodDefinition = z.infer<typeof periodDefinitionSchema>;

/** 校验一组作息定义：时间格式合法、同节内开始早于结束、节次不重复。 */
export function validatePeriodDefinitions(
  definitions: PeriodDefinition[],
): { ok: true } | { ok: false; message: string } {
  const seen = new Set<number>();
  for (const def of definitions) {
    const check = periodDefinitionSchema.safeParse(def);
    if (!check.success) {
      return { ok: false, message: `第 ${def.period} 节定义不合法: ${check.error.message}` };
    }
    if (seen.has(def.period)) {
      return { ok: false, message: `第 ${def.period} 节定义重复` };
    }
    if (def.endTime <= def.startTime) {
      return { ok: false, message: `第 ${def.period} 节结束时间不晚于开始时间` };
    }
    seen.add(def.period);
  }
  return { ok: true };
}

/** 查询某节的作息定义。 */
export function findPeriodDefinition(
  definitions: PeriodDefinition[],
  period: number,
): PeriodDefinition | null {
  return definitions.find((def) => def.period === period) ?? null;
}
