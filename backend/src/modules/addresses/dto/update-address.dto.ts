// src/modules/addresses/dto/update-address.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';
import { IsUUID, IsOptional } from 'class-validator';

// Removemos userId do DTO de update, pois não se deve trocar o dono de um endereço
export class UpdateAddressDto extends PartialType(CreateAddressDto) {
  @IsUUID()
  @IsOptional()
  userId?: never; // Impede que o userId seja atualizado por este DTO
}
