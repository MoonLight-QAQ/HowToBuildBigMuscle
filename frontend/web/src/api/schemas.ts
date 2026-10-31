import { z } from 'zod'
import type {
  CityListData,
  DeliveryConfig,
  ErrorResponse,
  MallCategoryListData,
  ProductListData,
} from '@/types/api'

const identifierSchema = z.string().min(1)
const minorAmountSchema = z.number().int().nonnegative()
const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .nullable()
const timeSchema = z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/)

const productSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    categoryId: identifierSchema,
    categoryName: z.string().min(1),
    imageUrl: z.string().url().nullable(),
    priceMinor: z.number().int().positive(),
    currency: currencySchema,
    bookStock: z.number().int().nonnegative(),
    lockedStock: z.number().int().nonnegative(),
    availableStock: z.number().int().nonnegative(),
    status: z.enum(['on_sale', 'out_of_stock', 'off_shelf']),
  })
  .strict()

export const productListSchema: z.ZodType<ProductListData> = z
  .object({ items: z.array(productSchema), total: z.number().int().nonnegative() })
  .strict()

const mallCategorySchema = z.object({ id: identifierSchema, name: z.string().min(1) }).strict()

export const mallCategoryListSchema: z.ZodType<MallCategoryListData> = z
  .object({ items: z.array(mallCategorySchema), total: z.number().int().nonnegative() })
  .strict()

const citySchema = z
  .object({
    id: identifierSchema,
    nameZh: z.string().min(1),
    nameEn: z.string().min(1),
    fulfillment: z.enum(['local', 'post']),
  })
  .strict()

export const cityListSchema: z.ZodType<CityListData> = z
  .object({ items: z.array(citySchema), total: z.number().int().nonnegative() })
  .strict()

const deliveryAreaSchema = z
  .object({
    id: identifierSchema,
    cityId: identifierSchema,
    cityNameZh: z.string().min(1),
    name: z.string().min(1),
    enabled: z.boolean(),
  })
  .strict()

const deliveryTimeSlotSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    startTime: timeSchema,
    endTime: timeSchema,
    enabled: z.boolean(),
  })
  .strict()

export const deliverySchema: z.ZodType<DeliveryConfig | null> = z
  .object({
    localFeeMinor: minorAmountSchema,
    postFeeMinor: minorAmountSchema,
    freePostThresholdMinor: minorAmountSchema,
    currency: currencySchema,
    areas: z.array(deliveryAreaSchema),
    timeSlots: z.array(deliveryTimeSlotSchema),
  })
  .strict()
  .nullable()

export const errorResponseSchema: z.ZodType<ErrorResponse> = z
  .object({
    ok: z.literal(false),
    code: z.enum(['UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION_ERROR', 'CONFLICT', 'INTERNAL_ERROR']),
    message: z.string().min(1),
  })
  .strict()
