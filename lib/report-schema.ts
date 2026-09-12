import { z } from "zod";

/*
  Жалоба на запись или комментарий: причина и словарь статусов.

  Лимит причины продублирован в UI (`maxLength` у textarea) и здесь — как
  `MAX_TRACKS_PER_POST` в post-schema: браузер обрезает по-человечески,
  но экшен это публичный POST и обязан проверить сам.
*/

export const REPORT_REASON_MAX = 300;

export const reportInputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Опиши, что не так")
    .max(REPORT_REASON_MAX, "Слишком длинное описание"),
});

export type ReportInput = z.input<typeof reportInputSchema>;

/*
  Статусы — строки, а не Prisma-enum (тот же довод, что у `User.role`:
  новый статус не должен становиться DDL-миграцией). Раз enum'а нет, база
  значение не стережёт — белый список здесь и есть единственная проверка:
  `resolveReport` берёт статус из FormData.

  `open` — не разобрана; `resolved` — «жалоба справедлива, но объект оставляю»
  (основной путь модерации — удалить объект, и жалоба уйдёт каскадом сама);
  `dismissed` — «посмотрел, всё нормально».
*/
export const REPORT_STATUS = {
  open: "open",
  resolved: "resolved",
  dismissed: "dismissed",
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && value in REPORT_STATUS;
}
