// src/modules/payments/dto/create-payment.dto.ts

import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;
}